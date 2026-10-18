import os
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session
from apps.api.core.database import get_db
from apps.api.core.config import settings
from apps.api.models import Project, Sprint, WorkItem, AuditEvent
from apps.api.schemas.project import ProjectCreate, ProjectOut, SprintCreate, SprintOut
from apps.api.schemas.scrum import WorkItemCreate, WorkItemOut

router = APIRouter(prefix="/projects", tags=["Projects & Workspaces"])

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

    proj = Project(
        name=proj_in.name.strip(),
        key=key_clean,
        goal=proj_in.goal,
        status=proj_in.status,
        workspace_path=workspace_rel,
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
        details={"name": proj.name, "key": proj.key, "workspace": workspace_rel}
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
        item_counter=p.item_counter,
        created_at=p.created_at,
        active_sprint_name=active_sprint,
        total_items=total_items,
        done_items=done_items,
    )

@router.get("/{project_id}/sprints", response_model=List[SprintOut])
def list_project_sprints(project_id: str, db: Session = Depends(get_db)):
    p = db.query(Project).filter(
        (Project.id == project_id) | (Project.key == project_id.upper())
    ).first()
    if not p:
        raise HTTPException(status_code=404, detail="Project not found")

    sprints = db.query(Sprint).filter(Sprint.project_id == p.id).all()
    results = []
    for s in sprints:
        results.append(SprintOut(
            id=s.id,
            project_id=s.project_id,
            name=s.name,
            goal=s.goal,
            status=s.status,
            capacity_points=s.capacity_points,
            start_date=s.start_date,
            end_date=s.end_date,
            created_at=s.created_at,
            items_count=len(s.work_items),
        ))
    return results

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
    results = []
    for item in items:
        results.append(WorkItemOut(
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
            project_name=p.name,
        ))
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

    # Increment counter and generate key
    p.item_counter += 1
    generated_key = f"{p.key}-{p.item_counter}"

    # Default to project active sprint if not specified
    sprint_id = item_in.sprint_id
    if not sprint_id:
        active_sprint = next((s for s in p.sprints if s.status == "active"), None)
        if active_sprint:
            sprint_id = active_sprint.id

    item = WorkItem(
        project_id=p.id,
        sprint_id=sprint_id,
        key=generated_key,
        type=item_in.type,
        title=item_in.title.strip(),
        description=item_in.description,
        status="backlog", # Always start in backlog
        priority=item_in.priority,
        estimate_points=item_in.estimate_points,
        acceptance_criteria=item_in.acceptance_criteria,
        definition_of_done=item_in.definition_of_done,
        assignee_agent_id=item_in.assignee_agent_id,
    )
    db.add(item)
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
        project_name=p.name,
    )
