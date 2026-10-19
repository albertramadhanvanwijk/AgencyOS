from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from pydantic import BaseModel, ConfigDict
from datetime import datetime

from apps.api.core.database import get_db
from apps.api.models.project import Project
from apps.api.models.scrum import WorkItem
from apps.api.models.execution import ExecutionRun, RunLog, RunArtifact, QualityCheckResult
from apps.api.models.audit import AuditEvent
from apps.api.services.workspace_manager import workspace_manager
from apps.api.adapters.registry import get_adapter

router = APIRouter(tags=["Execution Runs"])

# --- Pydantic Schemas ---

class RunLogOut(BaseModel):
    id: int
    run_id: str
    timestamp: datetime
    stage: str
    level: str
    message: str
    is_simulated: bool

    model_config = ConfigDict(from_attributes=True)

class RunArtifactOut(BaseModel):
    id: str
    run_id: str
    name: str
    artifact_type: str
    file_path: str
    size_bytes: int
    content_preview: Optional[str]
    is_simulated: bool
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)

class QualityCheckResultOut(BaseModel):
    id: str
    run_id: str
    check_name: str
    status: str
    details: dict
    executed_at: datetime
    is_simulated: bool

    model_config = ConfigDict(from_attributes=True)

class ExecutionRunOut(BaseModel):
    id: str
    project_id: str
    work_item_id: str
    agent_id: Optional[str]
    status: str
    workspace_path: str
    is_simulated: bool
    adapter_name: str
    error_message: Optional[str]
    started_at: datetime
    completed_at: Optional[datetime]

    model_config = ConfigDict(from_attributes=True)


# --- Endpoints ---

@router.post(
    "/projects/{project_id}/work-items/{work_item_id}/runs",
    response_model=ExecutionRunOut,
    status_code=status.HTTP_201_CREATED
)
def trigger_execution_run(
    project_id: str,
    work_item_id: str,
    adapter_name: Optional[str] = None,
    db: Session = Depends(get_db)
):
    """
    Triggers an execution run for a work item using the selected EngineAdapter
    (defaulting to settings.DEFAULT_ENGINE_ADAPTER or MockEngineAdapter).
    Validates work item readiness, allocates isolated run workspace,
    executes run, records logs/artifacts, and transitions state.
    """
    # 1. Validate Project & Work Item
    project = db.query(Project).filter(Project.id == project_id).first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found.")

    work_item = db.query(WorkItem).filter(
        WorkItem.id == work_item_id,
        WorkItem.project_id == project_id
    ).first()
    if not work_item:
        raise HTTPException(status_code=404, detail="Work item not found in this project.")

    # 2. State Machine Validation: Item must not be in Backlog without criteria
    if work_item.status == "backlog":
        raise HTTPException(
            status_code=400,
            detail="Cannot execute work item in 'backlog'. Move item to 'ready' or 'in_progress' first."
        )

    # 3. If item is in 'ready', transition it to 'in_progress'
    if work_item.status == "ready":
        work_item.status = "in_progress"

    # 4. Resolve Adapter & Create Run Record
    if not adapter_name:
        from apps.api.adapters.live_adapter import live_adapter
        if work_item.assignee_agent_id:
            from apps.api.models.workforce import AIAgent
            agent = db.query(AIAgent).filter(AIAgent.id == work_item.assignee_agent_id).first()
            if agent:
                if agent.engine_adapter:
                    adapter_name = agent.engine_adapter
                elif agent.llm_profile_id and agent.llm_profile_id in live_adapter._llm_configs:
                    prof = live_adapter._llm_configs[agent.llm_profile_id]
                    if prof.get("api_key") or "localhost" in (prof.get("base_url") or "") or "127.0.0.1" in (prof.get("base_url") or ""):
                        adapter_name = "LiveLLMEngineAdapter"
        if not adapter_name:
            active_key = live_adapter.api_key
            active_url = live_adapter.base_url or ""
            if active_key or ("localhost" in active_url or "127.0.0.1" in active_url):
                adapter_name = "LiveLLMEngineAdapter"

    adapter = get_adapter(adapter_name)

    run = ExecutionRun(
        project_id=project_id,
        work_item_id=work_item_id,
        agent_id=work_item.assignee_agent_id,
        status="queued",
        workspace_path="",
        is_simulated=adapter.is_simulated,
        adapter_name=adapter.adapter_name
    )
    db.add(run)
    db.flush()

    run_workspace = workspace_manager.create_run_workspace(project_id, run.id)
    run.workspace_path = str(run_workspace)
    db.commit()

    # 5. Audit Log: Run Triggered
    db.add(AuditEvent(
        actor="Agency Operator",
        action="EXECUTION_RUN_TRIGGERED",
        target_type="EXECUTION_RUN",
        target_id=run.id,
        project_id=project_id,
        details={
            "work_item_key": work_item.key,
            "adapter": adapter.adapter_name,
            "is_simulated": adapter.is_simulated,
            "workspace_path": str(run_workspace)
        }
    ))
    db.commit()

    # 6. Execute Run through Selected Engine Adapter
    completed_run = adapter.execute_run(run, work_item, run_workspace, db)

    # 7. Advance Work Item to In Review if run completed successfully
    if completed_run.status in ["review", "succeeded"]:
        work_item.status = "in_review"
        db.add(AuditEvent(
            actor=adapter.adapter_name,
            action="WORK_ITEM_STATUS_TRANSITION",
            target_type="WORK_ITEM",
            target_id=work_item.id,
            project_id=project_id,
            details={
                "key": work_item.key,
                "from_status": "in_progress",
                "to_status": "in_review",
                "trigger": "EXECUTION_RUN_COMPLETED"
            }
        ))
        db.commit()

    return completed_run

@router.get("/projects/{project_id}/runs", response_model=List[ExecutionRunOut])
def list_project_runs(project_id: str, db: Session = Depends(get_db)):
    """Lists all execution runs for a project."""
    return db.query(ExecutionRun).filter(ExecutionRun.project_id == project_id).order_by(ExecutionRun.started_at.desc()).all()

@router.get("/work-items/{work_item_id}/runs", response_model=List[ExecutionRunOut])
def list_work_item_runs(work_item_id: str, db: Session = Depends(get_db)):
    """Lists all execution runs for a specific work item."""
    return db.query(ExecutionRun).filter(ExecutionRun.work_item_id == work_item_id).order_by(ExecutionRun.started_at.desc()).all()

@router.get("/runs/{run_id}", response_model=ExecutionRunOut)
def get_run(run_id: str, db: Session = Depends(get_db)):
    """Gets execution run details."""
    run = db.query(ExecutionRun).filter(ExecutionRun.id == run_id).first()
    if not run:
        raise HTTPException(status_code=404, detail="Execution run not found.")
    return run

@router.get("/runs/{run_id}/logs", response_model=List[RunLogOut])
def get_run_logs(run_id: str, db: Session = Depends(get_db)):
    """Gets timeline logs for an execution run."""
    run = db.query(ExecutionRun).filter(ExecutionRun.id == run_id).first()
    if not run:
        raise HTTPException(status_code=404, detail="Execution run not found.")
    return db.query(RunLog).filter(RunLog.run_id == run_id).order_by(RunLog.id.asc()).all()

@router.get("/runs/{run_id}/artifacts", response_model=List[RunArtifactOut])
def get_run_artifacts(run_id: str, db: Session = Depends(get_db)):
    """Gets generated artifacts for an execution run."""
    run = db.query(ExecutionRun).filter(ExecutionRun.id == run_id).first()
    if not run:
        raise HTTPException(status_code=404, detail="Execution run not found.")
    return db.query(RunArtifact).filter(RunArtifact.run_id == run_id).order_by(RunArtifact.created_at.asc()).all()

@router.get("/runs/{run_id}/quality-checks", response_model=List[QualityCheckResultOut])
def get_run_quality_checks(run_id: str, db: Session = Depends(get_db)):
    """Gets quality check results for an execution run."""
    run = db.query(ExecutionRun).filter(ExecutionRun.id == run_id).first()
    if not run:
        raise HTTPException(status_code=404, detail="Execution run not found.")
    return db.query(QualityCheckResult).filter(QualityCheckResult.run_id == run_id).order_by(QualityCheckResult.executed_at.asc()).all()

@router.post("/runs/{run_id}/cancel", response_model=ExecutionRunOut)
def cancel_execution_run(run_id: str, db: Session = Depends(get_db)):
    """Cancels an execution run."""
    run = db.query(ExecutionRun).filter(ExecutionRun.id == run_id).first()
    if not run:
        raise HTTPException(status_code=404, detail="Execution run not found.")
    adapter = get_adapter(run.adapter_name)
    adapter.cancel_run(run, db)
    return run
