from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from apps.api.core.database import get_db
from apps.api.models import WorkItem, Project, AIAgent, AuditEvent
from apps.api.schemas.scrum import WorkItemUpdate, WorkItemOut

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
    if update_in.assignee_agent_id is not None:
        item.assignee_agent_id = update_in.assignee_agent_id
    if update_in.sprint_id is not None:
        item.sprint_id = update_in.sprint_id
    if update_in.blocker_reason is not None:
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
