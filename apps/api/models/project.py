import uuid
from datetime import datetime, timezone
from sqlalchemy import Column, String, Text, Integer, DateTime, ForeignKey, JSON
from sqlalchemy.orm import relationship
from apps.api.core.database import Base

def generate_uuid():
    return str(uuid.uuid4())

class Project(Base):
    __tablename__ = "projects"

    id = Column(String(64), primary_key=True, default=generate_uuid)
    name = Column(String(128), nullable=False)
    key = Column(String(16), nullable=False, unique=True) # e.g. "PRJ-CORE"
    goal = Column(Text, nullable=True)
    status = Column(String(32), default="active") # planning, active, paused, completed
    workspace_path = Column(String(256), nullable=False) # e.g. "workspaces/prj-core"
    
    item_counter = Column(Integer, default=0) # Auto-incrementing counter for work item keys
    
    # GitHub Integration
    github_repo_url = Column(String(256), nullable=True) # e.g. "https://github.com/user/repo"
    github_repo_name = Column(String(128), nullable=True) # e.g. "user/repo"
    github_repo_mode = Column(String(32), default="local") # "auto_create", "existing", "local"
    github_branch = Column(String(64), default="main")

    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))

    sprints = relationship("Sprint", back_populates="project", cascade="all, delete-orphan")
    work_items = relationship("WorkItem", back_populates="project", cascade="all, delete-orphan")
    prd = relationship("ProjectPRD", back_populates="project", uselist=False, cascade="all, delete-orphan")

class Sprint(Base):
    __tablename__ = "sprints"

    id = Column(String(64), primary_key=True, default=generate_uuid)
    project_id = Column(String(64), ForeignKey("projects.id", ondelete="CASCADE"), nullable=False)
    name = Column(String(128), nullable=False) # e.g. "Sprint 1: Foundation"
    goal = Column(Text, nullable=True)
    status = Column(String(32), default="active") # planning, active, completed
    start_date = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    end_date = Column(DateTime, nullable=True)
    capacity_points = Column(Integer, default=20)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))

    # Scrum Evaluation & Retrospective
    retrospective = Column(JSON, nullable=True) # {"went_well": [...], "bottlenecks": [...], "action_items": [...]}
    review_notes = Column(Text, nullable=True)
    approved_by = Column(String(128), nullable=True)
    approved_at = Column(DateTime, nullable=True)

    project = relationship("Project", back_populates="sprints")
    work_items = relationship("WorkItem", back_populates="sprint")


class ProjectPRD(Base):
    """
    Formal Product Requirement Document (PRD) / Software Requirement Specification.
    Acts as the baseline requirement document formulated by Technical Product Owner Dewi Lestari
    and approved by the Project Owner before Sprints, Design, and Engineering can commence.
    """
    __tablename__ = "project_prds"

    id = Column(String(64), primary_key=True, default=generate_uuid)
    project_id = Column(String(64), ForeignKey("projects.id", ondelete="CASCADE"), nullable=False, unique=True)
    version = Column(Integer, default=1)
    status = Column(String(32), default="draft") # "draft", "in_review", "approved"

    # Core Document Sections
    executive_summary = Column(Text, nullable=True)
    target_users = Column(JSON, default=list) # [{"persona": "...", "description": "...", "needs": [...]}]
    user_journeys = Column(JSON, default=list) # [{"title": "...", "actor": "...", "steps": [...]}]
    functional_requirements = Column(JSON, default=list) # [{"id": "FR-01", "module": "...", "title": "...", "description": "...", "priority": "high", "criteria": [...]}]
    non_functional_requirements = Column(JSON, default=list) # [{"category": "Security|Performance|Accessibility", "requirement": "..."}]
    scope_boundaries = Column(JSON, default=dict) # {"in_scope": [...], "out_of_scope": [...]}
    tech_stack_recommendation = Column(JSON, default=dict) # {"frontend": "...", "backend": "...", "database": "...", "tools": [...]}
    
    # Discovery Q&A History
    interview_answers = Column(JSON, nullable=True) # [{"question": "...", "answer": "..."}]

    # Human Sign-Off Gate
    approved_by = Column(String(128), nullable=True)
    approved_at = Column(DateTime, nullable=True)

    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    updated_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))

    project = relationship("Project", back_populates="prd")
