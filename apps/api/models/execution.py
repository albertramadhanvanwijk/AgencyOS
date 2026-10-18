import uuid
from datetime import datetime, timezone
from sqlalchemy import Column, String, Text, Integer, Boolean, DateTime, ForeignKey, JSON
from sqlalchemy.orm import relationship
from apps.api.core.database import Base

def generate_uuid():
    return str(uuid.uuid4())

class ExecutionRun(Base):
    __tablename__ = "execution_runs"

    id = Column(String(64), primary_key=True, default=generate_uuid)
    project_id = Column(String(64), ForeignKey("projects.id", ondelete="CASCADE"), nullable=False)
    work_item_id = Column(String(64), ForeignKey("work_items.id", ondelete="CASCADE"), nullable=False)
    agent_id = Column(String(64), ForeignKey("ai_agents.id", ondelete="SET NULL"), nullable=True)
    
    # State machine: queued -> preparing -> running -> collecting_results -> quality_checks -> review -> succeeded (or failed / cancelled)
    status = Column(String(32), default="queued", nullable=False)
    workspace_path = Column(String(512), nullable=False)
    
    # Safety & simulation provenance
    is_simulated = Column(Boolean, default=True, nullable=False)
    adapter_name = Column(String(64), default="MockEngineAdapter", nullable=False)
    
    error_message = Column(Text, nullable=True)
    started_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    completed_at = Column(DateTime, nullable=True)

    # Relationships
    project = relationship("Project")
    work_item = relationship("WorkItem")
    agent = relationship("AIAgent")
    logs = relationship("RunLog", back_populates="run", cascade="all, delete-orphan", order_by="RunLog.timestamp")
    artifacts = relationship("RunArtifact", back_populates="run", cascade="all, delete-orphan")
    quality_checks = relationship("QualityCheckResult", back_populates="run", cascade="all, delete-orphan")

class RunLog(Base):
    __tablename__ = "run_logs"

    id = Column(Integer, primary_key=True, autoincrement=True)
    run_id = Column(String(64), ForeignKey("execution_runs.id", ondelete="CASCADE"), nullable=False)
    timestamp = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    stage = Column(String(32), default="running")
    level = Column(String(16), default="INFO") # INFO, WARN, ERROR, DEBUG
    message = Column(Text, nullable=False)
    is_simulated = Column(Boolean, default=True)

    run = relationship("ExecutionRun", back_populates="logs")

class RunArtifact(Base):
    __tablename__ = "run_artifacts"

    id = Column(String(64), primary_key=True, default=generate_uuid)
    run_id = Column(String(64), ForeignKey("execution_runs.id", ondelete="CASCADE"), nullable=False)
    name = Column(String(128), nullable=False) # e.g. patch.diff, test_results.json
    artifact_type = Column(String(32), nullable=False) # diff, test_results, summary, log
    file_path = Column(String(512), nullable=False)
    size_bytes = Column(Integer, default=0)
    content_preview = Column(Text, nullable=True)
    is_simulated = Column(Boolean, default=True)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))

    run = relationship("ExecutionRun", back_populates="artifacts")

class QualityCheckResult(Base):
    __tablename__ = "quality_check_results"

    id = Column(String(64), primary_key=True, default=generate_uuid)
    run_id = Column(String(64), ForeignKey("execution_runs.id", ondelete="CASCADE"), nullable=False)
    check_name = Column(String(64), nullable=False) # LINT, UNIT_TESTS, SECURITY_SCAN, TYPECHECK
    status = Column(String(32), default="passed") # passed, failed, warning
    details = Column(JSON, default=dict)
    executed_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    is_simulated = Column(Boolean, default=True)

    run = relationship("ExecutionRun", back_populates="quality_checks")
