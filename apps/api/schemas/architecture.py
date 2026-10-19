from typing import List, Optional, Dict, Any
from datetime import datetime
from pydantic import BaseModel, ConfigDict, Field

class DatabaseFieldSpec(BaseModel):
    name: str
    type: str  # "String", "Integer", "UUID", "DateTime", "JSON", "Boolean"
    constraints: str = ""  # "PK, nullable=False", "FK -> users.id", "Unique"
    description: str = ""

class DatabaseEntitySpec(BaseModel):
    name: str
    table_name: str
    description: str
    fields: List[DatabaseFieldSpec] = Field(default_factory=list)
    relationships: List[str] = Field(default_factory=list)

class ApiEndpointSpec(BaseModel):
    module: str
    method: str  # "GET", "POST", "PUT", "PATCH", "DELETE"
    path: str
    description: str
    request_body: Optional[str] = None
    response_body: Optional[str] = None
    auth_required: bool = True

class ComponentModuleSpec(BaseModel):
    name: str
    type: str  # "frontend", "backend", "service", "worker"
    responsibilities: List[str] = Field(default_factory=list)
    dependencies: List[str] = Field(default_factory=list)

class SecuritySpec(BaseModel):
    category: str  # "Authentication", "Authorization", "Data Protection", "API Protection"
    mechanism: str
    description: str

class TechStackSpec(BaseModel):
    frontend: str = "Next.js 15 (React, Tailwind CSS, TypeScript)"
    backend: str = "FastAPI (Python, SQLAlchemy, Pydantic)"
    database: str = "PostgreSQL / SQLite"
    caching: str = "Redis (Session & Fast In-Memory Cache)"
    ci_cd: str = "GitHub Actions (Lint, Pytest, Next Build)"
    tools: List[str] = Field(default_factory=list)

class ArchitectureGenerateIn(BaseModel):
    custom_notes: Optional[str] = None
    focus_modules: Optional[List[str]] = None

class ArchitectureApproveIn(BaseModel):
    approved_by: Optional[str] = "Principal System Architect"

class ProjectArchitectureOut(BaseModel):
    id: str
    project_id: str
    version: int
    status: str  # "draft", "in_review", "approved"
    system_overview: Optional[str] = None
    tech_stack: TechStackSpec = Field(default_factory=TechStackSpec)
    database_entities: List[DatabaseEntitySpec] = Field(default_factory=list)
    api_endpoints: List[ApiEndpointSpec] = Field(default_factory=list)
    component_modules: List[ComponentModuleSpec] = Field(default_factory=list)
    security_specs: List[SecuritySpec] = Field(default_factory=list)
    data_flow_diagram: Optional[str] = None
    approved_by: Optional[str] = None
    approved_at: Optional[datetime] = None
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)
