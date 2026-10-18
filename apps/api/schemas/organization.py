from datetime import datetime
from typing import Optional, List
from pydantic import BaseModel, ConfigDict, Field

class DepartmentBase(BaseModel):
    name: str = Field(..., min_length=2, max_length=128)
    code: str = Field(..., min_length=2, max_length=32)
    description: Optional[str] = None

class DepartmentCreate(DepartmentBase):
    pass

class DepartmentOut(DepartmentBase):
    id: str
    created_at: datetime
    roles_count: Optional[int] = 0
    agents_count: Optional[int] = 0

    model_config = ConfigDict(from_attributes=True)

class JobRoleBase(BaseModel):
    name: str = Field(..., min_length=2, max_length=128)
    code: str = Field(..., min_length=2, max_length=64)
    department_id: str
    description: Optional[str] = None
    responsibilities: List[str] = Field(default_factory=list)
    skills: List[str] = Field(default_factory=list)
    capability_categories: List[str] = Field(default_factory=list)
    qualification_criteria: List[str] = Field(default_factory=list)
    is_official: bool = True

class JobRoleCreate(JobRoleBase):
    pass

class JobRoleOut(JobRoleBase):
    id: str
    version: int
    created_at: datetime
    department_name: Optional[str] = None
    agents_count: Optional[int] = 0

    model_config = ConfigDict(from_attributes=True)
