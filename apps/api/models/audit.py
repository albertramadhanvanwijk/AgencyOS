import uuid
from datetime import datetime, timezone
from sqlalchemy import Column, String, Text, DateTime, JSON
from apps.api.core.database import Base

def generate_uuid():
    return str(uuid.uuid4())

class AuditEvent(Base):
    __tablename__ = "audit_events"

    id = Column(String(64), primary_key=True, default=generate_uuid)
    timestamp = Column(DateTime, default=lambda: datetime.now(timezone.utc), nullable=False)
    actor = Column(String(128), nullable=False) # e.g. "Agency Owner", "System Orchestrator"
    action = Column(String(128), nullable=False) # e.g. "CREATE_AGENT", "CHANGE_LIFECYCLE", "APPROVE_ROLE"
    target_type = Column(String(64), nullable=False) # e.g. "AGENT", "ROLE", "PROJECT", "WORK_ITEM"
    target_id = Column(String(64), nullable=False)
    project_id = Column(String(64), nullable=True) # Scoped to project when applicable
    policy_basis = Column(String(128), nullable=True) # e.g. "POL-AGENT-ACTIVATION-V1"
    details = Column(JSON, default=dict) # Redacted metadata details
