# Squad Agent

**Claude Code sub-agent system with 8 specialized agents for automated development workflows.**

Claude Code 서브에이전트 시스템 — 리뷰, 기획, 리팩토링, QA, 디버깅, 문서, GitOps, 보안 감사를 전문 에이전트에 위임합니다.

![Squad Pipeline](docs/pipeline-diagram.svg)

---

## Quick Start / 빠른 시작

### Option 1: One-line Install (curl)

```bash
curl -sL https://raw.githubusercontent.com/claude-code-expert/subagents/main/install.sh | bash
```

### Option 2: Clone & Install

```bash
git clone https://github.com/claude-code-expert/subagents.git
cd subagents
bash install.sh
```

### Option 3: Download Release

[Releases](https://github.com/claude-code-expert/subagents/releases) 페이지에서 최신 `squad-agents-vX.Y.Z.tar.gz`를 다운로드하세요.

```bash
tar xzf squad-agents-v*.tar.gz
bash install.sh
```

### After Install / 설치 후

1. **Restart Claude Code** / Claude Code를 재시작합니다
2. Run `/agents` to verify / `/agents`로 등록을 확인합니다
3. Try `/squad-review` to start / `/squad-review`로 시작해보세요

---

## How Subagents Work / 서브에이전트 동작 원리

### What is a Subagent? / 서브에이전트란?

서브에이전트는 메인 Claude Code 세션 안에서 **독립된 컨텍스트 윈도우**를 갖고 동작하는 전문화된 AI 인스턴스입니다. 일반 대화에서 "코드 리뷰해줘"라고 하면 모든 분석 과정이 하나의 컨텍스트에 쌓이지만, 서브에이전트에 위임하면 분석은 별도 윈도우에서 일어나고 메인에는 요약만 돌아옵니다.

A subagent is a specialized AI instance running inside your main Claude Code session with its **own independent context window**. When you ask "review this code" in a normal chat, all analysis fills your main context. With a subagent, heavy analysis happens in a separate window — only the summary returns.

### Internal Mechanism / 내부 동작

서브에이전트는 Claude Code의 **Task 도구**를 통해 호출됩니다. `bash`로 `claude -p`를 실행하는 것이 아닙니다.

Subagents are invoked via Claude Code's built-in **Task tool** — not by running `claude -p` in bash.

```
1. User: "/squad-review src/auth/"

2. Main session → Task(subagent_type="squad-review", prompt="...")
   Delegates via Task tool

3. New context window created:
   - System prompt from squad-review.md loaded
   - Only tools listed in frontmatter available
   - Model specified in frontmatter used

4. Subagent works in its own context:
   - git diff, file reads, analysis — all stay in subagent context
   - Main session context does NOT grow

5. Result returned:
   - Only the final message returns to main session
   - Subagent context is discarded
```

### Honest Token Economics / 솔직한 토큰 비용 구조

> **"서브에이전트가 토큰을 절약한다"는 흔한 오해입니다. 실제로는 더 씁니다.**
>
> **"Subagents save tokens" is a common misconception. They actually use MORE.**

서브에이전트의 가치는 토큰 절약이 아니라 **메인 컨텍스트 품질 유지**입니다.

The value of subagents is not token savings — it's **main context quality preservation**.

#### Example: Code review on 20 changed files / 예시: 20개 파일 변경 리뷰

**Inline (no subagent):**

```
Main context: 24k (conversation) + 30k (git diff) + 16k (file reads) + 15k (analysis) = 85k
Remaining for coding: 115k / 200k
Total tokens consumed: ~85k
```

**With squad-review subagent:**

```
Main context:     24k (conversation) + 2k (returned summary) = 26k
Subagent context: 4k (system) + 30k (diff) + 16k (reads) + 15k (analysis) + 4k (overhead) = 69k (discarded)
Remaining for coding: 174k / 200k
Total tokens consumed: ~95k (MORE than inline)
```

| Metric / 지표 | Inline | Subagent |
|----------------|--------|----------|
| Main context used / 메인 컨텍스트 사용 | 85k | 26k |
| Total tokens consumed / 총 토큰 소비 | 85k | **95k (+12%)** |
| Remaining workspace / 작업 가능 공간 | 115k | **174k (+51%)** |
| Session quality over time / 세션 후반 품질 | Degrades (context rot) | **Maintained** |

#### Parallel execution cost / 병렬 실행 비용

Anthropic 문서에 따르면 멀티 에이전트 워크플로우는 단일 에이전트 대비 **4~7배의 토큰**을 소비합니다. 실측 보고에 따르면 Pro plan에서 5개 병렬 서브에이전트를 실행하면 15분 만에 사용량 한도에 도달합니다 (순차 처리 시 30분).

Per Anthropic docs, multi-agent workflows use roughly **4-7x more tokens** than single-agent sessions. Real-world reports: 5 parallel subagents on Pro plan exhausted limits in 15 minutes (vs 30 minutes sequential).

#### When subagents are worth it / 가치 있는 경우

| Worth it / 가치 있음 | Not worth it / 비효율적 |
|---|---|
| Verbose output (large diffs, logs) | Simple single-file lookups |
| Long sessions (context rot prevention) | Short sessions |
| Read-heavy research & exploration | Holistic codebase reasoning |
| Parallel independent analyses | Sequential dependent steps |
| Enforcing tool restrictions (Read-only) | Tasks needing all tools |

> **Bottom line:** Subagents are a **context hygiene tool**, not a token savings tool. They keep your main session clean so quality doesn't degrade. You pay more tokens total, but you get a better workspace.
>
> **결론:** 서브에이전트는 **컨텍스트 위생 도구**입니다. 총 토큰은 더 쓰지만, 메인 세션이 깨끗하게 유지되어 세션 후반부 품질 저하를 방지합니다.

### Why Use Subagents? / 쓰는 이유

1. **Context isolation** — 30k git diff가 서브에이전트에만 남고, 메인에는 요약 2k만 반환
2. **Tool scoping** — squad-review는 Read-only. 도구 레벨 하드 제약 (프롬프트가 아님)
3. **Parallel execution** — 여러 모듈을 동시에 분석
4. **Model routing** — 보안은 opus, 커밋 메시지는 haiku로 비용 최적화

### Agent Definition Format / 에이전트 정의

```markdown
---
name: squad-review                    # Agent ID
description: >                        # Auto-delegation trigger
  Use PROACTIVELY after code changes.
tools: Read, Grep, Glob, Bash         # Allowed tools (hard constraint)
model: opus                           # Model
maxTurns: 15                          # Safety limit
---
You are a senior staff engineer...    # System prompt
```

### Subagent vs Agent Teams

| | Subagent | Agent Teams |
|---|---|---|
| Scope | Single session | Separate sessions |
| Context | Own window, returns summary | Fully independent (worktree) |
| Communication | Task tool | Filesystem & Git |
| Best for | Review, analysis, short tasks | Long-running parallel dev |

---

## Verify It Works / 동작 검증

### Quick check / 빠른 확인

```bash
claude agents          # Should list squad-review, squad-plan, etc.
```

### Definitive test / 확실한 검증

`squad-review`에게 파일 수정을 요청하세요. **거부하면** tools에 Write가 없어서 서브에이전트로 실행된 것. 수정하면 인라인 처리된 것.

Ask `squad-review` to modify a file. If it **refuses** (no Write tool), it's running as a subagent. If it modifies, it's inline.

### Runtime signals / 실행 시 신호

| Signal | Subagent | Inline |
|---|---|---|
| Agent tool in terminal | Visible | Not shown |
| Ctrl+T task list | Shows agent name | Empty |
| SubagentStop hook fires | Yes (banner appears) | No |
| Main context growth | Minimal (+2k summary) | Large (+60k diff+analysis) |
| `claude --debug "api"` | Task() call in logs | No Task() call |

---

## Agents / 에이전트

| Agent | Role / 역할 | Model | Tools |
|-------|-------------|-------|-------|
| `squad-review` | Code review / 코드 리뷰 | opus | Read-only |
| `squad-plan` | Planning & wireframes / 기획 | opus | Read+Write |
| `squad-refactor` | Refactoring / 리팩토링 | opus | Read+Write |
| `squad-qa` | Testing & QA / 테스트 | sonnet | Read+Bash |
| `squad-debug` | Debugging / 디버깅 | opus | Read+Bash |
| `squad-docs` | Documentation / 문서 작성 | sonnet | Read+Write |
| `squad-gitops` | Git automation / Git 자동화 | haiku | Read+Bash |
| `squad-audit` | Security audit / 보안 감사 | opus | Read-only |

### Design Principles / 설계 원칙

| Principle / 원칙 | Description / 설명 |
|---|---|
| Least privilege / 최소 권한 | squad-review = Read-only, squad-refactor = Write, squad-qa = Bash |
| Cost routing / 비용 라우팅 | opus for analysis, sonnet for execution, haiku for patterns |
| Safety checkpoint / 안전 | squad-refactor auto-creates `git stash` before modifications |
| Namespace isolation / 네임스페이스 | `squad-` prefix prevents collision with plugins |
| Context hygiene / 컨텍스트 위생 | Heavy analysis in subagent, only summaries return to main |

---

## Pipeline / 파이프라인

```
squad-plan → [implement] → squad-review → squad-qa → squad-gitops
                               │    ▲
                               │    │
                               ▼    │
                          squad-refactor
                           (if changes requested)
```

On-demand: `squad-debug`, `squad-audit`, `squad-docs`

### Monitor Hook / 모니터 훅

`~/.claude/settings.json`에 추가하면 서브에이전트 시작/종료 배너가 콘솔에 출력됩니다:

```jsonc
{
  "hooks": {
    "SubagentStart": [
      { "matcher": "", "hooks": [{ "type": "command", "command": "zsh ~/.claude/hooks/squad-monitor.sh" }] }
    ],
    "SubagentStop": [
      { "matcher": "", "hooks": [{ "type": "command", "command": "zsh ~/.claude/hooks/squad-monitor.sh" }] }
    ]
  }
}
```

---

## Commands / 커맨드

| Command | Example / 예시 |
|---------|----------------|
| `/squad-review` | `/squad-review src/auth/` |
| `/squad-plan` | `/squad-plan payment system` |
| `/squad-refactor` | `/squad-refactor src/utils/` |
| `/squad-qa` | `/squad-qa` |
| `/squad-debug` | `/squad-debug TypeError: Cannot read...` |
| `/squad-docs` | `/squad-docs readme` |
| `/squad-gitops` | `/squad-gitops pr` |
| `/squad-audit` | `/squad-audit` |
| `/squad` | `/squad review src/auth/` (universal) |

---

## Usage Examples / 사용 예시

### New Feature / 새 기능

```
/squad-plan user profile editing       → Planning
[implement]
/squad-review                          → REQUEST_CHANGES
/squad-refactor src/profile/           → Refactor
/squad-review                          → APPROVE
/squad-qa                              → PASS
/squad-audit src/auth/                 → Security check
/squad-gitops pr                       → Create PR
```

### Production Bug / 프로덕션 버그

```
/squad-debug "TypeError: Cannot read properties of undefined"
[fix] → /squad-qa → /squad-gitops commit
```

### Legacy Cleanup / 레거시 정리

```
/squad-review src/legacy/              → Identify issues
/squad-refactor src/legacy/utils/      → Refactor
/squad-qa                              → Regression test
/squad-docs readme                     → Update docs
```

---

## Model Routing / 모델 라우팅

| Agent | Model | Why / 이유 |
|-------|-------|------------|
| squad-review | opus | Security & logic = deep reasoning |
| squad-plan | opus | Architecture & edge cases |
| squad-refactor | opus | Safe structural transformation |
| squad-qa | sonnet | Test execution & formatting |
| squad-debug | opus | Root cause analysis |
| squad-docs | sonnet | Code-to-documentation |
| squad-gitops | haiku | Pattern work, cost-optimized |
| squad-audit | opus | Security — can't miss |

Override: `export CLAUDE_CODE_SUBAGENT_MODEL=sonnet`

---

## Frontmatter Reference

| Field | Required | Default | Description |
|------|------|--------|------|
| `name` | ✅ | — | Agent ID |
| `description` | ✅ | — | Auto-delegation trigger. `PROACTIVELY` = auto-invoke |
| `tools` | ❌ | (inherit) | Comma-separated. `Task(name)` supported |
| `model` | ❌ | `inherit` | haiku / sonnet / opus / inherit |
| `maxTurns` | ❌ | — | Max turns |
| `permissionMode` | ❌ | — | plan / acceptEdits / bypassPermissions |
| `memory` | ❌ | — | user / project / local |
| `hooks` | ❌ | — | Agent-scoped lifecycle hooks |
| `isolation` | ❌ | — | `worktree` for Git worktree isolation |

---

## Project Override / 프로젝트 오버라이드

`.claude/agents/squad-review.md` in your project overrides `~/.claude/agents/`:

```markdown
---
name: squad-review
description: Expert code review for MyProject.
tools: Read, Grep, Glob, Bash
model: opus
---
## MyProject Rules
- TypeScript `any` PROHIBITED
...
```

---

## Uninstall / 제거

```bash
bash install.sh --uninstall
```

---

## Architecture / 아키텍처

See [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md).

## Contributing / 기여

See [CONTRIBUTING.md](CONTRIBUTING.md).

## License

[Apache License 2.0](LICENSE)

---

## References

- [Claude Code Sub-agents (Official)](https://code.claude.com/docs/en/sub-agents)
- [Claude Code Hooks Reference](https://code.claude.com/docs/en/hooks)
- [Claude Agent SDK — Subagents](https://platform.claude.com/docs/en/agent-sdk/subagents)
- [Context Windows (Official)](https://platform.claude.com/docs/en/build-with-claude/context-windows)
- [shanraisshan/claude-code-best-practice](https://github.com/shanraisshan/claude-code-best-practice)
- [VoltAgent/awesome-claude-code-subagents](https://github.com/VoltAgent/awesome-claude-code-subagents)
