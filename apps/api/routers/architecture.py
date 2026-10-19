from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from apps.api.core.database import get_db
from apps.api.schemas.architecture import (
    ProjectArchitectureOut,
    ArchitectureGenerateIn,
    ArchitectureApproveIn
)
from apps.api.services.architecture_service import ArchitectureService

router = APIRouter(prefix="/projects/{project_id}/architecture", tags=["System Architecture & Design (TDD)"])

@router.get("", response_model=ProjectArchitectureOut)
def get_project_architecture(
    project_id: str,
    db: Session = Depends(get_db)
):
    """
    Mengambil Dokumen Arsitektur & Desain Teknis (TDD) aktif untuk proyek.
    Jika belum ada, sistem menginisialisasi draf arsitektur awal berdasarkan PRD.
    """
    return ArchitectureService.get_or_create_architecture(project_id, db)


@router.post("/generate", response_model=ProjectArchitectureOut)
def generate_project_architecture(
    project_id: str,
    payload: Optional[ArchitectureGenerateIn] = None,
    db: Session = Depends(get_db)
):
    """
    Memicu Lead System Architect untuk merancang arsitektur sistem, skema database (ERD),
    kontrak endpoint API, dan komponen modul berdasarkan dokumen PRD yang telah disepakati.
    """
    input_payload = payload or ArchitectureGenerateIn()
    return ArchitectureService.generate_architecture_from_prd(project_id, input_payload, db)


@router.post("/approve", response_model=ProjectArchitectureOut)
def approve_project_architecture(
    project_id: str,
    payload: Optional[ArchitectureApproveIn] = None,
    db: Session = Depends(get_db)
):
    """
    Gerbang Persetujuan Teknis (Human Architect Sign-Off Gate).
    Menyetujui cetak biru arsitektur dan kontrak API sebagai acuan baku
    sebelum User Story & Backlog dipecah ke dalam Sprint.
    """
    approved_by = payload.approved_by if payload else "Principal Software Architect"
    return ArchitectureService.approve_architecture(project_id, approved_by, db)
