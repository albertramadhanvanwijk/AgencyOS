import os
from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import text
from apps.api.core.database import get_db
from apps.api.core.config import settings

router = APIRouter(tags=["Health & Status"])

@router.get("/health")
def get_health(db: Session = Depends(get_db)):
    db_healthy = False
    try:
        db.execute(text("SELECT 1"))
        db_healthy = True
    except Exception as exc:
        db_healthy = False

    overall_status = "healthy" if db_healthy else "degraded"
    
    return {
        "status": overall_status,
        "service": settings.PROJECT_NAME,
        "version": settings.VERSION,
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "database": {
            "connected": db_healthy,
            "type": "sqlite" if settings.DATABASE_URL.startswith("sqlite") else "postgresql"
        }
    }

@router.get("/system/status")
def get_system_status():
    workspace_exists = os.path.exists(settings.WORKSPACE_ROOT)
    return {
        "environment": settings.ENVIRONMENT,
        "debug": settings.DEBUG,
        "version": settings.VERSION,
        "workspace_root": settings.WORKSPACE_ROOT,
        "workspace_initialized": workspace_exists,
        "engine_adapter_default": "mock"
    }
