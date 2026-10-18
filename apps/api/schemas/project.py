from datetime import datetime
from typing import Optional, List
from pydantic import BaseModel, ConfigDict, Field

class ProjectBase(BaseModel):
    name: str = Field(..., min_length=2, max_length=128)
    key: str = Field(..., min_length=2, max_length=16) # e.g. "PRJ-EVAL"
    goal: Optional[str] = None
    status: str = Field(default="active")
    workspace_path: Optional[str] = None

class ProjectCreate(ProjectBase):
    pass

class ProjectOut(ProjectBase):
    id: str
    item_counter: int
    created_at: datetime
    active_sprint_name: Optional[str] = None
    total_items: Optional[int] = 0
    done_items: Optional[int] = 0

    model_config = ConfigDict(from_attributes=True)

class SprintBase(BaseModel):
    name: str = Field(..., min_length=2, max_length=128)
    goal: Optional[str] = None
    status: str = Field(default="active")
    capacity_points: int = Field(default=20, ge=1)

class SprintCreate(SprintBase):
    project_id: str

class SprintOut(SprintBase):
    id: str
    project_id: str
    start_date: datetime
    end_date: Optional[datetime] = None
    created_at: datetime
    items_count: Optional[int] = 0

    model_config = ConfigDict(from_attributes=True)
