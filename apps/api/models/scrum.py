import uuid
from datetime import datetime, timezone
from sqlalchemy import Column, String, Text, Integer, Float, DateTime, ForeignKey, JSON
from sqlalchemy.orm import relationship
from apps.api.core.database import Base

def generate_uuid():
    return str(uuid.uuid4())

class WorkItem(Base):
    __tablename__ = "work_items"

    id = Column(String(64), primary_key=True, default=generate_uuid)
    project_id = Column(String(64), ForeignKey("projects.id", ondelete="CASCADE"), nullable=False)
    sprint_id = Column(String(64), ForeignKey("sprints.id", ondelete="SET NULL"), nullable=True)
    key = Column(String(32), nullable=False, unique=True) # e.g. "PRJ-CORE-1"
    
    type = Column(String(32), default="task") # epic, story, task, subtask, bug
    title = Column(String(256), nullable=False)
    description = Column(Text, nullable=True)
    
    # State Machine: backlog -> ready -> in_progress -> in_review -> done (or blocked / cancelled)
    status = Column(String(32), default="backlog")
    priority = Column(String(32), default="medium") # critical, high, medium, low
    estimate_points = Column(Float, default=1.0)
    
    # Verification criteria
    acceptance_criteria = Column(JSON, default=list) # List of criterion strings
    definition_of_done = Column(JSON, default=list) # List of DoD checks
    
    assignee_agent_id = Column(String(64), ForeignKey("ai_agents.id", ondelete="SET NULL"), nullable=True)
    blocker_reason = Column(Text, nullable=True)
    
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    updated_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))

    project = relationship("Project", back_populates="work_items")
    sprint = relationship("Sprint", back_populates="work_items")
    assignee = relationship("AIAgent")

class WorkItemDependency(Base):
    __tablename__ = "work_item_dependencies"

    id = Column(String(64), primary_key=True, default=generate_uuid)
    work_item_id = Column(String(64), ForeignKey("work_items.id", ondelete="CASCADE"), nullable=False)
    depends_on_item_id = Column(String(64), ForeignKey("work_items.id", ondelete="CASCADE"), nullable=False)
    dependency_type = Column(String(32), default="blocks") # blocks, relates_to
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
