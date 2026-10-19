import os
from datetime import datetime, timezone
from typing import List, Optional
from pydantic import BaseModel
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session
from apps.api.core.database import get_db
from apps.api.core.config import settings
from apps.api.models import Project, Sprint, WorkItem, AuditEvent, AIAgent
from apps.api.schemas.project import ProjectCreate, ProjectOut, SprintCreate, SprintOut
from apps.api.schemas.scrum import WorkItemCreate, WorkItemOut, WorkItemSubtaskOut
from apps.api.schemas.scheduler import SprintCapacityOut
from apps.api.schemas.analytics import SprintBurndownOut, ProjectVelocityOut
from apps.api.services.scheduler import scheduler_service
from apps.api.services.analytics import analytics_service

from apps.api.services.github_service import github_service
from apps.api.services.pm_assistant import pm_assistant

router = APIRouter(prefix="/projects", tags=["Projects & Workspaces"])

@router.get("/integrations/github/status")
def get_github_status(token: Optional[str] = Query(None)):
    user = github_service.get_authenticated_user(token)
    if not user:
        return {"authenticated": False, "username": None}
    return {
        "authenticated": True,
        "username": user.get("login"),
        "name": user.get("name"),
        "avatar_url": user.get("avatar_url"),
        "html_url": user.get("html_url"),
    }

@router.get("", response_model=List[ProjectOut])
def list_projects(db: Session = Depends(get_db)):
    projects = db.query(Project).all()
    results = []
    for p in projects:
        active_sprint = next((s.name for s in p.sprints if s.status == "active"), None)
        total_items = len(p.work_items)
        done_items = sum(1 for w in p.work_items if w.status == "done")

        out = ProjectOut(
            id=p.id,
            name=p.name,
            key=p.key,
            goal=p.goal,
            status=p.status,
            workspace_path=p.workspace_path,
            item_counter=p.item_counter,
            github_repo_url=p.github_repo_url,
            github_repo_name=p.github_repo_name,
            github_repo_mode=p.github_repo_mode,
            github_branch=p.github_branch or "main",
            created_at=p.created_at,
            active_sprint_name=active_sprint,
            total_items=total_items,
            done_items=done_items,
        )
        results.append(out)
    return results

@router.post("", response_model=ProjectOut, status_code=status.HTTP_201_CREATED)
def create_project(proj_in: ProjectCreate, db: Session = Depends(get_db)):
    key_clean = proj_in.key.strip().upper()
    existing = db.query(Project).filter(
        (Project.name == proj_in.name) | (Project.key == key_clean)
    ).first()
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Project with name '{proj_in.name}' or key '{key_clean}' already exists."
        )

    # Workspace isolation path
    workspace_rel = f"workspaces/{key_clean.lower()}"
    workspace_full = os.path.join(settings.WORKSPACE_ROOT, key_clean.lower())
    os.makedirs(workspace_full, exist_ok=True)

    repo_url = proj_in.github_repo_url
    repo_name = proj_in.github_repo_name
    repo_mode = proj_in.github_repo_mode or "local"
    repo_branch = proj_in.github_branch or "main"

    # Handle GitHub repository creation / connection
    if repo_mode == "auto_create":
        # Format a clean repo name if not provided
        sanitized_name = proj_in.name.strip().lower().replace(" ", "-")
        target_repo_name = repo_name or f"{key_clean.lower()}-{sanitized_name}"
        try:
            gh_repo = github_service.create_repository(
                name=target_repo_name,
                private=proj_in.is_private_repo if proj_in.is_private_repo is not None else True,
                description=proj_in.goal or f"{proj_in.name} - Managed by AgencyOS",
                token=proj_in.github_token
            )
            repo_url = gh_repo.get("html_url")
            repo_name = gh_repo.get("full_name")
        except Exception as e:
            # If auto-create fails, raise friendly error to user
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Gagal membuat repositori GitHub otomatis: {str(e)}"
            )

    # Initialize local git repository (and push to remote if url is set)
    github_service.init_local_git_repo(
        workspace_full_path=workspace_full,
        remote_url=repo_url,
        branch=repo_branch,
        create_ci=bool(proj_in.create_ci_workflow),
        project_name=proj_in.name.strip(),
        project_key=key_clean,
        token=proj_in.github_token
    )

    proj = Project(
        name=proj_in.name.strip(),
        key=key_clean,
        goal=proj_in.goal,
        status=proj_in.status,
        workspace_path=workspace_rel,
        github_repo_url=repo_url,
        github_repo_name=repo_name,
        github_repo_mode=repo_mode,
        github_branch=repo_branch,
        item_counter=0,
    )
    db.add(proj)
    db.flush()

    # Initial default Sprint
    sprint = Sprint(
        project_id=proj.id,
        name="Sprint 1: Kickoff & Setup",
        goal=f"Initial backlog and setup for {proj.name}",
        status="active",
        capacity_points=20,
    )
    db.add(sprint)

    # Audit Event
    db.add(AuditEvent(
        actor="Agency Owner",
        action="CREATE_PROJECT",
        target_type="PROJECT",
        target_id=proj.id,
        project_id=proj.id,
        policy_basis="PROJECT_CREATION_POLICY",
        details={
            "name": proj.name,
            "key": proj.key,
            "workspace": workspace_rel,
            "github_repo_url": repo_url,
            "github_repo_mode": repo_mode
        }
    ))

    db.commit()
    db.refresh(proj)

    return ProjectOut(
        id=proj.id,
        name=proj.name,
        key=proj.key,
        goal=proj.goal,
        status=proj.status,
        workspace_path=proj.workspace_path,
        github_repo_url=proj.github_repo_url,
        github_repo_name=proj.github_repo_name,
        github_repo_mode=proj.github_repo_mode,
        github_branch=proj.github_branch,
        item_counter=0,
        created_at=proj.created_at,
        active_sprint_name=sprint.name,
        total_items=0,
        done_items=0,
    )

@router.get("/{project_id}", response_model=ProjectOut)
def get_project(project_id: str, db: Session = Depends(get_db)):
    p = db.query(Project).filter(
        (Project.id == project_id) | (Project.key == project_id.upper())
    ).first()
    if not p:
        raise HTTPException(status_code=404, detail="Project not found")

    active_sprint = next((s.name for s in p.sprints if s.status == "active"), None)
    total_items = len(p.work_items)
    done_items = sum(1 for w in p.work_items if w.status == "done")

    return ProjectOut(
        id=p.id,
        name=p.name,
        key=p.key,
        goal=p.goal,
        status=p.status,
        workspace_path=p.workspace_path,
        github_repo_url=p.github_repo_url,
        github_repo_name=p.github_repo_name,
        github_repo_mode=p.github_repo_mode,
        github_branch=p.github_branch or "main",
        item_counter=p.item_counter,
        created_at=p.created_at,
        active_sprint_name=active_sprint,
        total_items=total_items,
        done_items=done_items,
    )

def _build_sprint_out(s: Sprint, items_count: Optional[int] = None) -> SprintOut:
    return SprintOut(
        id=s.id,
        project_id=s.project_id,
        name=s.name,
        goal=s.goal,
        status=s.status,
        capacity_points=s.capacity_points,
        start_date=s.start_date,
        end_date=s.end_date,
        created_at=s.created_at,
        items_count=items_count if items_count is not None else (len(s.work_items) if hasattr(s, "work_items") and s.work_items else 0),
        retrospective=s.retrospective,
        review_notes=s.review_notes,
        approved_by=s.approved_by,
        approved_at=s.approved_at,
    )

@router.get("/{project_id}/sprints", response_model=List[SprintOut])
def list_project_sprints(project_id: str, db: Session = Depends(get_db)):
    p = db.query(Project).filter(
        (Project.id == project_id) | (Project.key == project_id.upper())
    ).first()
    if not p:
        raise HTTPException(status_code=404, detail="Project not found")

    sprints = db.query(Sprint).filter(Sprint.project_id == p.id).all()
    return [_build_sprint_out(s) for s in sprints]

@router.post("/{project_id}/sprints", response_model=SprintOut, status_code=status.HTTP_201_CREATED)
def create_project_sprint(
    project_id: str,
    sprint_in: SprintCreate,
    db: Session = Depends(get_db)
):
    """
    Membuat sprint baru untuk project dan mengaktifkannya.
    Mendukung opsi rollover otomatis untuk task yang belum selesai dari sprint sebelumnya.
    """
    p = db.query(Project).filter(
        (Project.id == project_id) | (Project.key == project_id.upper())
    ).first()
    if not p:
        raise HTTPException(status_code=404, detail="Project not found")

    # If new sprint is active, complete any current active sprint
    if sprint_in.status == "active":
        active_sprints = db.query(Sprint).filter(
            Sprint.project_id == p.id,
            Sprint.status == "active"
        ).all()
        for s in active_sprints:
            s.status = "completed"
            s.end_date = datetime.now(timezone.utc)

    # Format sprint name automatically with "Sprint {N}: {title}" if not already starting with "Sprint"
    sprint_count = db.query(Sprint).filter(Sprint.project_id == p.id).count()
    next_sprint_num = sprint_count + 1
    raw_name = sprint_in.name.strip() if sprint_in.name else ""
    if not raw_name.lower().startswith("sprint"):
        formatted_name = f"Sprint {next_sprint_num}: {raw_name}" if raw_name else f"Sprint {next_sprint_num}"
    else:
        formatted_name = raw_name

    # Create the new sprint
    new_sprint = Sprint(
        project_id=p.id,
        name=formatted_name,
        goal=sprint_in.goal.strip() if sprint_in.goal else None,
        status=sprint_in.status or "active",
        capacity_points=sprint_in.capacity_points or 20,
    )
    db.add(new_sprint)
    db.flush()

    rollover_count = 0
    # Process rollover if specified
    if sprint_in.rollover_unfinished_from_sprint_id:
        unfinished_items = db.query(WorkItem).filter(
            WorkItem.project_id == p.id,
            WorkItem.sprint_id == sprint_in.rollover_unfinished_from_sprint_id,
            WorkItem.status.notin_(["done", "cancelled"])
        ).all()
        for item in unfinished_items:
            item.sprint_id = new_sprint.id
            rollover_count += 1

    # Record audit event
    db.add(AuditEvent(
        actor="Scrum Master",
        action="SPRINT_CREATED",
        target_type="SPRINT",
        target_id=new_sprint.id,
        project_id=p.id,
        policy_basis="SPRINT_LIFECYCLE_POLICY_V1",
        details={
            "sprint_name": new_sprint.name,
            "goal": new_sprint.goal,
            "capacity_points": new_sprint.capacity_points,
            "rollover_count": rollover_count,
            "from_sprint_id": sprint_in.rollover_unfinished_from_sprint_id
        }
    ))

    db.commit()
    db.refresh(new_sprint)

    return _build_sprint_out(new_sprint, items_count=rollover_count)

def _build_work_item_out(item: WorkItem, project_name: Optional[str] = None) -> WorkItemOut:
    subtasks_out = []
    if hasattr(item, "subtasks") and item.subtasks:
        for st in item.subtasks:
            subtasks_out.append(WorkItemSubtaskOut(
                id=st.id,
                key=st.key,
                title=st.title,
                type=st.type or "subtask",
                status=st.status,
                priority=st.priority,
                estimate_points=st.estimate_points or 1.0,
                assignee_agent_id=st.assignee_agent_id,
                assignee_name=st.assignee.name if st.assignee else None,
            ))

    return WorkItemOut(
        id=item.id,
        project_id=item.project_id,
        sprint_id=item.sprint_id,
        parent_id=item.parent_id,
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
        git_branch=item.git_branch,
        pull_request_url=item.pull_request_url,
        pull_request_number=item.pull_request_number,
        pull_request_status=item.pull_request_status or "draft",
        created_at=item.created_at,
        updated_at=item.updated_at,
        assignee_name=item.assignee.name if item.assignee else None,
        project_name=project_name or (item.project.name if item.project else None),
        subtasks=subtasks_out,
        revision_notes=item.revision_notes,
        revision_count=item.revision_count or 0,
    )

@router.get("/{project_id}/work-items", response_model=List[WorkItemOut])
def list_project_work_items(
    project_id: str,
    sprint_id: Optional[str] = Query(None),
    status_filter: Optional[str] = Query(None, alias="status"),
    type_filter: Optional[str] = Query(None, alias="type"),
    priority_filter: Optional[str] = Query(None, alias="priority"),
    db: Session = Depends(get_db)
):
    p = db.query(Project).filter(
        (Project.id == project_id) | (Project.key == project_id.upper())
    ).first()
    if not p:
        raise HTTPException(status_code=404, detail="Project not found")

    query = db.query(WorkItem).filter(WorkItem.project_id == p.id)
    if sprint_id:
        query = query.filter(WorkItem.sprint_id == sprint_id)
    if status_filter:
        query = query.filter(WorkItem.status == status_filter)
    if type_filter:
        query = query.filter(WorkItem.type == type_filter)
    if priority_filter:
        query = query.filter(WorkItem.priority == priority_filter)

    items = query.all()
    results = [_build_work_item_out(item, p.name) for item in items]
    return results

@router.post("/{project_id}/work-items", response_model=WorkItemOut, status_code=status.HTTP_201_CREATED)
def create_project_work_item(
    project_id: str,
    item_in: WorkItemCreate,
    db: Session = Depends(get_db)
):
    p = db.query(Project).filter(
        (Project.id == project_id) | (Project.key == project_id.upper())
    ).first()
    if not p:
        raise HTTPException(status_code=404, detail="Project not found")

    # Safely generate unique key without collision
    p.item_counter += 1
    generated_key = f"{p.key}-{p.item_counter}"
    while db.query(WorkItem).filter(WorkItem.key == generated_key).first():
        p.item_counter += 1
        generated_key = f"{p.key}-{p.item_counter}"

    # Clean & validate sprint_id
    sprint_id = item_in.sprint_id.strip() if item_in.sprint_id and item_in.sprint_id.strip() else None
    if sprint_id:
        sprint_exists = db.query(Sprint).filter(Sprint.id == sprint_id).first()
        if not sprint_exists:
            sprint_id = None

    # Clean & validate assignee_agent_id to avoid foreign key violations
    assignee_id = item_in.assignee_agent_id.strip() if item_in.assignee_agent_id and item_in.assignee_agent_id.strip() else None
    if assignee_id:
        agent_exists = db.query(AIAgent).filter(AIAgent.id == assignee_id).first()
        if not agent_exists:
            assignee_id = None

    # Clean parent_id if provided
    parent_id = item_in.parent_id.strip() if item_in.parent_id and item_in.parent_id.strip() else None
    if parent_id:
        parent_exists = db.query(WorkItem).filter(WorkItem.id == parent_id).first()
        if not parent_exists:
            parent_id = None

    # Determine type and git branch
    item_type = item_in.type or ("subtask" if parent_id else "task")
    git_branch_name = f"agencyos/{p.key.lower()}/{generated_key.lower()}"

    item = WorkItem(
        project_id=p.id,
        sprint_id=sprint_id,
        parent_id=parent_id,
        key=generated_key,
        type=item_type,
        title=item_in.title.strip(),
        description=item_in.description.strip() if item_in.description and item_in.description.strip() else None,
        status="backlog", # Always start in backlog
        priority=item_in.priority or "medium",
        estimate_points=item_in.estimate_points if item_in.estimate_points is not None else 1.0,
        acceptance_criteria=item_in.acceptance_criteria or [],
        definition_of_done=item_in.definition_of_done or ["Code merged", "Passing tests", "Audit review recorded"],
        assignee_agent_id=assignee_id,
        git_branch=git_branch_name,
        pull_request_status="draft",
    )
    db.add(item)
    db.flush()

    # Audit provenance for work item creation
    db.add(AuditEvent(
        actor="Agency Operator",
        action="WORK_ITEM_CREATED",
        target_type="WORK_ITEM",
        target_id=item.id,
        project_id=p.id,
        policy_basis="SCRUM_WORK_ITEM_CREATION_POLICY",
        details={"key": generated_key, "title": item.title, "type": item.type, "git_branch": git_branch_name}
    ))

    db.commit()
    db.refresh(item)

    return _build_work_item_out(item, p.name)


@router.get("/{project_id}/sprint-capacity", response_model=SprintCapacityOut)
def get_project_sprint_capacity(
    project_id: str,
    sprint_id: Optional[str] = None,
    db: Session = Depends(get_db)
):
    """
    Mengambil data kapasitas sprint, utilisasi story points, dan breakdown alokasi beban agen.
    """
    project = db.query(Project).filter(Project.id == project_id).first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found.")

    return scheduler_service.get_sprint_capacity(db, project_id, sprint_id)


class SprintStatusUpdate(BaseModel):
    status: str # active, completed, planning


@router.patch("/{project_id}/sprints/{sprint_id}/status", response_model=SprintOut)
def update_sprint_status(
    project_id: str,
    sprint_id: str,
    status_update: SprintStatusUpdate,
    db: Session = Depends(get_db)
):
    """
    Memulai (active) atau menyelesaikan (completed) sprint dengan audit trail.
    """
    sprint = db.query(Sprint).filter(
        Sprint.id == sprint_id,
        Sprint.project_id == project_id
    ).first()
    if not sprint:
        raise HTTPException(status_code=404, detail="Sprint not found in this project.")

    target_status = status_update.status.lower()
    if target_status not in ["active", "completed", "planning"]:
        raise HTTPException(status_code=400, detail="Invalid sprint status. Must be 'active', 'completed', or 'planning'.")

    # Enforce Jira/Scrum single active sprint rule
    if target_status == "active":
        other_active = db.query(Sprint).filter(
            Sprint.project_id == project_id,
            Sprint.id != sprint_id,
            Sprint.status == "active"
        ).first()
        if other_active:
            raise HTTPException(
                status_code=400,
                detail=f"Tidak dapat memulai '{sprint.name}' karena '{other_active.name}' masih berlangsung. Selesaikan sprint aktif terlebih dahulu."
            )

    prev_status = sprint.status
    sprint.status = target_status

    db.add(AuditEvent(
        actor="Scrum Master",
        action="SPRINT_STATUS_CHANGED",
        target_type="SPRINT",
        target_id=sprint.id,
        project_id=project_id,
        policy_basis="SPRINT_LIFECYCLE_POLICY_V1",
        details={
            "sprint_name": sprint.name,
            "from_status": prev_status,
            "to_status": target_status,
        }
    ))

    db.commit()
    db.refresh(sprint)

    return _build_sprint_out(sprint)


@router.get("/{project_id}/analytics/burndown", response_model=SprintBurndownOut)
def get_sprint_burndown_analytics(
    project_id: str,
    sprint_id: Optional[str] = Query(None),
    db: Session = Depends(get_db)
):
    """
    Menghitung grafik burndown sprint (garis ideal vs aktual penyelesaian SP).
    """
    return analytics_service.get_sprint_burndown(db, project_id, sprint_id)


@router.get("/{project_id}/analytics/velocity", response_model=ProjectVelocityOut)
def get_project_velocity_analytics(
    project_id: str,
    db: Session = Depends(get_db)
):
    """
    Menghitung metrik team velocity (kecepatan rata-rata penyelesaian SP antar-sprint).
    """
    return analytics_service.get_project_velocity(db, project_id)


# --- Autonomous Project Manager & Scrum Assistant Endpoints ---

class PMInstructIn(BaseModel):
    instruction: str

class SprintApproveStartIn(BaseModel):
    approved_by: Optional[str] = "Project Owner"

class SprintCompleteReviewIn(BaseModel):
    review_notes: Optional[str] = None

class WorkItemRevisionIn(BaseModel):
    revision_notes: str
    requested_by: Optional[str] = "Project Owner"


@router.post("/{project_id}/pm/auto-plan")
def auto_plan_project(
    project_id: str,
    db: Session = Depends(get_db)
):
    """
    Dewi Lestari (Technical Product Owner) auto-plans 2-3 progressive Sprints
    and detailed User Stories complete with acceptance criteria, estimates, and assignees.
    """
    try:
        return pm_assistant.auto_plan_project(project_id, db)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/{project_id}/pm/instruct")
def instruct_pm(
    project_id: str,
    payload: PMInstructIn,
    db: Session = Depends(get_db)
):
    """
    Human operator instructs Project Manager in natural language to create,
    break down, estimate, and assign new tasks/features automatically.
    """
    try:
        return pm_assistant.instruct_pm(project_id, payload.instruction, db)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/{project_id}/sprints/{sprint_id}/approve-start")
def approve_start_sprint(
    project_id: str,
    sprint_id: str,
    payload: Optional[SprintApproveStartIn] = None,
    db: Session = Depends(get_db)
):
    """
    Human-in-the-loop gate: officially approves and starts a planned sprint.
    Activates the sprint and moves its stories to 'ready' for agent execution.
    """
    approved_by = payload.approved_by if payload else "Project Owner"
    try:
        return pm_assistant.approve_start_sprint(project_id, sprint_id, approved_by, db)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/{project_id}/sprints/{sprint_id}/complete-review")
def complete_review_sprint(
    project_id: str,
    sprint_id: str,
    payload: Optional[SprintCompleteReviewIn] = None,
    db: Session = Depends(get_db)
):
    """
    Completes active sprint with AI-generated Sprint Retrospective (Went Well, Bottlenecks, Action Items).
    Transitions next sprint to 'pending_approval' or marks project as completed.
    """
    review_notes = payload.review_notes if payload else None
    try:
        return pm_assistant.complete_review_sprint(project_id, sprint_id, review_notes, db)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/{project_id}/work-items/{work_item_id}/request-revision")
def request_work_item_revision(
    project_id: str,
    work_item_id: str,
    payload: WorkItemRevisionIn,
    db: Session = Depends(get_db)
):
    """
    Human operator requests revisions on a task with feedback notes.
    Reopens task back to In Progress for agent rework without creating duplicate items.
    """
    try:
        return pm_assistant.request_work_item_revision(work_item_id, payload.revision_notes, payload.requested_by, db)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))



