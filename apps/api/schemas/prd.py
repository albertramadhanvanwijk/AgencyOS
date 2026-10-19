from typing import List, Optional, Dict, Any
from datetime import datetime
from pydantic import BaseModel, ConfigDict, Field

class TargetUserPersona(BaseModel):
    persona: str
    description: str
    needs: List[str] = Field(default_factory=list)

class UserJourney(BaseModel):
    title: str
    actor: str
    steps: List[str] = Field(default_factory=list)

class FunctionalRequirement(BaseModel):
    id: str # e.g. "FR-01"
    module: str # e.g. "Auth", "Catalog", "Checkout"
    title: str
    description: str
    priority: str = "high" # "critical", "high", "medium", "low"
    criteria: List[str] = Field(default_factory=list)

class NonFunctionalRequirement(BaseModel):
    category: str # "Performance", "Security", "Accessibility", "Reliability"
    requirement: str

class ScopeBoundaries(BaseModel):
    in_scope: List[str] = Field(default_factory=list)
    out_of_scope: List[str] = Field(default_factory=list)

class TechStackRecommendation(BaseModel):
    frontend: str = "Next.js 15 (App Router, Tailwind CSS, TypeScript)"
    backend: str = "FastAPI (Python, SQLAlchemy, Pydantic)"
    database: str = "PostgreSQL / SQLite"
    tools: List[str] = Field(default_factory=list)

class InterviewQA(BaseModel):
    question: str
    answer: str

class PRDDiscoveryIn(BaseModel):
    interview_answers: Optional[List[InterviewQA]] = None
    clarifications: Optional[str] = None

class PRDApproveIn(BaseModel):
    approved_by: Optional[str] = "Project Owner"

class ProjectPRDOut(BaseModel):
    id: str
    project_id: str
    version: int
    status: str # "draft", "in_review", "approved"
    executive_summary: Optional[str] = None
    target_users: List[TargetUserPersona] = Field(default_factory=list)
    user_journeys: List[UserJourney] = Field(default_factory=list)
    functional_requirements: List[FunctionalRequirement] = Field(default_factory=list)
    non_functional_requirements: List[NonFunctionalRequirement] = Field(default_factory=list)
    scope_boundaries: ScopeBoundaries = Field(default_factory=ScopeBoundaries)
    tech_stack_recommendation: TechStackRecommendation = Field(default_factory=TechStackRecommendation)
    interview_answers: Optional[List[InterviewQA]] = None
    approved_by: Optional[str] = None
    approved_at: Optional[datetime] = None
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)
