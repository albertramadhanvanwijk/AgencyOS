# Product Requirements Document
## Principles
Human oversight for consequential decisions; Scrum work items as source of truth; project context/workspace/permissions/secrets isolated; role, identity, engine separated; status reflects evidence; audit meaningful changes; build progressively.
## Modules
### Agency Overview
Portfolio table with project health, sprint progress, blockers, milestone, owner; pending approvals; workforce capacity; evidence-backed risks; recent activity. Avoid decorative metrics.
### Organization and Role Catalog
Departments and role definitions including responsibilities, skills, permitted capabilities, qualification criteria, permission templates. AI can propose new roles; human approves before official use. Audit changes.
### Workforce Directory
Identity, role, department, skills, lifecycle, qualification, engine, assignments, capacity, recent evidence. Search/filter; create, clone as distinct identity, configure, qualify, assign, pause, retire. Never expose secrets.
### Recruitment Center
Analyze queued work, skills gaps, capacity, deadlines, budget. Compare recruit/reassign/wait/reduce scope/increase approved concurrency. Human approval for recruitment/activation; sandbox qualification. Lifecycle: Draft, Pending Approval, Testing, Active, On Leave, Paused, Retiring, Archived. Availability and qualification are separate dimensions.
### Projects and Scrum
Each project owns goal, repository, workspace policy, team, backlog, sprint history, context and audit scope. Support Epic, Story, Task, Subtask, Bug; estimates, priorities, dependencies, acceptance criteria, DoD, labels, blockers, review feedback and history. Validate transitions server-side.
### Scheduler
Stable core team plus dynamic specialists. Track capacity, active runs, concurrency, dependencies, queue, priorities, budget, engine health and fairness. Prevent overbooking and workspace conflicts. Explain decisions and audit overrides.
### Execution
Validate readiness, permissions, dependencies, capacity, budget and workspace. Start through replaceable adapter; collect logs, artifacts, changed files, tests, errors and timestamps. Support bounded retries, timeouts, cancellation when supported and recovery. Build mock adapter first.
### Quality and Approval
Checks depend on item type/project. Done requires applicable acceptance criteria and quality gates. Approval record includes requester, approver, decision, reason, time, policy basis and target.
### Audit, Reporting, Settings
Audit actor/action/target/time/project/correlation and redacted metadata. Metrics only when measurable; label estimates. Engine/repository/workspace/policy settings; honest integration states: Not configured, Configured, Verified, Error, Unsupported.
## Non-functional
Backend authorization; least privilege; workspace isolation; safe subprocesses; secret redaction; structured logs; recoverable run state; migrations/tests; pagination; keyboard accessibility/focus; desktop-first at 1280/1440px and tablet usable; configurable paths.
## Completion rule
A feature is done only with acceptance criteria and tests. Mock runs are visibly simulated. UI never implies an integration is live unless verified.
