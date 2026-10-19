import uuid
from datetime import datetime, timezone
from sqlalchemy import Column, String, Text, Boolean, Integer, DateTime, ForeignKey, JSON
from sqlalchemy.orm import relationship
from apps.api.core.database import Base

def generate_uuid():
    return str(uuid.uuid4())

class AIAgent(Base):
    __tablename__ = "ai_agents"

    id = Column(String(64), primary_key=True, default=generate_uuid)
    name = Column(String(128), nullable=False)
    title = Column(String(128), nullable=True)
    role_id = Column(String(64), ForeignKey("job_roles.id"), nullable=False)
    department_id = Column(String(64), ForeignKey("departments.id"), nullable=False)
    
    # 3 Separate Dimensions (strictly decoupled according to specs)
    lifecycle_state = Column(String(32), default="draft") # draft, pending_approval, testing, active, paused, retired, archived
    availability_state = Column(String(32), default="available") # available, busy, capacity_limited, offline, error
    qualification_state = Column(String(32), default="not_tested") # not_tested, in_progress, passed, failed, requires_revalidation
    
    # Concurrency and Execution Settings
    max_concurrency = Column(Integer, default=2)
    current_concurrency = Column(Integer, default=0)
    engine_adapter = Column(String(64), default="mock") # mock, claude, codex, etc.
    llm_profile_id = Column(String(64), nullable=True, default=None) # References configured LLM profile in storage/llm_configs.json
    llm_model = Column(String(64), nullable=True, default=None) # Explicit model override (or None to inherit from profile/default)
    
    # System Instructions / Persona
    instructions = Column(Text, nullable=True)
    current_profile_version = Column(Integer, default=1)
    
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    updated_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))

    department = relationship("Department", back_populates="agents")
    role = relationship("JobRole", back_populates="agents")
    profile_versions = relationship("AgentProfileVersion", back_populates="agent", cascade="all, delete-orphan")
    skills = relationship("AgentSkill", back_populates="agent", cascade="all, delete-orphan")

class AgentProfileVersion(Base):
    __tablename__ = "agent_profile_versions"

    id = Column(String(64), primary_key=True, default=generate_uuid)
    agent_id = Column(String(64), ForeignKey("ai_agents.id", ondelete="CASCADE"), nullable=False)
    version_number = Column(Integer, nullable=False)
    instructions = Column(Text, nullable=True)
    config_snapshot = Column(JSON, default=dict)
    change_rationale = Column(Text, nullable=True)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))

    agent = relationship("AIAgent", back_populates="profile_versions")

class AgentSkill(Base):
    __tablename__ = "agent_skills"

    id = Column(String(64), primary_key=True, default=generate_uuid)
    agent_id = Column(String(64), ForeignKey("ai_agents.id", ondelete="CASCADE"), nullable=False)
    name = Column(String(128), nullable=False)
    is_verified = Column(Boolean, default=False)
    verified_evidence = Column(Text, nullable=True)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))

    agent = relationship("AIAgent", back_populates="skills")
