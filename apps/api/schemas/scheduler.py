from typing import List, Optional
from pydantic import BaseModel, ConfigDict, Field

class AgentRecommendationOut(BaseModel):
    agent_id: str
    name: str
    role_name: str
    department_name: str
    match_score: int = Field(..., ge=0, le=100)
    qualification_state: str
    current_concurrency: int
    max_concurrency: int
    matched_skills: List[str]
    rationale: str
    is_recommended: bool

    model_config = ConfigDict(from_attributes=True)

class AgentCapacityItem(BaseModel):
    agent_id: str
    name: str
    role_name: str
    department_name: str
    assigned_items_count: int
    assigned_points: float
    current_concurrency: int
    max_concurrency: int

    model_config = ConfigDict(from_attributes=True)

class SprintCapacityOut(BaseModel):
    sprint_id: Optional[str] = None
    sprint_name: Optional[str] = None
    sprint_status: Optional[str] = None
    total_capacity_points: float
    allocated_points: float
    completed_points: float
    utilization_rate: float
    agent_allocations: List[AgentCapacityItem]

    model_config = ConfigDict(from_attributes=True)

class AssignAgentRequest(BaseModel):
    agent_id: str
    actor: Optional[str] = "Scrum Master"
    rationale: Optional[str] = None
