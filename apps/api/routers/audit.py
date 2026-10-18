from typing import List, Optional
from datetime import datetime
from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from pydantic import BaseModel, ConfigDict

from apps.api.core.database import get_db
from apps.api.models.audit import AuditEvent

router = APIRouter(prefix="/audit-events", tags=["Audit & Governance"])

class AuditEventOut(BaseModel):
    id: str
    timestamp: datetime
    actor: str
    action: str
    target_type: str
    target_id: str
    project_id: Optional[str]
    policy_basis: Optional[str]
    details: dict

    model_config = ConfigDict(from_attributes=True)

@router.get("", response_model=List[AuditEventOut])
def list_audit_events(
    project_id: Optional[str] = Query(None, description="Filter by project ID"),
    target_type: Optional[str] = Query(None, description="Filter by target type (e.g. WORK_ITEM, EXECUTION_RUN)"),
    action: Optional[str] = Query(None, description="Filter by action name"),
    limit: int = Query(100, ge=1, le=500),
    offset: int = Query(0, ge=0),
    db: Session = Depends(get_db)
):
    """
    Returns an immutable provenance trail of consequential state transitions,
    governance approvals, and execution run completions.
    """
    query = db.query(AuditEvent)

    if project_id:
        query = query.filter(AuditEvent.project_id == project_id)
    if target_type:
        query = query.filter(AuditEvent.target_type == target_type)
    if action:
        query = query.filter(AuditEvent.action == action)

    return query.order_by(AuditEvent.timestamp.desc()).offset(offset).limit(limit).all()

@router.get("/{event_id}", response_model=AuditEventOut)
def get_audit_event(event_id: str, db: Session = Depends(get_db)):
    """Fetches details for a single audit event."""
    event = db.query(AuditEvent).filter(AuditEvent.id == event_id).first()
    if not event:
        from fastapi import HTTPException
        raise HTTPException(status_code=404, detail="Audit event not found.")
    return event
