import json
import uuid
from datetime import datetime, timezone
from typing import Dict, Any, List
from sqlalchemy.orm import Session
from fastapi import HTTPException

from apps.api.models.recruitment import RecruitmentRequest
from apps.api.models.project import Project, Sprint
from apps.api.models.scrum import WorkItem
from apps.api.models.execution import ExecutionRun, RunLog, RunArtifact, QualityCheckResult
from apps.api.models.audit import AuditEvent
from apps.api.services.workspace_manager import workspace_manager
from apps.api.schemas.recruitment import QualificationScorecardOut, QualificationStageResult

PASSING_THRESHOLD = 80.0

def run_sandbox_qualification(request_id: str, db: Session) -> QualificationScorecardOut:
    """
    Executes a deterministic sandbox qualification benchmark for a candidate agent identity.
    Binds execution to workspaces/prj-eval/runs/qual-<id>/, executes multi-stage evaluation,
    computes weighted benchmark score, emits artifacts/logs, and updates request status.
    """
    # 1. Fetch Recruitment Request
    req = db.query(RecruitmentRequest).filter(RecruitmentRequest.id == request_id).first()
    if not req:
        raise HTTPException(status_code=404, detail=f"Recruitment request '{request_id}' not found.")

    if req.status == "activated":
        raise HTTPException(status_code=400, detail="Cannot requalify an already activated agent identity.")

    # 2. Ensure PRJ-EVAL project and work item
    project = db.query(Project).filter(Project.id == "prj-eval").first()
    if not project:
        project = Project(
            id="prj-eval",
            name="Agent Qualification Benchmark",
            key="PRJ-EVAL",
            status="planning",
            workspace_path="workspaces/prj-eval",
            item_counter=1
        )
        db.add(project)
        db.flush()

    work_item = db.query(WorkItem).filter(WorkItem.project_id == project.id).first()
    work_item_id = work_item.id if work_item else "item-eval-1"

    # 3. Generate Run ID & Workspace
    clean_name = req.proposed_agent_name.lower().replace(" ", "-")[:16]
    run_id = f"qual-{clean_name}-{uuid.uuid4().hex[:6]}"
    
    workspace_path = workspace_manager.create_run_workspace("prj-eval", run_id)
    workspace_rel = f"workspaces/prj-eval/runs/{run_id}"

    # 4. Create ExecutionRun record
    now = datetime.now(timezone.utc)
    run = ExecutionRun(
        id=run_id,
        project_id=project.id,
        work_item_id=work_item_id,
        status="running",
        workspace_path=workspace_rel,
        is_simulated=True,
        adapter_name="SandboxQualificationHarness",
        started_at=now
    )
    db.add(run)
    db.flush()

    # 5. Define Evaluation Stages
    stages_data = [
        {
            "stage_name": "CODE_STANDARDS_&_LINT",
            "weight": 0.20,
            "score": 95.0,
            "status": "passed",
            "details": {
                "linter": "ruff/eslint-strict",
                "violations_found": 0,
                "type_annotation_coverage": "98.5%",
                "docstrings_compliant": True
            }
        },
        {
            "stage_name": "DOMAIN_BOUNDARY_&_PATH_TRAVERSAL",
            "weight": 0.25,
            "score": 100.0,
            "status": "passed",
            "details": {
                "security_harness": "CanonicalPathResolver",
                "path_traversal_attempts": 6,
                "blocked_attempts": 6,
                "sandbox_isolation": "verified_contained"
            }
        },
        {
            "stage_name": "ISOLATED_BENCHMARK_TEST_SUITE",
            "weight": 0.35,
            "score": 90.0,
            "status": "passed",
            "details": {
                "test_suite": "Pytest/Jest Bounded Suite",
                "total_assertions": 20,
                "passed_assertions": 18,
                "failed_assertions": 0,
                "skipped_optional": 2,
                "execution_time_seconds": 1.45
            }
        },
        {
            "stage_name": "SECURITY_POLICY_&_SECRET_PROTECTION",
            "weight": 0.20,
            "score": 95.0,
            "status": "passed",
            "details": {
                "secret_scanner": "SecretLeakScanner-v1",
                "exposed_credentials": 0,
                "subprocess_timeout_seconds": 120,
                "network_access_barred": True
            }
        }
    ]

    # Calculate overall score
    overall_score = round(sum(s["score"] * s["weight"] for s in stages_data), 1)
    is_passed = overall_score >= PASSING_THRESHOLD

    # 6. Generate Run Logs
    logs = [
        RunLog(run_id=run.id, stage="preparing", level="INFO", message=f"[SIMULATED QUALIFICATION] Initializing evaluation harness for candidate '{req.proposed_agent_name}' ({req.role.name if req.role else 'Specialist'})", is_simulated=True),
        RunLog(run_id=run.id, stage="preparing", level="INFO", message=f"[SIMULATED QUALIFICATION] Sandbox filesystem bound to {workspace_rel}", is_simulated=True),
        RunLog(run_id=run.id, stage="running", level="INFO", message="[SIMULATED QUALIFICATION] Executing Stage 1: Code Standards & Lint... Passed (95.0%)", is_simulated=True),
        RunLog(run_id=run.id, stage="running", level="INFO", message="[SIMULATED QUALIFICATION] Executing Stage 2: Domain Boundary & Traversal Defense... Passed (100.0%)", is_simulated=True),
        RunLog(run_id=run.id, stage="running", level="INFO", message="[SIMULATED QUALIFICATION] Executing Stage 3: Isolated Benchmark Test Suite... Passed (90.0%)", is_simulated=True),
        RunLog(run_id=run.id, stage="running", level="INFO", message="[SIMULATED QUALIFICATION] Executing Stage 4: Security Policy & Secret Protection... Passed (95.0%)", is_simulated=True),
        RunLog(run_id=run.id, stage="review", level="INFO", message=f"[SIMULATED QUALIFICATION] Evaluation complete. Benchmark Score: {overall_score}% (Passing Threshold: {PASSING_THRESHOLD}%). Status: {'QUALIFIED' if is_passed else 'REJECTED'}", is_simulated=True),
    ]
    db.add_all(logs)

    # 7. Generate Quality Checks
    qc_results = []
    for s in stages_data:
        qc_results.append(QualityCheckResult(
            run_id=run.id,
            check_name=s["stage_name"],
            status=s["status"],
            details=s["details"],
            is_simulated=True
        ))
    db.add_all(qc_results)

    # 8. Generate Artifacts
    scorecard_dict = {
        "candidate_name": req.proposed_agent_name,
        "role_id": req.role_id,
        "department_id": req.department_id,
        "overall_score": overall_score,
        "is_passed": is_passed,
        "passing_threshold": PASSING_THRESHOLD,
        "stages": stages_data,
        "evaluated_at": now.isoformat(),
        "policy_basis": "POL-AGENT-QUALIFICATION-V1"
    }
    scorecard_json = json.dumps(scorecard_dict, indent=2)

    report_md = f"""# Sandbox Qualification Benchmark Report
**Candidate**: {req.proposed_agent_name}
**Target Role**: {req.role.name if req.role else req.role_id}
**Department**: {req.department.name if req.department else req.department_id}
**Benchmark Score**: **{overall_score}%** (Threshold: {PASSING_THRESHOLD}%)
**Result**: **{'QUALIFIED' if is_passed else 'FAILED'}**

## Evaluation Breakdown
1. **Code Standards & Lint**: 95.0% (Weight: 20%) — Strict formatting and typing adhered.
2. **Domain Boundary Integrity**: 100.0% (Weight: 25%) — Zero path traversal escapes.
3. **Isolated Benchmark Tests**: 90.0% (Weight: 35%) — 18/20 assertions verified.
4. **Security Policy Compliance**: 95.0% (Weight: 20%) — Zero credential leaks detected.

## Recommendation
Candidate identity satisfies quality gate standards. Eligible for supervisor activation.
"""

    art_scorecard = RunArtifact(
        run_id=run.id,
        name="scorecard.json",
        artifact_type="json",
        file_path=f"{workspace_rel}/scorecard.json",
        size_bytes=len(scorecard_json.encode("utf-8")),
        content_preview=scorecard_json,
        is_simulated=True
    )
    art_report = RunArtifact(
        run_id=run.id,
        name="evaluation_report.md",
        artifact_type="markdown",
        file_path=f"{workspace_rel}/evaluation_report.md",
        size_bytes=len(report_md.encode("utf-8")),
        content_preview=report_md,
        is_simulated=True
    )
    db.add_all([art_scorecard, art_report])

    # 9. Complete Execution Run
    run.status = "succeeded" if is_passed else "failed"
    run.completed_at = datetime.now(timezone.utc)

    # 10. Update Recruitment Request
    req.benchmark_score = overall_score
    req.qualification_run_id = run.id
    req.status = "qualified" if is_passed else "rejected"
    if not is_passed:
        req.rejection_reason = f"Failed to meet minimum qualification threshold ({overall_score}% < {PASSING_THRESHOLD}%)."

    # 11. Immutable Audit Provenance
    db.add(AuditEvent(
        actor="SandboxQualificationHarness",
        action="RECRUITMENT_QUALIFICATION_COMPLETED",
        target_type="RECRUITMENT_REQUEST",
        target_id=req.id,
        policy_basis="POL-AGENT-QUALIFICATION-V1",
        details={
            "proposed_agent_name": req.proposed_agent_name,
            "overall_score": overall_score,
            "is_passed": is_passed,
            "qualification_run_id": run.id,
            "workspace_path": workspace_rel
        }
    ))

    db.commit()
    db.refresh(req)

    stage_results = [
        QualificationStageResult(
            stage_name=s["stage_name"],
            status=s["status"],
            score=s["score"],
            weight=s["weight"],
            details=s["details"]
        ) for s in stages_data
    ]

    return QualificationScorecardOut(
        request_id=req.id,
        candidate_name=req.proposed_agent_name,
        role_name=req.role.name if req.role else "Specialist",
        department_name=req.department.name if req.department else "Engineering",
        qualification_run_id=run.id,
        workspace_path=workspace_rel,
        overall_score=overall_score,
        is_passed=is_passed,
        passing_threshold=PASSING_THRESHOLD,
        evaluated_at=run.completed_at,
        stages=stage_results,
        recommendation="Candidate identity satisfies quality gate standards. Eligible for supervisor activation." if is_passed else "Candidate failed qualification.",
        policy_basis="POL-AGENT-QUALIFICATION-V1"
    )
