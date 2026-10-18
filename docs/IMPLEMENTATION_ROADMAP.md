# Implementation Roadmap
## Phase 0 — Validate
Inspect repo/environment/Antigravity capabilities/runtimes/integrations; document assumptions and ADRs. Human approves MVP.
## Phase 1 — Foundation
Repo/local setup, config, migrations, API error conventions, structured logs, shared UI shell/tokens, lint/typecheck/tests. Exit: app starts, health/migration/tests work.
## Phase 2 — Organization/workforce
Departments, role catalog, agent identities/profile versions/skills/lifecycle, engine registry, MockEngineAdapter, directory/profile pages. Exit: create/inspect agents without live AI.
## Phase 3 — Projects/Scrum
Project directory/settings, backlog, work items, dependencies, sprints, board, team/capacity assignments, audit. Exit: create project/sprint/work and validate transitions.
## Phase 4 — Recruitment
Request workflow, explainable rules-based demand/capacity, sandbox qualification, human approval and activation. Exit: no agent activation without qualification/approval.
## Phase 5 — Orchestration
Durable run state machine, mocked end-to-end execution, workspace isolation, artifacts/logs, bounded retries and quality gates. Exit: run through mock/review with traceability.
## Phase 6 — Live integration
Select one engine after interface verification. Add adapter health, permissions, timeout/logging and known cancellation limits; controlled integration tests. Exit: configured execution works without policy bypass and unsupported features are visible.
## Phase 7 — Portfolio/readiness
Approval queue, portfolio metrics, backup/restore, diagnostics, security/isolation tests, accessibility/responsive QA. Exit: acceptance suite/recovery docs reviewed.
## MVP
Trustworthy control plane for organization, agents, projects, Scrum, supervised recruitment, mock execution, review and audit—not a fully autonomous agency.
## Per-slice cadence
Plan small slice → acceptance criteria → implement → run tests/lint/type checks → report changed files, actual results and limitations → human review before next major phase.
