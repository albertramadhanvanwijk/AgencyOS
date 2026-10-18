import json
from datetime import datetime, timezone
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from apps.api.core.database import get_db
from apps.api.models.organization import JobRole, Department
from apps.api.models.workforce import AIAgent, AgentProfileVersion, AgentSkill
from apps.api.models.recruitment import RecruitmentRequest
from apps.api.models.execution import ExecutionRun, RunArtifact
from apps.api.models.audit import AuditEvent
from apps.api.schemas.recruitment import (
    RecruitmentRequestCreate,
    RecruitmentRequestStatusUpdate,
    RecruitmentRequestOut,
    DemandAnalysisOut,
    QualificationScorecardOut,
    QualificationStageResult,
    AgentActivationApprovalIn,
    AgentActivationOut
)
from apps.api.services.demand_analyzer import analyze_workforce_demand
from apps.api.services.qualification_runner import run_sandbox_qualification

router = APIRouter(prefix="/recruitment", tags=["Recruitment"])

VALID_RECRUITMENT_STATUSES = {"draft", "pending_approval", "qualifying", "qualified", "activated", "rejected"}

@router.get("/demand-analysis", response_model=DemandAnalysisOut)
def get_demand_analysis(db: Session = Depends(get_db)):
    """
    Executes rules-based explainable demand analysis to discover skill bottlenecks
    and staffing recommendations across active projects.
    """
    return analyze_workforce_demand(db)

@router.get("/requests", response_model=List[RecruitmentRequestOut])
def list_recruitment_requests(
    status_filter: Optional[str] = Query(None, alias="status"),
    db: Session = Depends(get_db)
):
    """
    Lists all recruitment requests with optional status filtering.
    """
    query = db.query(RecruitmentRequest)
    if status_filter:
        query = query.filter(RecruitmentRequest.status == status_filter.lower())
    
    requests = query.order_by(RecruitmentRequest.created_at.desc()).all()
    results = []
    for r in requests:
        results.append(RecruitmentRequestOut(
            id=r.id,
            role_id=r.role_id,
            department_id=r.department_id,
            proposed_agent_name=r.proposed_agent_name,
            rationale=r.rationale,
            requested_by=r.requested_by,
            required_skills=r.required_skills or [],
            status=r.status,
            benchmark_score=r.benchmark_score,
            qualification_run_id=r.qualification_run_id,
            rejection_reason=r.rejection_reason,
            policy_basis=r.policy_basis,
            created_at=r.created_at,
            updated_at=r.updated_at,
            role_name=r.role.name if r.role else None,
            department_name=r.department.name if r.department else None,
        ))
    return results

@router.get("/requests/{request_id}", response_model=RecruitmentRequestOut)
def get_recruitment_request(request_id: str, db: Session = Depends(get_db)):
    """
    Retrieves details for a specific recruitment request.
    """
    r = db.query(RecruitmentRequest).filter(RecruitmentRequest.id == request_id).first()
    if not r:
        raise HTTPException(status_code=404, detail="Recruitment request not found.")
    
    return RecruitmentRequestOut(
        id=r.id,
        role_id=r.role_id,
        department_id=r.department_id,
        proposed_agent_name=r.proposed_agent_name,
        rationale=r.rationale,
        requested_by=r.requested_by,
        required_skills=r.required_skills or [],
        status=r.status,
        benchmark_score=r.benchmark_score,
        qualification_run_id=r.qualification_run_id,
        rejection_reason=r.rejection_reason,
        policy_basis=r.policy_basis,
        created_at=r.created_at,
        updated_at=r.updated_at,
        role_name=r.role.name if r.role else None,
        department_name=r.department.name if r.department else None,
    )

@router.post("/requests", response_model=RecruitmentRequestOut, status_code=status.HTTP_201_CREATED)
def create_recruitment_request(
    req_in: RecruitmentRequestCreate,
    db: Session = Depends(get_db)
):
    """
    Submits a new recruitment request for human supervisor evaluation.
    Enforces role validation and logs an immutable audit event.
    """
    # 1. Validate Job Role
    role = db.query(JobRole).filter(JobRole.id == req_in.role_id).first()
    if not role:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Job role '{req_in.role_id}' does not exist in organizational catalog."
        )

    # 2. Determine Department
    dept_id = req_in.department_id or role.department_id
    dept = db.query(Department).filter(Department.id == dept_id).first()
    if not dept:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Department '{dept_id}' does not exist in organizational catalog."
        )

    # 3. Create Request
    req = RecruitmentRequest(
        role_id=role.id,
        department_id=dept.id,
        proposed_agent_name=req_in.proposed_agent_name.strip(),
        rationale=req_in.rationale.strip(),
        requested_by=req_in.requested_by.strip(),
        required_skills=req_in.required_skills,
        status="pending_approval",
        policy_basis="POL-AGENT-RECRUITMENT-V1"
    )
    db.add(req)
    db.flush()

    # 4. Audit Provenance
    db.add(AuditEvent(
        actor=req.requested_by,
        action="RECRUITMENT_REQUEST_CREATED",
        target_type="RECRUITMENT_REQUEST",
        target_id=req.id,
        policy_basis="POL-AGENT-RECRUITMENT-V1",
        details={
            "proposed_agent_name": req.proposed_agent_name,
            "role_id": req.role_id,
            "role_name": role.name,
            "department_id": req.department_id,
            "skills": req.required_skills
        }
    ))

    db.commit()
    db.refresh(req)

    return RecruitmentRequestOut(
        id=req.id,
        role_id=req.role_id,
        department_id=req.department_id,
        proposed_agent_name=req.proposed_agent_name,
        rationale=req.rationale,
        requested_by=req.requested_by,
        required_skills=req.required_skills or [],
        status=req.status,
        benchmark_score=req.benchmark_score,
        qualification_run_id=req.qualification_run_id,
        rejection_reason=req.rejection_reason,
        policy_basis=req.policy_basis,
        created_at=req.created_at,
        updated_at=req.updated_at,
        role_name=role.name,
        department_name=dept.name,
    )

@router.patch("/requests/{request_id}/status", response_model=RecruitmentRequestOut)
def update_recruitment_request_status(
    request_id: str,
    update_in: RecruitmentRequestStatusUpdate,
    db: Session = Depends(get_db)
):
    """
    Updates recruitment request status with state transition audit logging.
    """
    req = db.query(RecruitmentRequest).filter(RecruitmentRequest.id == request_id).first()
    if not req:
        raise HTTPException(status_code=404, detail="Recruitment request not found.")

    target_status = update_in.status.lower()
    if target_status not in VALID_RECRUITMENT_STATUSES:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid status '{target_status}'. Valid states: {', '.join(VALID_RECRUITMENT_STATUSES)}"
        )

    prev_status = req.status
    req.status = target_status

    if target_status == "rejected":
        req.rejection_reason = update_in.rejection_reason or "Rejected by supervisor."

    # Audit transition
    db.add(AuditEvent(
        actor=update_in.approver or "Agency Operator",
        action="RECRUITMENT_STATUS_TRANSITION",
        target_type="RECRUITMENT_REQUEST",
        target_id=req.id,
        policy_basis="POL-AGENT-RECRUITMENT-V1",
        details={
            "from_status": prev_status,
            "to_status": target_status,
            "proposed_agent_name": req.proposed_agent_name,
            "rejection_reason": req.rejection_reason if target_status == "rejected" else None
        }
    ))

    db.commit()
    db.refresh(req)

    return RecruitmentRequestOut(
        id=req.id,
        role_id=req.role_id,
        department_id=req.department_id,
        proposed_agent_name=req.proposed_agent_name,
        rationale=req.rationale,
        requested_by=req.requested_by,
        required_skills=req.required_skills or [],
        status=req.status,
        benchmark_score=req.benchmark_score,
        qualification_run_id=req.qualification_run_id,
        rejection_reason=req.rejection_reason,
        policy_basis=req.policy_basis,
        created_at=req.created_at,
        updated_at=req.updated_at,
        role_name=req.role.name if req.role else None,
        department_name=req.department.name if req.department else None,
    )

@router.post("/requests/{request_id}/qualify", response_model=QualificationScorecardOut)
def trigger_qualification_benchmark(
    request_id: str,
    db: Session = Depends(get_db)
):
    """
    Triggers an isolated sandbox qualification benchmark in workspaces/prj-eval.
    Calculates multi-stage benchmark score and updates candidate qualification status.
    """
    return run_sandbox_qualification(request_id, db)

@router.get("/requests/{request_id}/scorecard", response_model=QualificationScorecardOut)
def get_qualification_scorecard(
    request_id: str,
    db: Session = Depends(get_db)
):
    """
    Retrieves the latest qualification scorecard and stage breakdown for a candidate.
    """
    req = db.query(RecruitmentRequest).filter(RecruitmentRequest.id == request_id).first()
    if not req:
        raise HTTPException(status_code=404, detail="Recruitment request not found.")
    
    if not req.qualification_run_id:
        raise HTTPException(status_code=404, detail="Candidate has not executed sandbox qualification yet.")

    # Fetch scorecard artifact from execution run
    artifact = db.query(RunArtifact).filter(
        RunArtifact.run_id == req.qualification_run_id,
        RunArtifact.name == "scorecard.json"
    ).first()

    if not artifact or not artifact.content_preview:
        raise HTTPException(status_code=404, detail="Qualification scorecard artifact not found.")

    scorecard_data = json.loads(artifact.content_preview)
    run = db.query(ExecutionRun).filter(ExecutionRun.id == req.qualification_run_id).first()

    stages = [
        QualificationStageResult(
            stage_name=s["stage_name"],
            status=s["status"],
            score=s["score"],
            weight=s["weight"],
            details=s["details"]
        ) for s in scorecard_data.get("stages", [])
    ]

    return QualificationScorecardOut(
        request_id=req.id,
        candidate_name=req.proposed_agent_name,
        role_name=req.role.name if req.role else "Specialist",
        department_name=req.department.name if req.department else "Engineering",
        qualification_run_id=req.qualification_run_id,
        workspace_path=run.workspace_path if run else f"workspaces/prj-eval/runs/{req.qualification_run_id}",
        overall_score=scorecard_data.get("overall_score", 0.0),
        is_passed=scorecard_data.get("is_passed", False),
        passing_threshold=scorecard_data.get("passing_threshold", 80.0),
        evaluated_at=run.completed_at if run and run.completed_at else req.updated_at,
        stages=stages,
        recommendation="Candidate identity satisfies quality gate standards. Eligible for supervisor activation." if scorecard_data.get("is_passed") else "Candidate failed qualification.",
        policy_basis=scorecard_data.get("policy_basis", "POL-AGENT-QUALIFICATION-V1")
    )

@router.post("/requests/{request_id}/approve-activation", response_model=AgentActivationOut)
def approve_agent_activation(
    request_id: str,
    approval_in: AgentActivationApprovalIn,
    db: Session = Depends(get_db)
):
    """
    Enforces dual-key supervisor human approval to activate a qualified agent identity.
    Automatically provisions new AIAgent, profile version 1, verified skills, and logs audit provenance.
    """
    req = db.query(RecruitmentRequest).filter(RecruitmentRequest.id == request_id).first()
    if not req:
        raise HTTPException(status_code=404, detail="Recruitment request not found.")

    if req.status == "activated":
        raise HTTPException(status_code=400, detail="This agent identity has already been activated.")

    # Governance check: Only qualified candidates can be activated
    if req.status != "qualified":
        raise HTTPException(
            status_code=400,
            detail=f"Cannot activate candidate in status '{req.status}'. Sandbox qualification benchmark must be passed first."
        )

    # 1. Create AIAgent
    title = approval_in.custom_title or (req.role.name if req.role else "Specialist")
    agent = AIAgent(
        name=req.proposed_agent_name,
        title=title,
        role_id=req.role_id,
        department_id=req.department_id,
        lifecycle_state="active",
        availability_state="available",
        qualification_state="passed",
        max_concurrency=approval_in.max_concurrency,
        current_concurrency=0,
        engine_adapter="mock",
        instructions=f"Operate under {req.role.name if req.role else 'specialist'} guidelines. Enforce quality gates, maintain domain boundaries, and audit all actions.",
        current_profile_version=1
    )
    db.add(agent)
    db.flush()

    # 2. Create Profile Version 1
    profile_ver = AgentProfileVersion(
        agent_id=agent.id,
        version_number=1,
        instructions=agent.instructions,
        config_snapshot={
            "max_concurrency": agent.max_concurrency,
            "engine": agent.engine_adapter,
            "qualification_run_id": req.qualification_run_id,
            "benchmark_score": req.benchmark_score
        },
        change_rationale=f"Supervised recruitment activation by {approval_in.approver}. Sandbox benchmark score: {req.benchmark_score}%."
    )
    db.add(profile_ver)

    # 3. Create Verified Agent Skills
    skills_created = 0
    for skill_name in req.required_skills or []:
        db.add(AgentSkill(
            agent_id=agent.id,
            name=skill_name,
            is_verified=True,
            verified_evidence=f"Passed sandbox benchmark in {req.qualification_run_id} ({req.benchmark_score}%)"
        ))
        skills_created += 1

    # 4. Transition Request Status
    req.status = "activated"

    # 5. Audit Provenance
    now = datetime.now(timezone.utc)
    db.add(AuditEvent(
        actor=approval_in.approver,
        action="AGENT_IDENTITY_ACTIVATED",
        target_type="AI_AGENT",
        target_id=agent.id,
        policy_basis="POL-AGENT-ACTIVATION-V1",
        details={
            "agent_id": agent.id,
            "agent_name": agent.name,
            "role_id": agent.role_id,
            "role_name": req.role.name if req.role else None,
            "department_id": agent.department_id,
            "benchmark_score": req.benchmark_score,
            "qualification_run_id": req.qualification_run_id,
            "recruitment_request_id": req.id,
            "approval_notes": approval_in.approval_notes
        }
    ))

    db.commit()
    db.refresh(agent)
    db.refresh(req)

    return AgentActivationOut(
        request_id=req.id,
        agent_id=agent.id,
        agent_name=agent.name,
        role_name=req.role.name if req.role else "Specialist",
        department_name=req.department.name if req.department else "Engineering",
        status="active",
        benchmark_score=req.benchmark_score or 0.0,
        activated_at=now,
        policy_basis="POL-AGENT-ACTIVATION-V1",
        skills_count=skills_created
    )
