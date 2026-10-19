# Architecture Decision Records (ADRs)

## ADR-001: Monorepo Structure and Technology Stack
* **Status**: Proposed (Awaiting Human Approval)
* **Date**: 2026-10-19
* **Context**: AgencyOS requires a modern, high-density, accessible frontend web interface and a robust, typed backend with background task execution, workspace isolation, and state machine transitions.
* **Decision**:
  - **Monorepo Layout**:
    - `apps/web`: Next.js (App Router, React 19, TypeScript, Tailwind CSS, Lucide Icons).
    - `apps/api`: FastAPI (Python 3.14+, Pydantic v2, SQLAlchemy 2.0, Alembic).
    - `packages/contracts`: Shared TypeScript types / OpenAPI schemas generated from FastAPI specifications.
    - `packages/ui`: Shared design system tokens, primitives, and accessible component library matching `docs/UX_UI_DESIGN_SYSTEM.md`.
  - **Package Management**:
    - Frontend: `pnpm` workspaces.
    - Backend: Python `venv` + `pyproject.toml` / `pip-tools` or `uv`.
* **Consequences**:
  - Clean separation of presentation and execution domain logic.
  - Type-safe communication via OpenAPI and TypeScript contracts.

---

## ADR-002: Dual-Database Strategy for Local Dev and Production (PostgreSQL / SQLite)
* **Status**: Proposed (Awaiting Human Approval)
* **Date**: 2026-10-19
* **Context**: While production and staging require PostgreSQL for concurrency and JSON query capabilities, local developer environments (especially on Windows where Docker daemon may not always be running) need zero-friction bootstrapping.
* **Decision**:
  - Use **SQLAlchemy 2.0** with **Alembic** migrations.
  - Default to **SQLite with WAL mode and foreign keys enabled** for local development and rapid automated unit testing when `DATABASE_URL` is unset or set to `sqlite:///agencyos.db`.
  - Support full **PostgreSQL** dialect for production or when Docker/Postgres is running via `DATABASE_URL=postgresql+psycopg://...`.
* **Consequences**:
  - Developers can run the entire test suite and frontend/backend without requiring Docker Desktop to be active.
  - Schema migrations must avoid proprietary PostgreSQL extensions in core tables or provide portable equivalents.

---

## ADR-003: Replaceable Engine Adapters & MockEngineAdapter First
* **Status**: Accepted
* **Date**: 2026-10-19
* **Context**: System must support multiple AI agents and execution engines without coupling the core orchestration logic to specific external vendor APIs or live credentials.
* **Decision**:
  - Establish an explicit abstract `EngineAdapter` interface:
    - `discover_capabilities() -> EngineCapabilities`
    - `validate_config(config: dict) -> ValidationResult`
    - `start_execution(run_context: RunContext) -> ExecutionHandle`
    - `get_status(handle: ExecutionHandle) -> ExecutionStatus`
    - `cancel_execution(handle: ExecutionHandle) -> CancelResult`
    - `health_check() -> HealthStatus`
  - Implement `MockEngineAdapter` as the primary, fully deterministic implementation for Milestone 1.
  - Every mock execution result, log, and artifact must be visibly labelled as `[SIMULATED]` in UI and API responses.
* **Consequences**:
  - All workflow features, quality gates, and approvals can be tested deterministically without live AI token costs or network dependencies.
  - Live integrations (e.g., Anthropic, OpenAI, local LLMs) can be added cleanly in Phase 6 after formal interface verification.

---

## ADR-004: Workspace & Process Isolation Boundary
* **Status**: Proposed (Awaiting Human Approval)
* **Date**: 2026-10-19
* **Context**: Multi-agent and multi-project execution must guarantee zero context leakage, protect host filesystems, and prevent race conditions or path traversal attacks.
* **Decision**:
  - Each project has an isolated workspace directory root (`workspaces/<project_id>/`).
  - Each execution run operates within a bounded subdirectory or dedicated Git worktree (`workspaces/<project_id>/runs/<run_id>/`).
  - Server-side path canonicalization (`pathlib.Path.resolve()`) validates that all read/write operations remain strictly within the designated run root.
  - Unsafe shell string concatenation is strictly banned; all process executions must use safe vector-argument subprocess calls (`subprocess.Popen(["cmd", "arg"])`).
  - Secrets are injected directly into child process environments at runtime and scrubbed/redacted from all logs, artifacts, and database audit tables.
* **Consequences**:
  - Mitigates path traversal and accidental project cross-contamination.
  - Compatible with Windows, Linux, and macOS.

---

## ADR-005: Human-Supervised State Machine for Scrum & Recruitment
* **Status**: Accepted
* **Date**: 2026-10-19
* **Context**: Consequential business and operational transitions must not happen autonomously without traceable human authorization.
* **Decision**:
  - Work item transitions (`Backlog` → `Ready` → `In Progress` → `In Review` → `Done`) and recruitment lifecycles (`Draft` → `Pending Approval` → `Testing` → `Active` → `Retired`) are guarded by server-side state machine guards.
  - Transition to `Ready` requires verified acceptance criteria and dependencies.
  - Transition to `Done` requires passing quality gates, attached evidence, and necessary human approval.
  - Consequential actions generate an immutable `AuditEvent` with actor, action, timestamp, policy basis, and redacted payload.
* **Consequences**:
  - Guarantees accountability and eliminates unapproved state drift.

---

## ADR-006: GitHub Integration, Worktree Branching, and Subtask Hierarchy
* **Status**: Accepted
* **Date**: 2026-10-19
* **Context**: Multi-agent orchestration requires a seamless version control pipeline, preventing merge conflicts when multiple agents work concurrently, and mirroring Jira-style Development Panels and subtask breakdowns.
* **Decision**:
  - **GitHub Repository Lifecycle**:
    - During project creation, users can choose:
      1. `auto_create`: AgencyOS calls GitHub REST API v3 to automatically provision a remote repo under the user's account with `.gitignore`, `README.md`, and CI workflow templates.
      2. `existing`: Links an existing remote repository URL and initializes local tracking.
      3. `local`: Operates in an offline git repository without pushing upstream.
  - **Git Branch Worktree Strategy**:
    - Top-level stories/tasks automatically receive a dedicated working branch: `agencyos/{project_key}/{task_key}`.
    - Subtasks inherit their parent context and receive targeted child branches: `agencyos/{project_key}/{parent_key}-s{n}`.
    - Agents work in isolated worktree workspaces (`workspaces/{project_id}/runs/{run_id}`) preventing cross-agent file locks and race conditions.
  - **Subtask Hierarchy & Development Panel**:
    - `WorkItem` supports a self-referencing `parent_id` foreign key.
    - Top-level cards sit on the Scrum Kanban board columns with a subtask completion indicator (`X/Y Subtasks Done`).
    - Task inspection modal contains a Jira-style **Development Panel** displaying the isolated branch name, 1-click clipboard copy, GitHub Pull Request status, and automated CI check indicators.
    - Subtasks can be created dynamically via `POST /work-items/{id}/subtasks` and independently assigned to specialized agents with individual story point estimates.
* **Consequences**:
  - Eliminates code collision during parallel agent execution.
  - Transparent traceability from requirement (User Story) to code (Git Branch & PR).
  - Human operator retains full visibility and approval control prior to merging to `main`.
