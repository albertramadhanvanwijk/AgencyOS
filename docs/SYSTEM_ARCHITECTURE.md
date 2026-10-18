# System Architecture
## Approach and stack
Start as a modular monolith with explicit boundaries. Preferred stack, to validate against environment: Next.js/React/TypeScript; FastAPI/Python/Pydantic; PostgreSQL/migrations; durable worker for long runs; Git; isolated workspaces/worktrees; unit/API/UI/E2E tests.
## Modules
Identity & Access; Organization; Workforce; Recruitment & Qualification; Portfolio; Project Management; Scrum; Scheduling; Orchestration; Engine Adapters; Workspace & Git; Quality & Review; Audit & Observability; shared UI design system.
## Flow
Create project/work item → validate readiness/policy → resolve dependencies/capacity → assign eligible agent → prepare isolated workspace → adapter executes → collect logs/artifacts → quality checks → review/approval → update item → audit and portfolio refresh.
## Adapter contract
Capability discovery, config validation, execution start, status/results, cancellation when supported, logs/artifact references, health checks. Capability differences must be explicit. Implement MockEngineAdapter first; verify exact live CLI/API interfaces before adding adapters.
## Isolation
Per-project repository/workspace; bounded per-run working directory/worktree; canonical path checks and traversal prevention; locks or isolated worktrees for concurrent writes; secrets injected through controlled provider/environment, never logged; network/shell/package/deployment actions governed by policy.
## State and storage
PostgreSQL source of truth; transactions for approval/state changes; optimistic locking where needed; runs survive restart; large logs/artifacts on disk/object storage with database references; preserve historical profile versions.
## Suggested layout
`apps/web`, `apps/api`, `apps/worker`, `packages/contracts`, `packages/ui`, `docs`, `infra/local`, `scripts`, `tests`, `.env.example`, `AGENTS.md`. Adapt to existing repo; avoid empty packages.
## Deployment path
Local development → reliable local worker/backups/integrations → cloud with secret store, identity provider, durable queue, object storage, monitoring and security review. Record ADRs for adapter, workspace isolation, scheduler, auth, queue and artifact storage.
