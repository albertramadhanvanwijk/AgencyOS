# Scrum and Execution Workflow
## Work items and status
Epic, Story, Task, Subtask, Bug; project-scoped generated keys. Default flow: Backlog → Ready → In Progress → In Review → Done. Optional Blocked, Awaiting Approval, Cancelled. Backend validates transitions.
## Readiness
Ready state; testable acceptance criteria; dependencies complete or approved waiver; eligible agent/capacity; permission and engine health; budget/time checked; isolated workspace ready. Return actionable validation errors.
## Definition of Done
Configurable per project/type: acceptance criteria verified, required tests pass, relevant code review complete, applicable security/dependency checks pass, docs updated, evidence attached, required approvals recorded.
## ExecutionRun lifecycle
Queued → Preparing → Running → Collecting Results → Quality Checks → Review/Awaiting Approval → Succeeded/Failed/Cancelled. Terminal runs immutable; retries create linked attempts. Record work item/project, agent and exact profile version, engine config/version, workspace, timestamps, status, redacted logs, diffs/artifacts, checks, error class, retry links and approvals.
## Human supervision
Approval for new agent activation, official role creation, production deployment, destructive repository/database operations, secret access changes, external communications/paid provisioning, budget/policy changes. Human may approve, reject, request changes or cancel. Record reason and audit event.
## Retry and scheduling
Bounded retries/backoff only for retryable errors. Do not retry permission/config/policy failures or non-idempotent external effects blindly. Preserve failures. Scheduler considers skills, qualification, project priority, sprint commitment, capacity/concurrency, dependencies/locks, deadline/budget, engine health/rate limits and fairness. Explain decisions and audit overrides.
