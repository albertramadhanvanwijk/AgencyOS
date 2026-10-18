from datetime import datetime, timezone
from sqlalchemy.orm import Session
from apps.api.core.database import engine, Base, SessionLocal
from apps.api.models import (
    Department, JobRole, AIAgent, AgentProfileVersion, AgentSkill,
    AuditEvent, Project, Sprint, WorkItem,
    ExecutionRun, RunLog, RunArtifact, QualityCheckResult
)

def seed_database(db: Session):
    # 1. Departments and Workforce
    if not db.query(Department).first():
        eng_dept = Department(
            id="dept-eng",
            name="Engineering",
            code="ENG",
            description="Software architecture, backend, frontend, API and systems engineering."
        )
        prod_dept = Department(
            id="dept-prod",
            name="Product & Research",
            code="PROD",
            description="Product strategy, requirements analysis, technical specs and Scrum ownership."
        )
        qa_dept = Department(
            id="dept-qa",
            name="Quality Assurance",
            code="QA",
            description="Automated testing, security quality gates, performance and code review."
        )
        des_dept = Department(
            id="dept-des",
            name="Design System",
            code="DESIGN",
            description="UI/UX design system tokens, accessible interaction, and visual standards."
        )

        db.add_all([eng_dept, prod_dept, qa_dept, des_dept])
        db.flush()

        # 2. Standard Job Roles
        role_be = JobRole(
            id="role-be-arch",
            department_id=eng_dept.id,
            name="Backend Architect & Lead",
            code="BE_ARCH_LEAD",
            description="Designs API contracts, database schemas, server-side business logic and worker flows.",
            responsibilities=["Architecture design", "Database schema & migrations", "API endpoints", "Performance"],
            skills=["Python", "FastAPI", "PostgreSQL", "SQLAlchemy", "API Security", "Docker"],
            capability_categories=["code", "architecture", "database"],
            qualification_criteria=["Python & SQL benchmark passed", "Deterministic error handling verified"],
            is_official=True,
            version=1
        )

        role_fe = JobRole(
            id="role-fe-eng",
            department_id=eng_dept.id,
            name="Frontend Engineer (Next.js/React)",
            code="FE_ENG_REACT",
            description="Builds accessible, dense operational user interfaces using Next.js App Router and Tailwind CSS.",
            responsibilities=["UI component implementation", "Client state management", "Accessibility", "Design tokens"],
            skills=["TypeScript", "React", "Next.js", "Tailwind CSS", "Accessibility (WCAG 2.1)"],
            capability_categories=["code", "ui", "accessibility"],
            qualification_criteria=["Component accessibility verified", "Zero layout shift on 1280/1440px"],
            is_official=True,
            version=1
        )

        role_po = JobRole(
            id="role-po",
            department_id=prod_dept.id,
            name="Technical Product Owner",
            code="TECH_PO",
            description="Refines backlogs, defines verifiable acceptance criteria, and enforces Scrum discipline.",
            responsibilities=["Backlog grooming", "User story breakdown", "Acceptance criteria definition", "Sprint goals"],
            skills=["Scrum", "Product Requirements", "Domain Modeling", "Technical Writing"],
            capability_categories=["planning", "specifications"],
            qualification_criteria=["User story acceptance criteria verified actionable"],
            is_official=True,
            version=1
        )

        role_qa = JobRole(
            id="role-qa",
            department_id=qa_dept.id,
            name="QA & Quality Gate Validator",
            code="QA_VALIDATOR",
            description="Executes test suites, audits evidence against Definition of Done, and blocks unverified releases.",
            responsibilities=["Automated test execution", "Acceptance criteria validation", "Security scanning", "Audit"],
            skills=["Pytest", "Vitest", "Playwright", "Static Analysis", "Security Audit"],
            capability_categories=["testing", "verification", "security"],
            qualification_criteria=["Zero false negative test assertions"],
            is_official=True,
            version=1
        )

        db.add_all([role_be, role_fe, role_po, role_qa])
        db.flush()

        # 3. Foundational Agents
        agent_atlas = AIAgent(
            id="agent-atlas",
            name="Atlas",
            title="Lead Backend Architect",
            role_id=role_be.id,
            department_id=eng_dept.id,
            lifecycle_state="active",
            availability_state="available",
            qualification_state="passed",
            max_concurrency=2,
            current_concurrency=0,
            engine_adapter="mock",
            instructions="Maintain strict domain boundaries, validate all inputs, enforce database integrity, and use type hints.",
            current_profile_version=1
        )

        agent_kairo = AIAgent(
            id="agent-kairo",
            name="Kairo",
            title="Senior Frontend Engineer",
            role_id=role_fe.id,
            department_id=eng_dept.id,
            lifecycle_state="active",
            availability_state="available",
            qualification_state="passed",
            max_concurrency=2,
            current_concurrency=0,
            engine_adapter="mock",
            instructions="Follow UX_UI_DESIGN_SYSTEM.md strictly. Ensure keyboard accessibility, semantic tokens, and no neon AI tropes.",
            current_profile_version=1
        )

        agent_scribe = AIAgent(
            id="agent-scribe",
            name="Scribe",
            title="Technical Product Owner",
            role_id=role_po.id,
            department_id=prod_dept.id,
            lifecycle_state="active",
            availability_state="available",
            qualification_state="passed",
            max_concurrency=1,
            current_concurrency=0,
            engine_adapter="mock",
            instructions="Ensure every work item has testable acceptance criteria before marking ready.",
            current_profile_version=1
        )

        agent_sentinel = AIAgent(
            id="agent-sentinel",
            name="Sentinel",
            title="QA Gatekeeper",
            role_id=role_qa.id,
            department_id=qa_dept.id,
            lifecycle_state="testing",
            availability_state="busy",
            qualification_state="in_progress",
            max_concurrency=1,
            current_concurrency=1,
            engine_adapter="mock",
            instructions="Verify evidence before assertions. Reject tasks lacking passing tests.",
            current_profile_version=1
        )

        db.add_all([agent_atlas, agent_kairo, agent_scribe, agent_sentinel])
        db.flush()

        # 4. Agent Skills & Profile Versions
        db.add(AgentProfileVersion(
            agent_id=agent_atlas.id,
            version_number=1,
            instructions=agent_atlas.instructions,
            config_snapshot={"max_concurrency": 2, "engine": "mock"},
            change_rationale="Initial deployment profile"
        ))
        db.add(AgentSkill(agent_id=agent_atlas.id, name="Python / FastAPI", is_verified=True, verified_evidence="Benchmark test passed"))
        db.add(AgentSkill(agent_id=agent_atlas.id, name="SQLAlchemy / PostgreSQL", is_verified=True, verified_evidence="Migration test passed"))

        db.add(AgentProfileVersion(
            agent_id=agent_kairo.id,
            version_number=1,
            instructions=agent_kairo.instructions,
            config_snapshot={"max_concurrency": 2, "engine": "mock"},
            change_rationale="Initial deployment profile"
        ))
        db.add(AgentSkill(agent_id=agent_kairo.id, name="Next.js App Router", is_verified=True, verified_evidence="Component suite passed"))
        db.add(AgentSkill(agent_id=agent_kairo.id, name="Tailwind Design System", is_verified=True, verified_evidence="Accessibility audit passed"))

        db.commit()

    # 5. Foundational Projects & Sprints
    if not db.query(Project).first():
        agent_atlas = db.query(AIAgent).filter(AIAgent.name == "Atlas").first()
        agent_kairo = db.query(AIAgent).filter(AIAgent.name == "Kairo").first()
        agent_sentinel = db.query(AIAgent).filter(AIAgent.name == "Sentinel").first()

        proj_core = Project(
            id="prj-core",
            name="AgencyOS Core Platform",
            key="PRJ-CORE",
            goal="Establish human-supervised AI workforce, isolated workspace execution, and Scrum governance platform.",
            status="active",
            workspace_path="workspaces/prj-core",
            item_counter=5
        )
        db.add(proj_core)
        db.flush()

        sprint_1 = Sprint(
            id="sprint-core-1",
            project_id=proj_core.id,
            name="Sprint 1: Foundation & Scrum Core",
            goal="Deliver monorepo skeleton, live UI shell, and enforceable Scrum state machine.",
            status="active",
            capacity_points=25
        )
        db.add(sprint_1)
        db.flush()

        # 6. Initial Work Items
        item_1 = WorkItem(
            id="item-core-1",
            project_id=proj_core.id,
            sprint_id=sprint_1.id,
            key="PRJ-CORE-1",
            type="task",
            title="Setup Monorepo Skeleton & API Health Engine",
            description="Configure Next.js 15, FastAPI, SQLite WAL mode, and automated tests.",
            status="done",
            priority="critical",
            estimate_points=3.0,
            acceptance_criteria=["FastAPI health endpoint responds 200", "SQLite WAL enabled", "Automated Pytest passed"],
            definition_of_done=["Code merged", "Tests passing", "Zero lint errors"],
            assignee_agent_id=agent_atlas.id if agent_atlas else None
        )

        item_2 = WorkItem(
            id="item-core-2",
            project_id=proj_core.id,
            sprint_id=sprint_1.id,
            key="PRJ-CORE-2",
            type="story",
            title="Implement Calm Engineering UI Shell & Design System",
            description="Build AppShell, Topbar, Sidebar, and semantic color tokens without neon tropes.",
            status="done",
            priority="high",
            estimate_points=5.0,
            acceptance_criteria=["WCAG 2.1 contrast verified", "AppShell responsive at 1280px", "Dark/Light mode operational"],
            definition_of_done=["ESLint passed", "Next.js production build succeeded"],
            assignee_agent_id=agent_kairo.id if agent_kairo else None
        )

        item_3 = WorkItem(
            id="item-core-3",
            project_id=proj_core.id,
            sprint_id=sprint_1.id,
            key="PRJ-CORE-3",
            type="story",
            title="Scrum State Machine & Kanban Board",
            description="Implement server-side state transitions with rejection reasons and project isolation.",
            status="in_progress",
            priority="critical",
            estimate_points=8.0,
            acceptance_criteria=["Transition to Ready requires acceptance criteria", "Transition to Done requires quality gate review", "Project isolation enforced"],
            definition_of_done=["State machine rejection unit tests passing", "Interactive board operational"],
            assignee_agent_id=agent_atlas.id if agent_atlas else None
        )

        item_4 = WorkItem(
            id="item-core-4",
            project_id=proj_core.id,
            sprint_id=sprint_1.id,
            key="PRJ-CORE-4",
            type="task",
            title="MockEngineAdapter Isolated Run Execution",
            description="Confine runs to workspace directory and generate deterministic mock logs and artifacts.",
            status="ready",
            priority="high",
            estimate_points=5.0,
            acceptance_criteria=["Path traversal blocked via resolve()", "Subprocess execution safe from injection", "Logs visibly labelled [SIMULATED]"],
            definition_of_done=["Adapter unit tests passing"],
            assignee_agent_id=agent_atlas.id if agent_atlas else None
        )

        item_5 = WorkItem(
            id="item-core-5",
            project_id=proj_core.id,
            sprint_id=sprint_1.id,
            key="PRJ-CORE-5",
            type="story",
            title="Sandbox Agent Qualification Benchmark",
            description="Define standardized coding tests before new agent identities can be activated.",
            status="backlog",
            priority="medium",
            estimate_points=3.0,
            acceptance_criteria=["Automated test harness for new identities", "Human approval required for activation"],
            definition_of_done=["Zero unverified activations permitted"],
            assignee_agent_id=agent_sentinel.id if agent_sentinel else None
        )

        db.add_all([item_1, item_2, item_3, item_4, item_5])

        # 7. Audit Event for Seeding
        db.add(AuditEvent(
            actor="System Initializer",
            action="SEED_FOUNDATIONAL_WORKFORCE_AND_SCRUM",
            target_type="ORGANIZATION",
            target_id="ROOT",
            policy_basis="SYSTEM_BOOTSTRAP_V1",
            details={"departments_count": 4, "roles_count": 4, "agents_count": 4, "projects_count": 1, "work_items_count": 5}
        ))

        db.commit()

    # Seed PRJ-EVAL (Planning project) if not exists
    if not db.query(Project).filter(Project.id == "prj-eval").first():
        agent_sentinel = db.query(AIAgent).filter(AIAgent.id == "agent-sentinel").first()
        agent_atlas = db.query(AIAgent).filter(AIAgent.id == "agent-atlas").first()
        agent_scribe = db.query(AIAgent).filter(AIAgent.id == "agent-scribe").first()

        proj_eval = Project(
            id="prj-eval",
            name="Agent Qualification Benchmark",
            key="PRJ-EVAL",
            goal="Standardized coding sandbox benchmark to qualify autonomous agent identities before live activation.",
            status="planning",
            workspace_path="workspaces/prj-eval",
            item_counter=3
        )
        db.add(proj_eval)
        db.flush()

        sprint_eval_0 = Sprint(
            id="sprint-eval-0",
            project_id=proj_eval.id,
            name="Sprint 0: Sandbox Setup & Qualification Spec",
            goal="Draft evaluation harness test cases, sandbox containment spec, and qualification scoring rules.",
            status="planning",
            capacity_points=15
        )
        db.add(sprint_eval_0)
        db.flush()

        eval_item_1 = WorkItem(
            id="item-eval-1",
            project_id=proj_eval.id,
            sprint_id=sprint_eval_0.id,
            key="PRJ-EVAL-1",
            type="story",
            title="Define Standardized Coding Benchmark Test Suite",
            description="Create reference test harness assessing Python and TypeScript implementation rigor without network access.",
            status="backlog",
            priority="high",
            estimate_points=5.0,
            acceptance_criteria=["Benchmark runner isolated from external network", "Passing threshold set at >= 85% coverage"],
            definition_of_done=["Test harness runner operational", "Mock agent qualification verified"],
            assignee_agent_id=agent_sentinel.id if agent_sentinel else None
        )

        eval_item_2 = WorkItem(
            id="item-eval-2",
            project_id=proj_eval.id,
            sprint_id=sprint_eval_0.id,
            key="PRJ-EVAL-2",
            type="task",
            title="Design Quarantine Sandbox Execution Environment",
            description="Establish temporary branch-based ephemeral execution environments with zero host credential exposure.",
            status="backlog",
            priority="critical",
            estimate_points=8.0,
            acceptance_criteria=["Path traversal barred by CanonicalPathResolver", "Subprocess timeout enforced at 120s"],
            definition_of_done=["Sandbox security penetration test passed"],
            assignee_agent_id=agent_atlas.id if agent_atlas else None
        )

        eval_item_3 = WorkItem(
            id="item-eval-3",
            project_id=proj_eval.id,
            sprint_id=sprint_eval_0.id,
            key="PRJ-EVAL-3",
            type="story",
            title="Human Evaluator Dual-Key Sign-Off Protocol",
            description="Ensure autonomous agent activation requires explicit human technical lead sign-off and audit log entry.",
            status="ready",
            priority="medium",
            estimate_points=3.0,
            acceptance_criteria=["Dual-key cryptographic or role-based check required", "Audit trail records policy basis"],
            definition_of_done=["Verification gate tested and documented"],
            assignee_agent_id=agent_scribe.id if agent_scribe else None
        )

        db.add_all([eval_item_1, eval_item_2, eval_item_3])
        db.add(AuditEvent(
            actor="System Initializer",
            action="CREATE_PROJECT",
            target_type="PROJECT",
            target_id=proj_eval.id,
            project_id=proj_eval.id,
            policy_basis="SYSTEM_BOOTSTRAP_V1",
            details={"name": proj_eval.name, "key": proj_eval.key, "status": "planning"}
        ))
        db.commit()

    # Seed execution run for completed item_1 if not exists
    if not db.query(ExecutionRun).filter(ExecutionRun.id == "run-core-101").first():
        run_1 = ExecutionRun(
            id="run-core-101",
            project_id="prj-core",
            work_item_id="item-core-1",
            agent_id="agent-atlas",
            status="succeeded",
            workspace_path="workspaces/prj-core/runs/run-core-101",
            is_simulated=True,
            adapter_name="MockEngineAdapter",
            started_at=datetime.now(timezone.utc),
            completed_at=datetime.now(timezone.utc)
        )
        db.add(run_1)
        db.flush()

        # Logs
        log1 = RunLog(run_id=run_1.id, stage="preparing", level="INFO", message="[SIMULATED] Initializing isolated run workspace for PRJ-CORE-1", is_simulated=True)
        log2 = RunLog(run_id=run_1.id, stage="running", level="INFO", message="[SIMULATED] Implementing API health endpoints & SQLite WAL mode", is_simulated=True)
        log3 = RunLog(run_id=run_1.id, stage="collecting_results", level="INFO", message="[SIMULATED] Generating git patch diff and verification artifacts", is_simulated=True)
        log4 = RunLog(run_id=run_1.id, stage="quality_checks", level="INFO", message="[SIMULATED] Running quality gates (LINT, TYPECHECK, TESTS, SECURITY)", is_simulated=True)
        log5 = RunLog(run_id=run_1.id, stage="review", level="INFO", message="[SIMULATED] Execution completed with zero defect escapes. Approved into Done.", is_simulated=True)
        db.add_all([log1, log2, log3, log4, log5])

        # Artifacts
        diff_text_1 = """# [SIMULATED] Git Patch Diff for PRJ-CORE-1
# Work Item: Setup Monorepo Skeleton & API Health Engine
diff --git a/apps/api/routers/health.py b/apps/api/routers/health.py
new file mode 100644
--- /dev/null
+++ b/apps/api/routers/health.py
@@ -0,0 +1,18 @@
+from fastapi import APIRouter
+router = APIRouter()
+@router.get("/health")
+def health():
+    return {"status": "healthy", "service": "AgencyOS API"}
+"""
        art_diff_1 = RunArtifact(
            run_id=run_1.id,
            name="patch.diff",
            artifact_type="diff",
            file_path="workspaces/prj-core/runs/run-core-101/patch.diff",
            size_bytes=len(diff_text_1.encode("utf-8")),
            content_preview=diff_text_1,
            is_simulated=True
        )

        test_text_1 = """{
  "simulated": true,
  "framework": "pytest-simulated",
  "total": 7,
  "passed": 7,
  "failed": 0,
  "duration_seconds": 0.42
}"""
        art_test_1 = RunArtifact(
            run_id=run_1.id,
            name="test_results.json",
            artifact_type="test_results",
            file_path="workspaces/prj-core/runs/run-core-101/test_results.json",
            size_bytes=len(test_text_1.encode("utf-8")),
            content_preview=test_text_1,
            is_simulated=True
        )
        db.add_all([art_diff_1, art_test_1])

        # Quality Checks
        qc1 = QualityCheckResult(run_id=run_1.id, check_name="LINT", status="passed", details={"errors": 0}, is_simulated=True)
        qc2 = QualityCheckResult(run_id=run_1.id, check_name="TYPECHECK", status="passed", details={"errors": 0}, is_simulated=True)
        qc3 = QualityCheckResult(run_id=run_1.id, check_name="UNIT_TESTS", status="passed", details={"passed": 7, "total": 7}, is_simulated=True)
        qc4 = QualityCheckResult(run_id=run_1.id, check_name="SECURITY_SCAN", status="passed", details={"vulnerabilities": 0}, is_simulated=True)
        db.add_all([qc1, qc2, qc3, qc4])
        db.commit()

    # Seed execution run for PRJ-CORE-2 if not exists
    if not db.query(ExecutionRun).filter(ExecutionRun.id == "run-core-102").first():
        run_2 = ExecutionRun(
            id="run-core-102",
            project_id="prj-core",
            work_item_id="item-core-2",
            agent_id="agent-kairo",
            status="succeeded",
            workspace_path="workspaces/prj-core/runs/run-core-102",
            is_simulated=True,
            adapter_name="MockEngineAdapter",
            started_at=datetime.now(timezone.utc),
            completed_at=datetime.now(timezone.utc)
        )
        db.add(run_2)
        db.flush()

        log2_1 = RunLog(run_id=run_2.id, stage="preparing", level="INFO", message="[SIMULATED] Preparing isolated UI workspace for PRJ-CORE-2", is_simulated=True)
        log2_2 = RunLog(run_id=run_2.id, stage="running", level="INFO", message="[SIMULATED] Constructing Calm Engineering Design System tokens and AppShell", is_simulated=True)
        log2_3 = RunLog(run_id=run_2.id, stage="collecting_results", level="INFO", message="[SIMULATED] Generating UI components diff and WCAG contrast audit", is_simulated=True)
        log2_4 = RunLog(run_id=run_2.id, stage="quality_checks", level="INFO", message="[SIMULATED] Executing ESLint, Prettier, and Jest component suites", is_simulated=True)
        log2_5 = RunLog(run_id=run_2.id, stage="review", level="INFO", message="[SIMULATED] Verification passed with 100% WCAG AA compliance. Signed off into Done.", is_simulated=True)
        db.add_all([log2_1, log2_2, log2_3, log2_4, log2_5])

        diff_text_2 = """# [SIMULATED] Git Patch Diff for PRJ-CORE-2
# Work Item: Implement Calm Engineering UI Shell & Design System
diff --git a/apps/web/src/components/layout/AppShell.tsx b/apps/web/src/components/layout/AppShell.tsx
new file mode 100644
--- /dev/null
+++ b/apps/web/src/components/layout/AppShell.tsx
@@ -0,0 +1,24 @@
+import React from "react";
+import { Sidebar } from "./Sidebar";
+import { Topbar } from "./Topbar";
+
+export function AppShell({ children }: { children: React.ReactNode }) {
+  return (
+    <div className="flex h-screen bg-canvas-light dark:bg-canvas-dark text-textPrimary-light dark:text-textPrimary-dark">
+      <Sidebar />
+      <main className="flex-1 overflow-y-auto">{children}</main>
+    </div>
+  );
+}
+"""
        art_diff_2 = RunArtifact(
            run_id=run_2.id,
            name="patch.diff",
            artifact_type="diff",
            file_path="workspaces/prj-core/runs/run-core-102/patch.diff",
            size_bytes=len(diff_text_2.encode("utf-8")),
            content_preview=diff_text_2,
            is_simulated=True
        )

        test_text_2 = """{
  "simulated": true,
  "framework": "jest-accessibility",
  "total": 12,
  "passed": 12,
  "failed": 0,
  "wcag_aa_compliant": true
}"""
        art_test_2 = RunArtifact(
            run_id=run_2.id,
            name="test_results.json",
            artifact_type="test_results",
            file_path="workspaces/prj-core/runs/run-core-102/test_results.json",
            size_bytes=len(test_text_2.encode("utf-8")),
            content_preview=test_text_2,
            is_simulated=True
        )
        db.add_all([art_diff_2, art_test_2])

        qc2_1 = QualityCheckResult(run_id=run_2.id, check_name="LINT", status="passed", details={"errors": 0}, is_simulated=True)
        qc2_2 = QualityCheckResult(run_id=run_2.id, check_name="TYPECHECK", status="passed", details={"errors": 0}, is_simulated=True)
        qc2_3 = QualityCheckResult(run_id=run_2.id, check_name="WCAG_CONTRAST", status="passed", details={"ratio": "4.8:1", "level": "AA"}, is_simulated=True)
        qc2_4 = QualityCheckResult(run_id=run_2.id, check_name="UNIT_TESTS", status="passed", details={"passed": 12, "total": 12}, is_simulated=True)
        db.add_all([qc2_1, qc2_2, qc2_3, qc2_4])
        db.commit()

def init_db():
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()
    try:
        seed_database(db)
    finally:
        db.close()
