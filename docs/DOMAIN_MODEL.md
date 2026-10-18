# Domain Model
Conceptual model, not final SQL. Review constraints, indexes, migrations, deletion and authorization semantics before coding.
## Entities
Organization; Department; JobRole (responsibilities, skills, capability categories, qualification and permission templates, version); AIAgent (distinct identity, role, profile version, lifecycle, qualification, engine reference, concurrency; no raw secrets); AgentProfileVersion; AgentSkill (declared vs verified evidence); EngineConfig (adapter, non-secret config, capabilities, secret references); RecruitmentRequest; AgentQualificationRun; AgentLifecycleEvent; Project; ProjectTeam; ProjectAssignment; CapacityAllocation; Sprint; WorkItem; WorkItemDependency; ExecutionRun; ExecutionEvent; Artifact; QualityCheck; ReviewApproval; Workspace; AuditEvent; WorkforceCapacitySnapshot; AgentPerformanceMetric; ActivityEvent.
## Essential distinctions
JobRole ≠ AIAgent ≠ EngineConfig. WorkItem ≠ ExecutionRun. Lifecycle ≠ availability ≠ qualification. Declared skill ≠ verified skill. Team assignment ≠ capacity allocation. Recommendation ≠ approval. Artifact metadata ≠ content.
## Relationships
Organization owns departments, roles, projects and agents. Department has roles; role has agent identities. Agent has profile versions, skills, lifecycle events, qualification runs, assignments and execution runs. Project owns team, assignments, sprints, work items, workspaces, policies and audit scope. Work item may have many execution runs and dependencies. Each run references exact profile version, engine, workspace, events, artifacts, checks and approvals.
## Integrity
Stable IDs, not names as keys. Enforce project scope server-side. Archive auditable entities instead of deleting history. Prevent/detect dependency cycles. Index based on actual queries (project/status, sprint/status, assignee/status, run/time, audit scope/time).
