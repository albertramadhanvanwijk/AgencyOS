from typing import Optional, List, Dict
from pydantic import BaseModel, ConfigDict

class BurndownDayPoint(BaseModel):
    day: int
    date: str
    ideal_remaining: float
    actual_remaining: Optional[float] = None

class BurndownAssigneeItem(BaseModel):
    agent_id: Optional[str] = None
    name: str
    role_name: Optional[str] = None
    allocated_points: float
    completed_points: float

class SprintBurndownOut(BaseModel):
    sprint_id: str
    sprint_name: str
    sprint_status: str
    sprint_goal: Optional[str] = None
    start_date: str
    end_date: str
    total_days: int
    current_day: int
    total_points: float
    completed_points: float
    remaining_points: float
    ideal_today: float
    variance: float
    health_status: str  # "ahead", "on_track", "behind"
    days: List[BurndownDayPoint]
    status_breakdown: Dict[str, int]
    assignee_breakdown: List[BurndownAssigneeItem]

class SprintVelocityItem(BaseModel):
    sprint_id: str
    name: str
    status: str
    committed_points: float
    completed_points: float
    delivery_rate: float

class ProjectVelocityOut(BaseModel):
    project_id: str
    average_velocity: float
    predictability_rate: float
    completed_sprints_count: int
    sprints: List[SprintVelocityItem]
