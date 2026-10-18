from datetime import datetime
from typing import Optional, List
from pydantic import BaseModel, ConfigDict, Field

class RecruitmentRequestCreate(BaseModel):
    role_id: str = Field(..., min_length=2, max_length=64)
    department_id: Optional[str] = None # Optional; derived from role if omitted
    proposed_agent_name: str = Field(..., min_length=2, max_length=128)
    rationale: str = Field(..., min_length=5)
    requested_by: str = Field(default="Agency Operator")
    required_skills: List[str] = Field(default_factory=list)

class RecruitmentRequestStatusUpdate(BaseModel):
    status: str = Field(..., description="Target status: draft, pending_approval, qualifying, qualified, activated, rejected")
    rejection_reason: Optional[str] = None
    approver: Optional[str] = "Agency Operator"

class RecruitmentRequestOut(BaseModel):
    id: str
    role_id: str
    department_id: str
    proposed_agent_name: str
    rationale: str
    requested_by: str
    required_skills: List[str]
    status: str
    benchmark_score: Optional[float] = None
    qualification_run_id: Optional[str] = None
    rejection_reason: Optional[str] = None
    policy_basis: str
    created_at: datetime
    updated_at: datetime
    role_name: Optional[str] = None
    department_name: Optional[str] = None

    model_config = ConfigDict(from_attributes=True)

class SkillBottleneck(BaseModel):
    skill: str
    demand_items_count: int
    active_agents_count: int
    severity: str # "low", "medium", "high", "critical"
    affected_work_items: List[str] = Field(default_factory=list)

class RecruitmentRecommendation(BaseModel):
    action: str # "RECRUIT_NEW_AGENT", "REASSIGN_EXISTING", "CAPACITY_SUFFICIENT"
    target_role_id: Optional[str] = None
    target_role_name: Optional[str] = None
    suggested_skills: List[str] = Field(default_factory=list)
    rationale: str
    confidence_score: float # 0.0 - 1.0

class DemandAnalysisOut(BaseModel):
    total_active_projects: int
    total_active_work_items: int
    unassigned_work_items: int
    total_workforce_agents: int
    active_workforce_agents: int
    bottlenecks: List[SkillBottleneck]
    recommendations: List[RecruitmentRecommendation]

class QualificationStageResult(BaseModel):
    stage_name: str
    status: str
    score: float
    weight: float
    details: dict

class QualificationScorecardOut(BaseModel):
    request_id: str
    candidate_name: str
    role_name: str
    department_name: str
    qualification_run_id: str
    workspace_path: str
    overall_score: float
    is_passed: bool
    passing_threshold: float = 80.0
    evaluated_at: datetime
    stages: List[QualificationStageResult]
    recommendation: str
    policy_basis: str

class AgentActivationApprovalIn(BaseModel):
    approver: str = Field(default="Agency Director", min_length=2)
    approval_notes: Optional[str] = None
    custom_title: Optional[str] = None
    max_concurrency: int = Field(default=2, ge=1, le=10)

class AgentActivationOut(BaseModel):
    request_id: str
    agent_id: str
    agent_name: str
    role_name: str
    department_name: str
    status: str
    benchmark_score: float
    activated_at: datetime
    policy_basis: str
    skills_count: int
