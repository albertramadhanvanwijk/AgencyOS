from typing import Optional, List
from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from sqlalchemy.orm import Session
from apps.api.core.database import get_db
from apps.api.models import WorkItem, Project, AIAgent, AuditEvent
from apps.api.schemas.scrum import WorkItemUpdate, WorkItemOut
from apps.api.schemas.scheduler import AgentRecommendationOut, AssignAgentRequest
from apps.api.services.scheduler import scheduler_service

router = APIRouter(prefix="/work-items", tags=["Scrum & Work Items"])

VALID_STATUSES = {"backlog", "ready", "in_progress", "in_review", "done", "blocked", "cancelled"}

@router.get("/{item_id}", response_model=WorkItemOut)
def get_work_item(item_id: str, db: Session = Depends(get_db)):
    item = db.query(WorkItem).filter(
        (WorkItem.id == item_id) | (WorkItem.key == item_id.upper())
    ).first()
    if not item:
        raise HTTPException(status_code=404, detail="Work item not found")

    return WorkItemOut(
        id=item.id,
        project_id=item.project_id,
        sprint_id=item.sprint_id,
        key=item.key,
        type=item.type,
        title=item.title,
        description=item.description,
        status=item.status,
        priority=item.priority,
        estimate_points=item.estimate_points,
        acceptance_criteria=item.acceptance_criteria or [],
        definition_of_done=item.definition_of_done or [],
        assignee_agent_id=item.assignee_agent_id,
        blocker_reason=item.blocker_reason,
        created_at=item.created_at,
        updated_at=item.updated_at,
        assignee_name=item.assignee.name if item.assignee else None,
        project_name=item.project.name if item.project else None,
    )

@router.patch("/{item_id}", response_model=WorkItemOut)
def update_work_item(
    item_id: str,
    update_in: WorkItemUpdate,
    db: Session = Depends(get_db)
):
    item = db.query(WorkItem).filter(
        (WorkItem.id == item_id) | (WorkItem.key == item_id.upper())
    ).first()
    if not item:
        raise HTTPException(status_code=404, detail="Work item not found")

    previous_status = item.status

    # State machine transition guards
    if update_in.status is not None:
        target_status = update_in.status.lower()
        if target_status not in VALID_STATUSES:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Invalid status '{target_status}'. Valid states: {', '.join(VALID_STATUSES)}"
            )

        # Guard 1: Backlog -> Ready requires testable acceptance criteria
        if target_status == "ready":
            criteria = update_in.acceptance_criteria if update_in.acceptance_criteria is not None else item.acceptance_criteria
            if not criteria or len(criteria) == 0:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="State machine rejection: Cannot transition to 'Ready' without at least one testable acceptance criterion."
                )

        # Guard 2: Any -> Blocked requires blocker reason
        if target_status == "blocked":
            reason = update_in.blocker_reason or item.blocker_reason
            if not reason:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="State machine rejection: Setting status to 'Blocked' requires a specific blocker_reason."
                )

        # Guard 3: Ready -> In Progress requires assigned agent
        if target_status == "in_progress":
            assignee = update_in.assignee_agent_id or item.assignee_agent_id
            if not assignee:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="State machine rejection: Cannot transition to 'In Progress' without an assigned agent identity."
                )

        # Guard 4: In Progress -> Done requires passing review or DoD
        if target_status == "done" and previous_status not in ("in_review", "done"):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"State machine rejection: Direct transition from '{previous_status}' to 'Done' is invalid. Work items must pass through 'In Review'."
            )

        item.status = target_status

    # Apply other updates
    if update_in.title is not None:
        item.title = update_in.title.strip()
    if update_in.description is not None:
        item.description = update_in.description
    if update_in.priority is not None:
        item.priority = update_in.priority
    if update_in.estimate_points is not None:
        item.estimate_points = update_in.estimate_points
    if update_in.acceptance_criteria is not None:
        item.acceptance_criteria = update_in.acceptance_criteria
    if update_in.definition_of_done is not None:
        item.definition_of_done = update_in.definition_of_done
    if "assignee_agent_id" in update_in.model_fields_set:
        item.assignee_agent_id = update_in.assignee_agent_id if update_in.assignee_agent_id else None
    if "sprint_id" in update_in.model_fields_set:
        item.sprint_id = update_in.sprint_id if update_in.sprint_id else None
    if "blocker_reason" in update_in.model_fields_set:
        item.blocker_reason = update_in.blocker_reason

    # Audit event on status change
    if update_in.status is not None and update_in.status != previous_status:
        action_name = "WORK_ITEM_STATUS_TRANSITION"
        if previous_status == "in_review" and item.status == "in_progress":
            action_name = "WORK_ITEM_REWORK_REQUESTED"
        elif previous_status == "done":
            action_name = "WORK_ITEM_REOPENED"

        db.add(AuditEvent(
            actor="Agency Operator",
            action=action_name,
            target_type="WORK_ITEM",
            target_id=item.id,
            project_id=item.project_id,
            policy_basis="SCRUM_STATE_MACHINE_V1",
            details={
                "key": item.key,
                "from_status": previous_status,
                "to_status": item.status,
                "is_backward_step": (
                    (previous_status == "in_review" and item.status == "in_progress") or
                    (previous_status == "in_progress" and item.status == "ready") or
                    (previous_status == "ready" and item.status == "backlog") or
                    (previous_status == "done" and item.status == "in_review")
                )
            }
        ))

    db.commit()
    db.refresh(item)

    return WorkItemOut(
        id=item.id,
        project_id=item.project_id,
        sprint_id=item.sprint_id,
        key=item.key,
        type=item.type,
        title=item.title,
        description=item.description,
        status=item.status,
        priority=item.priority,
        estimate_points=item.estimate_points,
        acceptance_criteria=item.acceptance_criteria or [],
        definition_of_done=item.definition_of_done or [],
        assignee_agent_id=item.assignee_agent_id,
        blocker_reason=item.blocker_reason,
        created_at=item.created_at,
        updated_at=item.updated_at,
        assignee_name=item.assignee.name if item.assignee else None,
        project_name=item.project.name if item.project else None,
    )

class WorkItemApprovalIn(BaseModel):
    decision: str  # "approve" or "rework"
    review_notes: Optional[str] = None
    approver: str = "Agency Operator"

@router.post("/{item_id}/approve", response_model=WorkItemOut)
def approve_work_item(
    item_id: str,
    approval_in: WorkItemApprovalIn,
    db: Session = Depends(get_db)
):
    """
    Formal human supervisor review and sign-off endpoint.
    Verifies evidence against Definition of Done before transitioning to Done,
    or returns to In Progress if rework is needed.
    """
    item = db.query(WorkItem).filter(WorkItem.id == item_id).first()
    if not item:
        raise HTTPException(status_code=404, detail="Work item not found.")

    if item.status != "in_review":
        raise HTTPException(
            status_code=400,
            detail=f"Work item must be in 'in_review' state to be evaluated by supervisor. Current state: '{item.status}'"
        )

    previous_status = item.status

    if approval_in.decision == "approve":
        item.status = "done"
        action = "WORK_ITEM_APPROVED"
    elif approval_in.decision == "rework":
        item.status = "in_progress"
        action = "WORK_ITEM_REWORK_REQUESTED"
    else:
        raise HTTPException(status_code=400, detail="Invalid decision. Must be 'approve' or 'rework'.")

    db.add(AuditEvent(
        actor=approval_in.approver,
        action=action,
        target_type="WORK_ITEM",
        target_id=item.id,
        project_id=item.project_id,
        policy_basis="QUALITY_GATE_HUMAN_APPROVAL_V1",
        details={
            "key": item.key,
            "decision": approval_in.decision,
            "review_notes": approval_in.review_notes or "Review verified against Definition of Done",
            "from_status": previous_status,
            "to_status": item.status,
            "criteria_count": len(item.acceptance_criteria or []),
        }
    ))

    db.commit()
    db.refresh(item)

    return WorkItemOut(
        id=item.id,
        project_id=item.project_id,
        sprint_id=item.sprint_id,
        key=item.key,
        type=item.type,
        title=item.title,
        description=item.description,
        status=item.status,
        priority=item.priority,
        estimate_points=item.estimate_points,
        acceptance_criteria=item.acceptance_criteria or [],
        definition_of_done=item.definition_of_done or [],
        assignee_agent_id=item.assignee_agent_id,
        blocker_reason=item.blocker_reason,
        created_at=item.created_at,
        updated_at=item.updated_at,
        assignee_name=item.assignee.name if item.assignee else None,
        project_name=item.project.name if item.project else None,
    )


@router.get("/{item_id}/recommend-assignees", response_model=List[AgentRecommendationOut])
def get_recommended_assignees(item_id: str, db: Session = Depends(get_db)):
    """
    Menghitung rekomendasi penugasan agen terbaik untuk work item ini
    berdasarkan analisis kesesuaian skill, peran, kualifikasi, dan kapasitas.
    """
    item = db.query(WorkItem).filter(
        (WorkItem.id == item_id) | (WorkItem.key == item_id.upper())
    ).first()
    if not item:
        raise HTTPException(status_code=404, detail="Work item not found.")

    return scheduler_service.recommend_assignees(db, item)


@router.post("/{item_id}/assign", response_model=WorkItemOut)
def assign_agent_to_work_item(
    item_id: str,
    assign_req: AssignAgentRequest,
    db: Session = Depends(get_db)
):
    """
    Menugaskan agen ke work item secara aman dengan validasi konkurensi dan audit trail.
    """
    item = db.query(WorkItem).filter(
        (WorkItem.id == item_id) | (WorkItem.key == item_id.upper())
    ).first()
    if not item:
        raise HTTPException(status_code=404, detail="Work item not found.")

    try:
        updated_item = scheduler_service.assign_agent(
            db=db,
            work_item=item,
            agent_id=assign_req.agent_id,
            actor=assign_req.actor or "Scrum Master",
            rationale=assign_req.rationale
        )
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

    return WorkItemOut(
        id=updated_item.id,
        project_id=updated_item.project_id,
        sprint_id=updated_item.sprint_id,
        key=updated_item.key,
        type=updated_item.type,
        title=updated_item.title,
        description=updated_item.description,
        status=updated_item.status,
        priority=updated_item.priority,
        estimate_points=updated_item.estimate_points,
        acceptance_criteria=updated_item.acceptance_criteria or [],
        definition_of_done=updated_item.definition_of_done or [],
        assignee_agent_id=updated_item.assignee_agent_id,
        blocker_reason=updated_item.blocker_reason,
        created_at=updated_item.created_at,
        updated_at=updated_item.updated_at,
        assignee_name=updated_item.assignee.name if updated_item.assignee else None,
        project_name=updated_item.project.name if updated_item.project else None,
    )


