# API & Data Model Requirements Quality Checklist: Prototype-Based Feature Completion

**Purpose**: API 계약과 데이터 모델 요구사항의 완전성, 명확성, 일관성을 PR 리뷰 시점에서 검증
**Created**: 2026-03-27
**Feature**: [spec.md](../spec.md) | [contracts/api-contracts.md](../contracts/api-contracts.md) | [data-model.md](../data-model.md)

## Requirement Completeness

- [ ] CHK001 Are error response formats specified for all 6 new API endpoints? (Only PATCH /theme defines 400 response) [Gap, Contracts §1-3]
- [ ] CHK002 Are pagination defaults and maximum limits defined for `GET /workspaces/public`? (page/limit present, but max limit not capped) [Completeness, Contracts §1]
- [ ] CHK003 Are 404 response requirements specified when accessing non-existent workspace themes or embed tokens? [Gap, Contracts §2-3]
- [ ] CHK004 Is the `allowedDocIds` attribute mentioned in the spec's Guest Token entity defined in the data model schema or explicitly deferred? [Gap, Spec §Key Entities vs Data Model §1]
- [ ] CHK005 Are DOWN migration requirements specified for all 3 migrations with exact rollback SQL? [Completeness, Data Model §Migration Plan]
- [ ] CHK006 Are workspace export requirements for the new `themePreset`/`themeCss` columns defined? (e.g., should workspace export include theme data?) [Gap]
- [ ] CHK007 Is the token prefix format (`mf_gt_`) specified with exact length and character set? [Completeness, Contracts §3]
- [ ] CHK008 Are batch operations (approve/reject multiple join requests) documented in the API contracts? (Existing API has batch endpoint but contracts don't reference it) [Gap, Contracts §Existing]

## Requirement Clarity

- [ ] CHK009 Is "CSS variable editor restricted to `--mf-*` prefix" quantified with an exhaustive allowlist or a pattern rule? [Clarity, Spec §FR-016]
- [ ] CHK010 Is "validate CSS syntax" defined with specific validation criteria? (e.g., parse-only vs. value range checking vs. property name matching) [Clarity, Spec §FR-017]
- [ ] CHK011 Is the `scope` enum for embed tokens specified consistently? (Data model uses 'read_write' with underscore, Contracts use 'read' — is 'read_write' the only other value?) [Clarity, Data Model §1 vs Contracts §3]
- [ ] CHK012 Is "recent documents" in search modal defined with specific criteria? (e.g., last N accessed, last N modified, per user or global?) [Clarity, Spec §FR-004]
- [ ] CHK013 Is the `pendingRequest` field in public workspace search defined for edge cases? (e.g., what if user has a rejected request — can they re-request?) [Clarity, Contracts §1]
- [ ] CHK014 Is the CSS theme `css` field format specified? (raw CSS text? only variable declarations? full property blocks?) [Clarity, Data Model §2]

## Requirement Consistency

- [ ] CHK015 Are RBAC requirements consistent across all new endpoints? (Public WS search: any auth; Theme GET: Viewer+; Theme PATCH: Admin+; Embed: Admin+) [Consistency, Contracts §1-3]
- [ ] CHK016 Is the workspace ID parameter naming consistent? (Some contracts use `:id`, existing routes use `:wsId`) [Consistency, Contracts vs Existing Endpoints]
- [ ] CHK017 Are the theme preset names consistent between spec (FR-015), data model validation rules, and API contracts? [Consistency, Spec §FR-015 vs Data Model §2 vs Contracts §2]
- [ ] CHK018 Is embed token revocation consistent between API (DELETE) and data model (revokedAt timestamp)? (DELETE implies removal, but schema uses soft-revoke) [Consistency, Contracts §3 vs Data Model §1]
- [ ] CHK019 Are the join_requests status values consistent between the existing schema ('pending'/'approved'/'rejected') and the unique partial index condition (WHERE status = 'pending')? [Consistency, Data Model §join_requests]

## Acceptance Criteria Quality

- [ ] CHK020 Can "CSS contains only --mf-* properties" be objectively measured with a deterministic validation algorithm? [Measurability, Spec §FR-016]
- [ ] CHK021 Is the 10,000 character limit for `themeCss` justified with a rationale or derived from a use case? [Measurability, Data Model §2]
- [ ] CHK022 Can "import conflict resolution (overwrite, skip, rename)" acceptance be verified through specific test scenarios? [Measurability, Spec §FR-020]
- [ ] CHK023 Are success criteria SC-002 ("find document within 5 seconds") and SC-005 ("theme applied within 2 seconds") measurable without performance test infrastructure? [Measurability, Spec §SC-002, SC-005]

## Scenario Coverage

- [ ] CHK024 Are requirements defined for what happens when a public workspace search returns zero results? [Coverage, Edge Case, Contracts §1]
- [ ] CHK025 Are requirements specified for embed token behavior when workspace is deleted? (CASCADE on workspaceId FK, but is this documented as expected behavior?) [Coverage, Data Model §1]
- [ ] CHK026 Are concurrent theme update requirements defined? (Two admins editing theme simultaneously) [Coverage, Gap]
- [ ] CHK027 Are requirements specified for version restore when the version content references deleted images or broken links? [Coverage, Edge Case, Spec §US11]
- [ ] CHK028 Are requirements defined for search behavior across different document states? (e.g., should search include trashed documents?) [Coverage, Spec §FR-003]
- [ ] CHK029 Are requirements specified for embed token listing when tokens exceed reasonable count? (Pagination not defined for GET /embed-tokens) [Coverage, Gap, Contracts §3]

## Edge Case Coverage

- [ ] CHK030 Is behavior defined when `themePreset` is set to a custom value not in the allowed enum? [Edge Case, Data Model §2]
- [ ] CHK031 Are requirements specified for the join request unique constraint when a rejected request exists? (Can user resubmit after rejection?) [Edge Case, Data Model §join_requests]
- [ ] CHK032 Is behavior defined when embed token expires during an active iframe session? [Edge Case, Spec §Edge Cases]
- [ ] CHK033 Are requirements specified for CSS theme validation when `themeCss` contains valid `--mf-*` variables with malicious values? (e.g., `--mf-font-body: expression(...)`) [Edge Case, Security]

## Dependencies & Assumptions

- [ ] CHK034 Is the assumption "existing API endpoints are stable" validated against the actual codebase? (12 endpoints listed as "no changes required") [Assumption, Contracts §Existing]
- [ ] CHK035 Is the dependency on `diff` npm package documented with version constraints and license compatibility? [Dependency, Research §6]
- [ ] CHK036 Is the assumption that "version API already returns content" verified against the actual implementation? [Assumption, Data Model §document_versions]

## Notes

- Check items off as completed: `[x]`
- Items reference: `[Spec §X]` for spec.md, `[Contracts §N]` for api-contracts.md, `[Data Model §N]` for data-model.md
- `[Gap]` indicates missing requirements; `[Clarity]` indicates ambiguous requirements
- Focus: API contracts (6 new endpoints) + data model (3 migrations) + 12 reused endpoints
