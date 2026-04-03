# 하네스 엔지니어링 GitHub 자료

> 작성자 : CodeVillains (brewnet.dev@gmail.com)
> Git : https://github.com/claude-code-expert 
> 홈서버 자동 구축 오픈소스 : https://github.com/claude-code-expert/brewnet 
> 서브에이전트로 간단하게 팀을 꾸려보자 : https://github.com/claude-code-expert/subagents 
---

# 하네스 엔지니어링 실전 튜토리얼
> 출처: [Anthropic Engineering — Harness design for long-running application development](https://www.anthropic.com/engineering/harness-design-long-running-apps) (2026.03.24)  
> 대상: Claude Code를 실무에 적용하는 개발자

---

## 이 튜토리얼이 답하는 질문

- "에이전트가 자꾸 이상한 코드를 만드는데 어떻게 막나?"
- "한 번 실행하면 끝까지 혼자 달리게 하려면 뭐가 필요한가?"
- "혼자 만드는 것보다 어떻게 확실히 더 좋은 결과를 얻나?"

---

## 핵심 개념: 왜 단일 에이전트는 한계에 부딪히는가

Anthropic 엔지니어링 팀이 실험을 통해 확인한 두 가지 근본적 실패 모드:

### 실패 모드 1: 컨텍스트 불안(Context Anxiety)
- 에이전트는 컨텍스트 창이 채워질수록 품질이 떨어진다
- 일부 모델은 컨텍스트 한계에 다가가면 **작업을 조기 마무리**하려 한다
- 결과: 기능이 stub 상태로 남거나, 핵심 로직이 빠진 채 완료 선언

### 실패 모드 2: 자기평가 불능(Self-Evaluation Blindspot)
- 에이전트에게 자기 작업을 평가하라고 하면 **자신의 결과물을 과하게 칭찬**한다
- "이 기능이 동작합니까?" → "네, 잘 동작합니다" (실제로는 broken)
- 특히 UI/디자인처럼 주관적 영역에서 더 심각하게 발생

이 두 문제를 동시에 해결하는 것이 **하네스 엔지니어링의 출발점**이다.

---

## 해결책: GAN에서 영감을 받은 멀티 에이전트 구조

Anthropic 팀은 [Generative Adversarial Networks](https://en.wikipedia.org/wiki/Generative_adversarial_network) 개념을 에이전트에 적용했다.

```
┌─────────────────────────────────────────────────────────────┐
│                     하네스 구조                              │
│                                                             │
│   [Planner]  →  [Generator]  ⇄  [Evaluator]               │
│      │               ↑               │                      │
│   스펙 작성      코드 생성          버그 발견                 │
│   범위 확정      기능 구현          품질 판정                 │
│                      └───(피드백)────┘                      │
└─────────────────────────────────────────────────────────────┘
```

---

## STEP 1: 가장 먼저 할 것 — 평가 기준 정의

**"좋은 결과"를 주관적으로 두면 에이전트도, 당신도 판단할 수 없다.**  
에이전트가 그레이딩할 수 있는 **구체적 기준**을 먼저 작성해야 한다.

### 프론트엔드 프로젝트용 4가지 기준 (Anthropic 제공)

| 기준 | 핵심 질문 | 중요도 |
|------|-----------|--------|
| **디자인 품질** | 색상·타이포·레이아웃이 하나의 일관된 분위기를 만드는가? | ★★★★★ |
| **독창성** | 라이브러리 기본값·AI 슬롭 패턴을 그대로 썼는가? 의도적 창의적 선택이 보이는가? | ★★★★★ |
| **크래프트** | 타이포그래피 계층, 간격 일관성, 색상 대비가 기본 이상인가? | ★★★ |
| **기능성** | 사용자가 UI를 이해하고 주요 액션을 완료할 수 있는가? | ★★★ |

> **왜 디자인·독창성을 더 높이 두는가?**  
> 에이전트는 크래프트·기능성은 기본적으로 잘 한다. 문제는 항상 "AI 티가 나는" 평범한 결과물에 있다. 기준 자체가 에이전트의 방향을 조정한다.

### brewnet 프로젝트 적용 예시

```markdown
## brewnet 품질 평가 기준

### 1. API 설계 일관성 (★★★★★)
- 엔드포인트 네이밍 컨벤션이 전체에서 일관적인가?
- RESTful 원칙을 따르는가? (GET/POST/PUT/DELETE 올바른 사용)
- 에러 응답 형식이 표준화되어 있는가?

### 2. 타입 안전성 (★★★★★)
- any 타입 사용이 없는가?
- 모든 함수에 명시적 반환 타입이 있는가?
- Prisma 모델과 DTO가 일치하는가?

### 3. 테스트 커버리지 (★★★)
- 핵심 비즈니스 로직(결제, 인증)에 단위 테스트가 있는가?
- 엣지 케이스(빈 값, 음수, 최대값)가 테스트되었는가?

### 4. 기능 완성도 (★★★)
- 스펙에 정의된 기능이 실제 동작하는가?
- "동작하는 척"이 아니라 end-to-end로 작동하는가?
```

---

## STEP 2: Evaluator 에이전트 만들기

평가 기준을 정의했으면, 이를 **독립 에이전트**에 탑재한다.

```yaml
# .claude/agents/evaluator.md
---
name: evaluator
description: >
  코드 리뷰 및 QA 전담 에이전트.
  Generator가 완성했다고 보고한 작업을 검증한다.
  절대로 관대하게 평가하지 않는다.
tools: Read, Bash, Glob, Grep
model: opus
---

당신은 까다로운 시니어 엔지니어이자 QA 엔지니어입니다.
Generator 에이전트가 제출한 결과물을 다음 기준으로 검토합니다.

## 평가 원칙
- Generator가 "완료했다"고 주장해도 **직접 실행해서 확인**하라
- 표면적 동작이 아니라 **실제 사용 시나리오**를 기준으로 판단하라
- 의심스러운 부분은 stub인지 아닌지 코드를 열어서 확인하라
- 관대하게 평가하는 것은 당신의 역할이 아니다

## 평가 항목 (각 항목에 PASS/FAIL과 구체적 근거 제시)

### 1. 기능 완성도
- [ ] 스펙의 각 기능이 실제로 동작하는가? (`npm test` 실행 후 확인)
- [ ] 에러 케이스를 처리하는가? (null, 빈 배열, 네트워크 오류)
- [ ] stub 함수나 TODO 주석이 남아있는가?

### 2. 타입 안전성  
- [ ] `grep -r "any" src/` 실행 — any 타입 사용 없는가?
- [ ] TypeScript 컴파일 에러가 없는가? (`npx tsc --noEmit`)

### 3. API 일관성
- [ ] 응답 형식이 일관적인가? (성공: {data}, 에러: {error, message})
- [ ] HTTP 상태 코드가 올바른가?

## 결과 보고 형식

```
## QA 보고서 — Sprint N

### 종합 판정: PASS / FAIL

### 항목별 결과
| 항목 | 결과 | 근거 |
|------|------|------|
| 기능 완성도 | FAIL | 결제 API가 항상 200을 반환, 실패 케이스 없음 |
| 타입 안전성 | PASS | any 없음, tsc 통과 |

### Generator에게 전달할 구체적 수정 지시
1. `src/payment/payment.service.ts:47` — 예외 처리 없음. try/catch 추가 필요
2. `src/auth/auth.controller.ts:23` — 반환 타입 누락
```
```

> **핵심 포인트:** Anthropic 팀은 처음에 Evaluator가 "버그를 발견하고도 별로 안 중요하다고 결론짓는" 현상을 겪었다.  
> **해결책**: 로그를 읽고, 당신의 판단과 다른 사례를 찾아서 프롬프트를 업데이트하는 **튜닝 루프**를 여러 번 돌려야 한다. 처음부터 완벽한 Evaluator는 없다.

---

## STEP 3: Sprint Contract — "완료" 기준을 먼저 협상

Generator에게 바로 코딩을 시키는 것이 아니라,  
**무엇을 어떻게 검증할지 먼저 문서로 합의**한다.

### Sprint Contract 템플릿

```markdown
# Sprint N Contract

## 이번 스프린트에서 구현할 것
- [ ] 기능 A: 구체적 설명
- [ ] 기능 B: 구체적 설명

## 완료 조건 (Evaluator가 이 기준으로 PASS/FAIL 판정)
1. `POST /api/users` 호출 시 DB에 레코드가 생성된다
2. 중복 이메일 요청 시 409 응답이 반환된다
3. `npm test`가 0 failures로 통과한다
4. TypeScript 컴파일 에러가 없다

## 범위 외 (이번 스프린트에서 하지 않을 것)
- 이메일 인증 기능 (Sprint 3에서 다룸)
- 관리자 권한 (Sprint 5에서 다룸)
```

### 실제 흐름

```
Generator: "Sprint 2에서 유저 인증 API를 구현하겠습니다.
           완료 조건은 로그인/로그아웃 API가 동작하고,
           JWT 토큰이 발급되는 것입니다."

Evaluator: "동의합니다. 단, 다음 추가 조건도 포함해야 합니다:
           - 만료된 토큰으로 요청 시 401 반환
           - Refresh token 기능 포함
           이 조건들이 빠져 있으면 FAIL 처리합니다."

Generator: "동의합니다. 시작합니다."
→ 코딩 시작
```

> **왜 이게 중요한가?**  
> 스펙이 고수준일수록 Generator는 "그럴듯하게 보이는 것"을 만들고 완료 선언을 한다.  
> Contract가 있으면 Evaluator가 **정확히 어디를 테스트해야 하는지** 알고, Generator도 **뭘 만들어야 하는지** 명확하다.

---

## STEP 4: 전체 하네스 실행 — 3단계 구조

### 구조도

```
사용자 프롬프트 (1~4문장)
       ↓
┌──────────────┐
│   PLANNER    │  → 상세 스펙 파일 (product-spec.md) 작성
│              │  → 스프린트 목록 정의
│              │  → AI 기능 통합 기회 식별
└──────┬───────┘
       ↓
┌──────────────┐   ┌──────────────┐
│  GENERATOR   │ ⇄ │  EVALUATOR   │
│              │   │              │
│ Sprint 계약  │   │ Sprint 계약  │
│ 협상 후 구현 │   │ 검증 후 판정 │
│              │   │              │
│ 결과: 코드   │   │ 결과: 보고서 │
└──────┬───────┘   └──────────────┘
       ↓ (FAIL 시 피드백 반영 후 재시도)
       ↓ (PASS 시 다음 Sprint)
┌──────────────┐
│  완성된 앱   │
└──────────────┘
```

### Planner 에이전트

```yaml
# .claude/agents/planner.md
---
name: planner
description: 짧은 프롬프트를 상세 스펙으로 확장하는 에이전트
tools: Read, Write
model: opus
---

당신은 시니어 프로덕트 매니저이자 기술 아키텍트입니다.

## 역할
- 사용자의 1~4문장 프롬프트를 완전한 제품 스펙으로 확장한다
- 스펙은 야심차게 작성하되, 구현 세부사항은 Generator에게 맡긴다
- AI 기능을 자연스럽게 통합할 수 있는 기회를 찾아 스펙에 포함한다

## 스펙 작성 원칙
- "무엇을 만들 것인가"에 집중, "어떻게 만들 것인가"는 최소화
- 사용자 스토리 중심으로 작성 ("사용자는 X를 할 수 있다")
- 스프린트 단위로 분해 (각 스프린트는 3~5개의 연관된 기능)
- 잘못된 기술 세부사항이 들어가면 하위 에이전트에게 캐스케이드되므로
  고수준 기술 방향만 제시한다

## 출력 파일
`product-spec.md` — 다음 구조로 작성:
- 프로젝트 개요 및 비전
- 타겟 사용자
- 핵심 기능 목록 (우선순위 포함)
- 스프린트 계획 (N개의 스프린트)
- 기술 스택 제안
- AI 통합 기회
```

---

## STEP 5: 하네스 간소화 — 무엇을 빼도 되는가

Anthropic 팀이 강조한 원칙:

> **"하네스의 모든 컴포넌트는 '모델이 혼자 못 하는 것'에 대한 가정을 인코딩한다. 그 가정은 항상 검증해야 한다."**

### 간소화 판단 기준

| 제거 대상 | 제거해도 되는 경우 | 유지해야 하는 경우 |
|-----------|-------------------|-------------------|
| **Sprint 구조** | 모델이 긴 작업을 일관성 있게 완주할 때 | Context Anxiety가 발생할 때 |
| **Context Reset** | Compaction으로 충분할 때 | Compaction 후에도 조기 완료 선언할 때 |
| **Evaluator** | 태스크가 모델의 능력 범위 안에 있을 때 | 복잡하거나 주관적 품질이 중요할 때 |
| **Planner** | 사용자가 이미 상세 스펙을 제공할 때 | 짧은 프롬프트에서 스코프가 중요할 때 |

### 간소화 방법: 한 번에 하나씩

```
❌ 잘못된 방법: 전체 구조를 한꺼번에 제거 후 재설계
✅ 올바른 방법: 컴포넌트 하나 제거 → 결과 비교 → 판단 → 반복
```

Anthropic 팀이 "급진적으로 줄였다가 성능 복원이 안 됐다"고 직접 인정한 실수다.

---

## STEP 6: Evaluator 튜닝 루프

가장 시간이 많이 걸리지만 가장 중요한 작업.

### 튜닝 프로세스

```
1. 에이전트 실행
       ↓
2. Evaluator 로그 읽기
       ↓
3. "내 판단과 다른 사례" 찾기
   예: Evaluator가 PASS했는데 실제론 broken
   예: Evaluator가 사소한 것에 FAIL해서 재작업 낭비
       ↓
4. 해당 케이스를 Evaluator 프롬프트에 few-shot으로 추가
       ↓
5. 다시 실행 → 1번으로 돌아가기
```

### Few-shot 예시 추가 방법

```markdown
## 판단 사례 (few-shot)

### FAIL 사례 — 올바른 판정
상황: Generator가 "결제 API 완료"라고 보고했으나
      코드를 보니 `// TODO: 실제 결제 처리` 주석이 있음
판정: FAIL — stub 함수는 완료가 아님

### PASS 사례 — 올바른 판정
상황: 버튼 hover 색상이 디자인 스펙과 #3px 차이남
판정: PASS — 핵심 기능에 영향 없는 미세한 차이는 통과

### FAIL 사례 — 잘못된 판정 (이렇게 하지 말 것)
상황: 로그인 API가 항상 200을 반환 (에러 케이스 없음)
잘못된 판정: "전반적으로 잘 작동함 — PASS"
올바른 판정: FAIL — 명확한 기능 결함
```

---

## STEP 7: brewnet에 즉시 적용하는 시작점

### Day 1: 평가 기준 작성 (30분)

`harness/evaluation-criteria.md` 파일을 만들어 팀의 "좋은 코드" 기준을 정의한다.

```markdown
# brewnet 하네스 평가 기준

## API 완성도 (MUST PASS)
- [ ] 엔드포인트가 실제 DB와 연결되어 있는가?
- [ ] 성공/실패 응답 형식이 일관적인가?
- [ ] `npm test` 통과하는가?

## 타입 안전성 (MUST PASS)
- [ ] `npx tsc --noEmit` 에러 없는가?
- [ ] any 타입 0개인가? (`grep -r ": any" src/ | wc -l`)

## 보안 기본 (MUST PASS)
- [ ] JWT 검증이 있는가?
- [ ] 환경변수에 시크릿이 있는가? (하드코딩 없는가?)

## 코드 품질 (SHOULD PASS)
- [ ] 함수 50줄 이하인가?
- [ ] 비즈니스 로직이 컨트롤러에서 분리되어 있는가?
```

### Day 2: Evaluator 에이전트 추가 (1시간)

위 기준을 토대로 `.claude/agents/evaluator.md` 작성 후 테스트.  
작은 기능 하나에 적용해서 Evaluator가 제대로 작동하는지 확인.

### Day 3~: 튜닝 루프 시작

Evaluator 로그를 읽으면서 판단이 잘못된 사례를 수집.  
각 사례를 프롬프트에 추가. 반복.

---

## 비용 vs 품질 트레이드오프

Anthropic 팀의 실험 결과:

| 접근 방식 | 시간 | 비용 | 품질 |
|-----------|------|------|------|
| 단일 에이전트 (Solo) | 20분 | $9 | 핵심 기능 broken |
| 3-에이전트 풀 하네스 | 6시간 | $200 | 실제 동작하는 앱 |
| 간소화 하네스 (Opus 4.6) | 4시간 | $124 | 품질 유지, 비용 절감 |

**판단 기준:** 태스크의 중요도와 복잡도에 따라 하네스 수준을 조정한다.  
단순한 CRUD API → Evaluator 없이 Generator + verify 스크립트로 충분.  
복잡한 멀티 기능 앱 → 풀 3-에이전트 구조 적용.

---

## 핵심 원칙 요약

1. **기준을 먼저 정의하라** — "좋은 결과"를 주관적으로 두지 않는다
2. **Generator와 Evaluator를 분리하라** — 자기 작업을 자기가 평가하게 하지 않는다
3. **Sprint Contract로 "완료"를 합의하라** — 코딩 전에 검증 기준을 협상한다
4. **Evaluator를 튜닝하라** — 처음부터 완벽한 Evaluator는 없다
5. **한 번에 하나씩 간소화하라** — 급진적 제거는 어디서 망가지는지 알 수 없다
6. **모델이 바뀌면 하네스를 재검토하라** — 모델 능력이 올라가면 불필요한 컴포넌트가 생긴다

---

## 참고 자료

| 자료 | URL |
|------|-----|
| 원본 아티클 | https://www.anthropic.com/engineering/harness-design-long-running-apps |
| 장기 에이전트 하네스 이전 버전 | https://www.anthropic.com/engineering/effective-harnesses-for-long-running-agents |
| Building Effective Agents | https://www.anthropic.com/research/building-effective-agents |
| Context Engineering | https://www.anthropic.com/engineering/effective-context-engineering-for-ai-agents |
| Frontend Design Skill (GitHub) | https://github.com/anthropics/claude-code/blob/main/plugins/frontend-design/skills/frontend-design/SKILL.md |
| Claude Agent SDK | https://platform.claude.com/docs/en/agent-sdk/overview |
