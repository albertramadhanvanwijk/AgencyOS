# AgencyOS Implementation Plan

## Overview
This document defines the structured, test-driven implementation plan for **AgencyOS**, strictly adhering to the specifications in `docs/` and the human-supervised autonomy model.

Every slice follows the mandatory cycle:
1. **Plan slice & define acceptance criteria**.
2. **Implement small testable units** (backend logic, API validation, UI components, states).
3. **Execute lint, typecheck, and automated tests**.
4. **Commit & push to GitHub (`origin main`)**.
5. **Human review of UI/UX and functional behavior** before proceeding to the next task.

---

## Milestone 1: Foundation & First End-to-End Mock Run
**Goal**: Deliver the end-to-end foundation where an operator can create a project, configure an agent identity with a role, define a Scrum work item with acceptance criteria, trigger a simulated run via `MockEngineAdapter` in an isolated workspace, inspect the real-time timeline/logs/artifacts, review evidence, and audit the state transition.

### Slice 1.1: Project Skeleton & Monorepo Foundation (Phase 1)
- **Scope**:
  - Root configuration (`pnpm-workspace.yaml`, `.editorconfig`, `.env.example`).
  - `apps/web`: Next.js 15 (App Router, TypeScript, Tailwind CSS with design tokens from `docs/UX_UI_DESIGN_SYSTEM.md`, Lucide icons).
  - `apps/api`: FastAPI backend with Python 3.14 venv, Pydantic v2 schemas, SQLAlchemy 2.0 ORM, and Alembic migrations.
  - Base health check API endpoints (`/api/v1/health`, `/api/v1/system/status`).
  - Automated tests: Pytest for API health, Vitest/ESLint for web.
- **Acceptance Criteria**:
  - `apps/api` starts cleanly on `localhost:8000` and passes health check test.
  - `apps/web` builds and runs cleanly on `localhost:3000` with light/dark theme tokens.
  - Zero TypeScript, ESLint, or Pytest errors.
  - Commit & push to GitHub; Human UI/health review.

### Slice 1.2: Design System & Shared UI Shell (Phase 1 / UX)
- **Scope**:
  - Implement core layout components: `AppShell`, `Sidebar`, `Topbar`, `Breadcrumbs`, `PageHeader`, `StatusBadge`, and responsive shell (1280px/1440px desktop-first).
  - Implement light (`#F6F7F9` canvas, `#17191C` text) and dark (`#111318` canvas, `#F1F3F5` text) color modes with zero neon/purple AI dashboard tropes.
  - Core navigation: Agency Overview, Projects, Workforce, Recruitment, Organization, Approvals, Audit, Settings.
  - Standard UI state wrappers: Loading (skeleton), Empty state, Error state, and Disabled state.
- **Acceptance Criteria**:
  - Navigation works with clean URL routing.
  - Keyboard navigation and accessible focus rings verified.
  - Tested on responsive viewports (1280px desktop, tablet).
  - Commit & push to GitHub; Human UI review.

### Slice 1.3: Organization, Role Catalog & Workforce Directory (Phase 2)
- **Scope**:
  - Database models & migrations for `Department`, `JobRole`, `AIAgent`, `AgentProfileVersion`, `AgentSkill`.
  - Enforce entity distinctions: `JobRole` ≠ `AIAgent` ≠ `EngineConfig`.
  - Separation of dimensions: Lifecycle (`Draft`, `Pending Approval`, `Testing`, `Active`, `Paused`, `Retired`), Availability (`Available`, `Busy`, `Offline`), Qualification (`Not Tested`, `Passed`, `Failed`).
  - Pre-seed default department & role templates (Engineering, Product, Quality, Design).
  - UI Screens:
    - Organization & Role Catalog (`/organization/roles`).
    - Workforce Directory with table, filters, and status badges (`/workforce`).
    - Agent Profile View (`/workforce/[id]`) with profile versions and qualification evidence.
- **Acceptance Criteria**:
  - CRUD operations on roles and agents validated through API tests.
  - Role creation requiring human approval flag.
  - UI properly displays all states (loading, empty, populated, error).
  - Commit & push to GitHub; Human UI review.

### Slice 1.4: Projects, Backlog & Scrum Board (Phase 3)
- **Scope**:
  - Database models & migrations for `Project`, `ProjectTeam`, `CapacityAllocation`, `Sprint`, `WorkItem`, `WorkItemDependency`.
  - Support item types: `Epic`, `Story`, `Task`, `Subtask`, `Bug` with auto-generated project-scoped keys (e.g., `PRJ-101`).
  - Server-side state machine validation: `Backlog` → `Ready` (requires acceptance criteria) → `In Progress` → `In Review` → `Done` (requires quality gates).
  - UI Screens:
    - Project Directory & Summary (`/projects`).
    - Project Backlog & Sprint Planning (`/projects/[id]/backlog`).
    - Scrum Board with columns, drag-and-drop / keyboard transitions, and rejection reasons (`/projects/[id]/board`).
    - Work Item Detail modal/drawer with acceptance criteria, dependencies, and audit history.
- **Acceptance Criteria**:
  - State machine rejects invalid transitions (e.g., cannot move to `Ready` without acceptance criteria).
  - Project isolation strictly verified in API queries.
  - Commit & push to GitHub; Human UI review.

### Slice 1.5: Workspace Isolation & MockEngineAdapter (Phases 1 & 5)
- **Scope**:
  - Workspace manager service: creates and bounds `workspaces/<project_id>/runs/<run_id>/` with path canonicalization and directory traversal prevention.
  - Abstract `EngineAdapter` base class and `MockEngineAdapter` implementation.
  - `MockEngineAdapter` simulates deterministic multi-step work:
    - Validates inputs.
    - Generates step-by-step logs with simulated timestamps.
    - Emits mock diffs/artifacts (`patch.diff`, `test_results.json`).
    - Runs mock quality check (`QualityCheck`).
  - Every mock output explicitly tagged with `[SIMULATED]`.
- **Acceptance Criteria**:
  - Subprocess execution tests guarantee path containment.
  - Execution run transitions: `Queued` → `Preparing` → `Running` → `Collecting Results` → `Quality Checks` → `Review` → `Succeeded`.
  - Unit and integration tests for adapter contract.
  - Commit & push to GitHub; Human UI review.

### Slice 1.6: Execution Run Timeline, Artifacts & Audit Verification (End-to-End Milestone Complete)
- **Scope**:
  - Execution Run UI (`/projects/[id]/runs/[runId]`):
    - Real-time run timeline.
    - Redacted log viewer with ANSI styling.
    - Artifact viewer (code diffs, test summaries).
    - Simulated badge banner.
  - Review & Approval panel: allows human supervisor to review evidence and approve transition to `Done`.
  - Audit Log viewer (`/audit` and project audit tab) showing full provenance: actor, action, timestamp, policy basis, and redacted details.
- **Acceptance Criteria**:
  - End-to-end user scenario tested and verified:
    1. Project created.
    2. Agent identity configured.
    3. Work item created with acceptance criteria.
    4. Mock execution run triggered.
    5. Run completes; logs & diffs displayed.
    6. Quality gate passes; human approves work item to `Done`.
    7. Audit trail records every event immutably.
  - Commit & push to GitHub; Human UI & workflow review.

---

## Future Milestones
- **Milestone 2**: Recruitment Center, Sandbox Qualification & Dynamic Staffing (Phase 4).
- **Milestone 3**: Multi-run Concurrency, Scheduler & Capacity Allocation (Phase 5).
- **Milestone 4**: First Live Engine Integration (Phase 6).
- **Milestone 5**: Enterprise Governance, Portfolio Analytics & Disaster Recovery (Phase 7).
