import os
from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import text
from apps.api.core.database import get_db
from apps.api.core.config import settings

from typing import Optional, List, Dict, Any
from pydantic import BaseModel
from apps.api.adapters.registry import list_adapters_info, get_adapter, ADAPTERS
from apps.api.adapters.live_adapter import live_adapter

router = APIRouter(tags=["Health & Status"])

class TestConnectionIn(BaseModel):
    api_key: Optional[str] = None
    base_url: Optional[str] = None
    model: Optional[str] = None

class ConfigureAdapterIn(BaseModel):
    api_key: Optional[str] = None
    base_url: Optional[str] = None
    model: Optional[str] = None
    default_adapter: Optional[str] = None

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
        "engine_adapter_default": settings.DEFAULT_ENGINE_ADAPTER
    }

@router.get("/system/adapters")
def get_system_adapters():
    """Returns list of registered engine adapters with live health checks and capabilities."""
    return list_adapters_info()

@router.post("/system/adapters/test-connection")
def test_adapter_connection(payload: TestConnectionIn):
    """
    Tests connectivity to an LLM provider endpoint.
    Follows honesty rule: returns 'verified', 'not_configured', or 'error'.
    """
    return live_adapter.health_check(
        api_key=payload.api_key,
        base_url=payload.base_url,
        model=payload.model
    )

@router.post("/system/adapters/configure")
def configure_adapter(payload: ConfigureAdapterIn):
    """
    Updates runtime configuration for LiveLLMEngineAdapter and default adapter choice.
    API keys are kept in-memory and not stored in plaintext logs.
    """
    live_adapter.set_config(
        api_key=payload.api_key,
        base_url=payload.base_url,
        model=payload.model
    )
    if payload.default_adapter:
        settings.DEFAULT_ENGINE_ADAPTER = payload.default_adapter

    return {
        "status": "ok",
        "message": "Engine adapter configuration updated successfully.",
        "adapters": list_adapters_info()
    }
