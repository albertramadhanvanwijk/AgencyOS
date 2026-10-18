# Quality Gates
## General
- [ ] Typecheck, lint, automated tests configured.
- [ ] No committed secrets; `.env.example` placeholders only.
- [ ] Migrations repeatable/documented.
- [ ] Errors actionable and redacted.
- [ ] Loading, empty, error, disabled, permission-denied states.
- [ ] No inert controls without explanation.
- [ ] Consequential transitions audited.
## Workforce
- [ ] Role, identity, engine distinct.
- [ ] Lifecycle, availability, qualification separate.
- [ ] New role and agent activation require approvals.
- [ ] Recruitment compares alternatives and states assumptions.
- [ ] Qualification sandbox isolated.
- [ ] Profile versions retained for historical runs.
- [ ] Secrets absent from UI/logs.
## Multi-project
- [ ] Separate Scrum/workspace config per project.
- [ ] No context leakage.
- [ ] Capacity/concurrency enforced.
- [ ] Portfolio respects permissions.
- [ ] Concurrent runs cannot corrupt worktrees.
- [ ] Assignment does not imply unlimited capacity.
## Execution
- [ ] Invalid transitions rejected with reason.
- [ ] Readiness, permission, dependencies and capacity validated.
- [ ] Work item supports multiple runs.
- [ ] Retry preserves prior attempts.
- [ ] Mock results labelled simulated.
- [ ] Done requires acceptance criteria/quality gates.
- [ ] Failure/cancellation recoverable and audited.
- [ ] Logs/artifacts linked to correct run/project.
## Security
- [ ] Backend authorization; path traversal blocked.
- [ ] External effects require policy/approval.
- [ ] Process execution bounded.
- [ ] Untrusted content cannot override policy.
- [ ] Secret redaction tested; local service binds localhost by default.
## UX
- [ ] Consistent tokens/components; no generic gradient-heavy AI dashboard.
- [ ] Tables/boards readable at 1280 and 1440px.
- [ ] Keyboard navigation/focus; status not color-only.
- [ ] Charts have question/timeframe/source; demo data labelled.
- [ ] Responsive/reduced motion checked; core flows have E2E tests.
A phase is not complete just because code compiles; acceptance criteria, tests and limitations require review.
