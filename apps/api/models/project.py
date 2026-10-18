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
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))

    sprints = relationship("Sprint", back_populates="project", cascade="all, delete-orphan")
    work_items = relationship("WorkItem", back_populates="project", cascade="all, delete-orphan")

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

    project = relationship("Project", back_populates="sprints")
    work_items = relationship("WorkItem", back_populates="sprint")
