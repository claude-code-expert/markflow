# 하네스 엔지니어링 GitHub 자료 큐레이션
> 기준: ⭐ Stars / 🍴 Forks 높은 순 정렬  
> 조회 기준일: 2026년 4월 2일  
> ⚠️ Star 수는 빠르게 변동하므로 링크에서 최신값 확인 권장
> 작성자 : CodeVillains (brewnet.dev@gmail.com)
> Git : https://github.com/claude-code-expert 
> 홈서버 자동 구축 오픈소스 : https://github.com/claude-code-expert/brewnet 
> 서브에이전트로 간단하게 팀을 꾸려보자 : https://github.com/claude-code-expert/subagents 
---

## ✅ Star 수 확인 완료 (상위 4개)

---

### 🥇 1위 — Everything Claude Code (ECC)

**🔗 https://github.com/affaan-m/everything-claude-code**  
⭐ **118K+** | 🍴 **10,700+** | JS | MIT | Anthropic 해커톤 우승

#### 한 줄 요약
10개월 실전 사용 끝에 오픈소스화한 종합 하네스 패키지.  
Claude Code 생태계에서 가장 많은 Star를 보유한 레포.

#### 구성 (v1.8.0)
| 컴포넌트 | 수량 |
|----------|------|
| Subagents | 28개 |
| Skills | 119개 |
| Slash Commands | 60개 |
| Hooks | 20개+ |
| Rules | 34개 |
| Tests | 997개 |

#### 핵심: 4-레이어 아키텍처
```
Layer 1: Interaction  → 슬래시 커맨드 진입점
Layer 2: Intelligence → 전문 서브에이전트
Layer 3: Automation   → 훅 기반 자동 품질 관리
Layer 4: Learning     → 성공 패턴 → instinct 자동 변환
```

#### AgentShield — 하네스 보안 스캐너
```bash
npx ecc-agentshield scan           # 빠른 스캔
npx ecc-agentshield scan --fix     # 안전한 이슈 자동 수정
npx ecc-agentshield scan --opus --stream  # Opus 3-에이전트 Red-team 심층 분석
```

#### 설치
```bash
/plugin marketplace add affaan-m/everything-claude-code
/plugin install everything-claude-code@everything-claude-code
# 권장: 전체 설치 대신 plan + tdd + code-review 3개부터 시작
```

---

### 🥈 2위 — GSD: Get Shit Done (TÂCHES)

**🔗 https://github.com/gsd-build/get-shit-done**  
⭐ **45K+** | JS | MIT

#### 한 줄 요약
"Context Rot(컨텍스트 부패)"을 막는 경량 스펙 주도 개발 시스템.  
Amazon, Google, Shopify, Webflow 엔지니어 실무 사용 보고.

#### 핵심 개념
```
Context Rot: 컨텍스트 창이 차면 Claude 출력 품질이 저하됨
GSD 해법:
  1. 상태를 파일로 외부화 → 세션 독립성 확보
  2. 작업을 small plan으로 분해
  3. 각 플랜을 fresh context에서 실행
  4. 명시적 완료 기준으로 검증
```

#### 워크플로우
```bash
/gsd:new-project    # 아이디어 → 상세 스펙
/gsd:create-roadmap # 마일스톤 로드맵 생성
/gsd:plan-phase     # XML 최적화 플랜 생성
/gsd:execute-plan   # 원자적 커밋 단위 구현
/gsd:quick "태스크" # 소규모 빠른 실행
```

#### 설치
```bash
npx get-shit-done-cc --global  # 전체 프로젝트
npx get-shit-done-cc --local   # 현재 프로젝트만
```

---

### 🥉 3위 — awesome-claude-code (hesreallyhim)

**🔗 https://github.com/hesreallyhim/awesome-claude-code**  
⭐ **35K+** | 🍴 **2,700+** | CC BY-NC-ND 4.0

#### 한 줄 요약
Claude Code 생태계 전체를 큐레이션한 Awesome 리스트.  
하네스 엔지니어링 자료 탐색의 **출발점**으로 가장 적합.  
PR은 Claude 만 올릴 수 있다는 독특한 정책.

#### 카테고리 구성
```
Workflows   → 완성형 프로젝트 워크플로우
Skills      → 재사용 컨텍스트 모듈
Hooks       → 자동화 이벤트 핸들러
Agents      → 서브에이전트 정의
Commands    → 슬래시 커맨드
Plugins     → 마켓플레이스 플러그인
CLAUDE.md   → 실제 프로젝트 예시 컬렉션
```

#### 주목할 항목
- **Ralph Wiggum Method**: 완료 조건 충족까지 에이전트 자율 루프 실행
- **shareAI-lab/learn-claude-code**: 하단 미확인 섹션 A 참고

---

### 4위 — claude-code-best-practice (shanraisshan)

**🔗 https://github.com/shanraisshan/claude-code-best-practice**  
⭐ **26K+** | 🍴 **2,200+** | Markdown

#### 한 줄 요약
실전 베스트 프랙티스를 원자적 팁 단위로 정리한 레퍼런스.  
`🚫👶` 표시 = 초보자 함정 경고. Claude Code 창시자 Boris Cherny의 팁 포함.

#### 핵심 팁 발췌

**CLAUDE.md**
```markdown
- 파일당 200줄 이하 유지
- 도메인 특화 규칙은 <important if="..."> 태그로 래핑
- 모노레포는 상위+하위 CLAUDE.md 계층 구조
- 결정론적 동작은 settings.json에 (CLAUDE.md 아님)
```

**서브에이전트**
```markdown
- 범용 에이전트 대신 기능별 특화 서브에이전트
- tmux + git worktrees: 병렬 에이전트 팀 개발
- "use subagents" → 컴퓨팅 추가 투입 효과
- 버그 생성 에이전트 / 버그 발견 에이전트 분리 → 서로 검증
```

**훅**
```markdown
- PostToolUse: 코드 자동 포맷 (Claude 생성 → 훅이 마지막 10%)
- Stop: 세션 종료 시 작업 검증 or 계속 진행 넛지
- PreToolUse: Opus로 권한 요청 라우팅 → 공격 탐지 + 안전한 것 자동 승인
- SKILL.md 안에 !`command` 임베드: 호출 시점 동적 셸 출력 삽입
```

---


### A — learn-claude-code (shareAI-lab)

**🔗 https://github.com/shareAI-lab/learn-claude-code**  
⭐ 46.7K | Python | 12세션 교육 커리큘럼

Claude Code 아키텍처를 역공학으로 분해한 교육용 하네스 입문서.  
s01~s12 세션으로 하네스 각 컴포넌트를 직접 구현하면서 학습.

```bash
git clone https://github.com/shareAI-lab/learn-claude-code
pip install -r requirements.txt && cp .env.example .env
python agents/s01_agent_loop.py   # 시작점
python agents/s_full.py           # 종합 캡스톤
```

---

### B — claude-code-harness (Chachamaru127)

**🔗 https://github.com/Chachamaru127/claude-code-harness**  
⭐ 400 | TypeScript | 플러그인 마켓플레이스 등록

Plan → Work → Review 자율 사이클 단일 커맨드 실행.  
TypeScript 가드레일 엔진 (R01~R13) 으로 런타임 위험 동작 차단.

```bash
/plugin marketplace add Chachamaru127/claude-code-harness
/plugin install claude-code-harness@claude-code-harness-marketplace
/harness-setup → /harness-plan → /harness-work breezing all
```

---

### C — revfactory/harness

**🔗 https://github.com/revfactory/harness**  
⭐ 1.5K | Claude Code 플러그인

"build a harness for this project" 한 마디로 에이전트 팀 + 스킬 자동 생성.  
6가지 팀 아키텍처 패턴 (Pipeline / Fan-out / Expert Pool / Producer-Review / Supervisor / Hierarchical).

연계 실험 (`revfactory/claude-code-harness`):
```
Basic 태스크:    +23.8점 향상
Advanced 태스크: +29.6점 향상
Expert 태스크:   +36.2점 향상  ← 복잡할수록 효과 큼
```

---

### D — HKUDS/OpenHarness

**🔗 https://github.com/HKUDS/OpenHarness**  
⭐ 127 (2026.04.01 출시) | Python

Claude Code 아키텍처 순수 Python 재구현. 코드량 3%로 핵심 기능 98% 구현.  
연구/학습 목적 최적.

```bash
git clone https://github.com/HKUDS/OpenHarness.git && cd OpenHarness
uv sync --extra dev && oh
```

---

## 전체 요약표

| 순위 | 레포 | ⭐ Stars | 🍴 Forks | 목적 | 입문 추천 |
|------|------|---------|---------|------|----------|
| 1 | affaan-m/everything-claude-code | **118k** | 10.7k | 종합 하네스 생태계 | 중급 이후 |
| 2 | gsd-build/get-shit-done | **45k** | - | Context Rot 방지 | ✅ 처음부터 |
| 3 | hesreallyhim/awesome-claude-code | **35.5k** | 2.7k | 생태계 탐색 허브 | ✅ 처음부터 |
| 4 | shanraisshan/claude-code-best-practice | **26.5k** | 2.2k | 실전 팁 레퍼런스 | ✅ 처음부터 |
| A | shareAI-lab/learn-claude-code | 46K | - | 하네스 원리 학습 | ✅ 처음부터 |
| B | Chachamaru127/claude-code-harness | 400 | - | Plan→Work→Review | 중급 |
| C | revfactory/harness | 1.5K | - | 에이전트 팀 자동 생성 | 중급 |
| D | HKUDS/OpenHarness | 127 | - | 아키텍처 연구 | 심화 |

---

## 보는 순서 연계

```
처음 시작 (입문)
  → 3위 awesome-claude-code  (생태계 전체 파악)
  → 4위 claude-code-best-practice  (즉시 쓸 수 있는 팁)

하네스 이해 (기초)
  → A. learn-claude-code  (s01~s06: 원리 직접 구현)
  → 2위 GSD  (context rot 해결 실습)

실전 적용 (중급)
  → B. claude-code-harness  (Plan→Work→Review 자동화)
  → C. revfactory/harness  (팀 아키텍처 6종)

생태계 확장 (고급)
  → 1위 everything-claude-code  (모듈 선택 설치, 전체 생태계)
```
