from datetime import datetime
from typing import Optional, List
from pydantic import BaseModel, ConfigDict, Field

class WorkItemBase(BaseModel):
    title: str = Field(..., min_length=1, max_length=256)
    description: Optional[str] = None
    type: str = Field(default="task") # epic, story, task, subtask, bug
    priority: str = Field(default="medium") # critical, high, medium, low
    estimate_points: float = Field(default=1.0, ge=0.0)
    acceptance_criteria: List[str] = Field(default_factory=list)
    definition_of_done: List[str] = Field(default_factory=list)
    assignee_agent_id: Optional[str] = None
    sprint_id: Optional[str] = None
    parent_id: Optional[str] = None
    git_branch: Optional[str] = None
    pull_request_url: Optional[str] = None
    pull_request_number: Optional[int] = None
    pull_request_status: Optional[str] = "draft"

class WorkItemCreate(WorkItemBase):
    project_id: str

class WorkItemUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    type: Optional[str] = None # epic, story, task, subtask, bug
    status: Optional[str] = None # backlog, ready, in_progress, in_review, done, blocked, cancelled
    priority: Optional[str] = None
    estimate_points: Optional[float] = None
    acceptance_criteria: Optional[List[str]] = None
    definition_of_done: Optional[List[str]] = None
    assignee_agent_id: Optional[str] = None
    sprint_id: Optional[str] = None
    parent_id: Optional[str] = None
    blocker_reason: Optional[str] = None
    git_branch: Optional[str] = None
    pull_request_url: Optional[str] = None
    pull_request_number: Optional[int] = None
    pull_request_status: Optional[str] = None

class WorkItemSubtaskOut(BaseModel):
    id: str
    key: str
    title: str
    type: str = "subtask"
    status: str
    priority: str
    estimate_points: float
    assignee_agent_id: Optional[str] = None
    assignee_name: Optional[str] = None
    model_config = ConfigDict(from_attributes=True)

class WorkItemOut(WorkItemBase):
    id: str
    project_id: str
    key: str
    status: str
    blocker_reason: Optional[str] = None
    created_at: datetime
    updated_at: datetime
    assignee_name: Optional[str] = None
    project_name: Optional[str] = None
    subtasks: List[WorkItemSubtaskOut] = Field(default_factory=list)
    revision_notes: Optional[str] = None
    revision_count: Optional[int] = 0

    model_config = ConfigDict(from_attributes=True)
