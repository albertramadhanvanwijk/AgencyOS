# Open Questions and Technical Clarifications

The following questions record trade-offs, assumptions, and decisions requiring human review and approval before or during implementation.

## OQ-001: Local Database and Container Availability
- **Context**: The host machine has Docker CLI installed (v29.8.0), but the Docker daemon is currently not running. PostgreSQL is not running as a local Windows service on port 5432.
- **Proposed Solution**: Use SQLAlchemy 2.0 with Alembic configured to support both SQLite (WAL mode) and PostgreSQL. For Milestone 1 / Phase 1, use SQLite locally so the entire application, migrations, and test suite run with zero external friction. When Docker or PostgreSQL is available, simply change `DATABASE_URL`.
- **Status**: Awaiting Human Approval.

---

## OQ-002: Authentication & Multi-Tenancy Scope for Initial Phases
- **Context**: The specifications note: *"Initial use may be single-user, but do not hard-code a permanently single-user permission model."*
- **Proposed Solution**: Implement a robust Role-Based Access Control (RBAC) data model (`User`, `Role`, `Permission`, `ProjectMembership`) in the database from day one. In Phase 1 and local development, default to a pre-seeded "Super Admin / Agency Owner" session context in the request headers (`X-Actor-ID` / simulated local session) while keeping all server-side permission checks active and testable. Full external auth provider (e.g., Clerk, NextAuth, or OAuth2) can be connected later without rewriting domain checks.
- **Status**: Awaiting Human Approval.

---

## OQ-003: Background Worker Architecture for Execution Runs
- **Context**: Execution runs need lifecycle tracking (`Queued` → `Preparing` → `Running` → `Collecting Results` → `Quality Checks` → `Review` → `Succeeded/Failed`). Heavy external task queues (e.g., Redis + Celery) introduce operational overhead and external dependencies.
- **Proposed Solution**: For Milestone 1 and early phases, implement a durable in-process worker queue with Python `asyncio` worker loop persisting all state, events, and heartbeats directly into the database. If the server restarts, interrupted runs transition to `Failed` or `Recoverable` based on database state. Transition to Redis / Celery or ARQ can occur cleanly in Phase 5/6 if concurrency demands warrant it.
- **Status**: Awaiting Human Approval.

---

## OQ-004: Frontend State and Design System Strategy
- **Context**: The UI design system (`docs/UX_UI_DESIGN_SYSTEM.md`) requires dense, calm, professional engineering operations aesthetics (light/dark semantic tokens, 1280/1440px desktop-first layout, keyboard accessibility, precise tables/boards, zero AI gimmicks).
- **Proposed Solution**: Build `apps/web` with Next.js 15 (App Router), Tailwind CSS configured with exact token palettes (`#F6F7F9` canvas, `#17191C` text, `#4657C8` accent, etc.), Radix UI / headless accessible primitives for dialogs/dropdowns/tooltips, and TanStack Query/Table for dense data grids.
- **Status**: Awaiting Human Approval.
