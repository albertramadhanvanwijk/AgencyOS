from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from apps.api.core.database import get_db
from apps.api.models.organization import JobRole, Department
from apps.api.models.recruitment import RecruitmentRequest
from apps.api.models.audit import AuditEvent
from apps.api.schemas.recruitment import (
    RecruitmentRequestCreate,
    RecruitmentRequestStatusUpdate,
    RecruitmentRequestOut,
    DemandAnalysisOut
)
from apps.api.services.demand_analyzer import analyze_workforce_demand

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
