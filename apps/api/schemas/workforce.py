from datetime import datetime
from typing import Optional, List, Dict, Any
from pydantic import BaseModel, ConfigDict, Field

class AgentSkillOut(BaseModel):
    id: str
    name: str
    is_verified: bool
    verified_evidence: Optional[str] = None

    model_config = ConfigDict(from_attributes=True)

class AgentProfileVersionOut(BaseModel):
    id: str
    version_number: int
    instructions: Optional[str] = None
    config_snapshot: Dict[str, Any] = Field(default_factory=dict)
    change_rationale: Optional[str] = None
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)

class AIAgentBase(BaseModel):
    name: str = Field(..., min_length=2, max_length=128)
    title: Optional[str] = None
    role_id: str
    department_id: str
    lifecycle_state: str = Field(default="draft")
    availability_state: str = Field(default="available")
    qualification_state: str = Field(default="not_tested")
    max_concurrency: int = Field(default=2, ge=1, le=10)
    engine_adapter: str = Field(default="mock")
    instructions: Optional[str] = None

class AIAgentCreate(AIAgentBase):
    initial_skills: List[str] = Field(default_factory=list)

class AIAgentUpdate(BaseModel):
    name: Optional[str] = None
    title: Optional[str] = None
    role_id: Optional[str] = None
    department_id: Optional[str] = None
    lifecycle_state: Optional[str] = None
    availability_state: Optional[str] = None
    qualification_state: Optional[str] = None
    max_concurrency: Optional[int] = None
    engine_adapter: Optional[str] = None
    instructions: Optional[str] = None
    change_rationale: Optional[str] = None

class AIAgentOut(AIAgentBase):
    id: str
    current_concurrency: int
    current_profile_version: int
    created_at: datetime
    updated_at: datetime
    role_name: Optional[str] = None
    department_name: Optional[str] = None
    skills: List[AgentSkillOut] = Field(default_factory=list)

    model_config = ConfigDict(from_attributes=True)
