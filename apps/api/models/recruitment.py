import uuid
from datetime import datetime, timezone
from sqlalchemy import Column, String, Text, Float, DateTime, ForeignKey, JSON
from sqlalchemy.orm import relationship
from apps.api.core.database import Base

def generate_uuid():
    return str(uuid.uuid4())

class RecruitmentRequest(Base):
    __tablename__ = "recruitment_requests"

    id = Column(String(64), primary_key=True, default=generate_uuid)
    role_id = Column(String(64), ForeignKey("job_roles.id"), nullable=False)
    department_id = Column(String(64), ForeignKey("departments.id"), nullable=False)
    
    proposed_agent_name = Column(String(128), nullable=False)
    rationale = Column(Text, nullable=False)
    requested_by = Column(String(128), default="Agency Operator")
    required_skills = Column(JSON, default=list) # List of required skill strings
    
    # Lifecycle: draft, pending_approval, qualifying, qualified, activated, rejected
    status = Column(String(32), default="draft", nullable=False)
    
    benchmark_score = Column(Float, nullable=True) # e.g. 92.5
    qualification_run_id = Column(String(64), nullable=True)
    rejection_reason = Column(Text, nullable=True)
    policy_basis = Column(String(64), default="POL-AGENT-RECRUITMENT-V1")
    
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    updated_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))

    role = relationship("JobRole")
    department = relationship("Department")
