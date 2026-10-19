from typing import List, Optional, Any, Dict
from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from sqlalchemy.orm import Session
from apps.api.core.database import get_db
from apps.api.models import Project, Sprint, WorkItem, RecruitmentRequest, AuditEvent
from apps.api.services.pm_assistant import pm_assistant

router = APIRouter(prefix="/approvals", tags=["Human Approvals & Governance Gates"])

class SprintApprovalActionIn(BaseModel):
    approved_by: Optional[str] = "Project Owner"

@router.get("/summary")
def get_approvals_summary(db: Session = Depends(get_db)):
    """
    Mengambil rekapitulasi seluruh gerbang persetujuan (approval gates)
    yang membutuhkan peninjauan manusia:
    1. Persetujuan Memulai Sprint (Sprints with status 'pending_approval')
    2. Persetujuan Rekrutmen & Aktivasi Agen (Recruitment requests with status 'qualified' / 'pending_approval')
    3. Persetujuan Work Item Definition of Done (Work items with status 'in_review')
    """
    # 1. Pending Sprints
    pending_sprints_db = (
        db.query(Sprint)
        .filter(Sprint.status == "pending_approval")
        .order_by(Sprint.created_at.desc())
        .all()
    )
    pending_sprints = []
    for s in pending_sprints_db:
        # Check if project currently has an active sprint running
        has_active_sprint = (
            db.query(Sprint)
            .filter(Sprint.project_id == s.project_id, Sprint.id != s.id, Sprint.status == "active")
            .first()
        )
        
        items = db.query(WorkItem).filter(WorkItem.sprint_id == s.id).all()
        stories_preview = [
            {
                "id": item.id,
                "key": item.key,
                "title": item.title,
                "type": item.type,
                "points": item.estimate_points or 1.0,
                "priority": item.priority,
                "assignee_name": item.assignee.name if item.assignee else "Belum Ditugaskan",
                "status": item.status,
            }
            for item in items[:6]
        ]
        
        pending_sprints.append({
            "id": s.id,
            "name": s.name,
            "goal": s.goal or "Target Sprint Delivery",
            "capacity_points": s.capacity_points or 20,
            "created_at": s.created_at.isoformat() if s.created_at else None,
            "project_id": s.project_id,
            "project_name": s.project.name if s.project else "Unknown Project",
            "project_key": s.project.key if s.project else "PRJ",
            "items_count": len(items),
            "total_points": sum(item.estimate_points or 0 for item in items),
            "stories_preview": stories_preview,
            "can_start_now": has_active_sprint is None,
            "blocking_active_sprint_name": has_active_sprint.name if has_active_sprint else None,
        })

    # 2. Pending Recruitment Requests
    pending_recruitment_db = (
        db.query(RecruitmentRequest)
        .filter(RecruitmentRequest.status.in_(["qualified", "pending_approval"]))
        .order_by(RecruitmentRequest.created_at.desc())
        .all()
    )
    pending_recruitment = []
    for r in pending_recruitment_db:
        pending_recruitment.append({
            "id": r.id,
            "role_id": r.role_id,
            "role_name": r.role.name if r.role else "Specialist",
            "department_id": r.department_id,
            "department_name": r.department.name if r.department else "General",
            "proposed_agent_name": r.proposed_agent_name,
            "rationale": r.rationale,
            "requested_by": r.requested_by,
            "required_skills": r.required_skills or [],
            "status": r.status,
            "benchmark_score": r.benchmark_score,
            "qualification_run_id": r.qualification_run_id,
            "policy_basis": r.policy_basis,
            "created_at": r.created_at.isoformat() if r.created_at else None,
        })

    # 3. Pending Work Items (In Review)
    pending_work_items_db = (
        db.query(WorkItem)
        .filter(WorkItem.status == "in_review")
        .order_by(WorkItem.updated_at.desc())
        .all()
    )
    pending_work_items = []
    for w in pending_work_items_db:
        pending_work_items.append({
            "id": w.id,
            "key": w.key,
            "title": w.title,
            "type": w.type,
            "priority": w.priority,
            "estimate_points": w.estimate_points,
            "project_id": w.project_id,
            "project_name": w.project.name if w.project else "Unknown Project",
            "assignee_name": w.assignee.name if w.assignee else "Tim Agen",
            "acceptance_criteria": w.acceptance_criteria or [],
            "definition_of_done": w.definition_of_done or [],
            "git_branch": w.git_branch,
            "pull_request_url": w.pull_request_url,
            "updated_at": w.updated_at.isoformat() if w.updated_at else None,
        })

    total_count = len(pending_sprints) + len(pending_recruitment) + len(pending_work_items)

    return {
        "total_pending_count": total_count,
        "sprint_count": len(pending_sprints),
        "recruitment_count": len(pending_recruitment),
        "work_item_count": len(pending_work_items),
        "pending_sprints": pending_sprints,
        "pending_recruitment": pending_recruitment,
        "pending_work_items": pending_work_items,
    }

@router.post("/sprints/{project_id}/{sprint_id}/approve")
def approve_sprint_from_hub(
    project_id: str,
    sprint_id: str,
    payload: Optional[SprintApprovalActionIn] = None,
    db: Session = Depends(get_db)
):
    """
    Persetujuan langsung Sprint Start melalui Central Approval Hub.
    """
    approved_by = payload.approved_by if payload else "Project Owner"
    try:
        return pm_assistant.approve_start_sprint(project_id, sprint_id, approved_by, db)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
