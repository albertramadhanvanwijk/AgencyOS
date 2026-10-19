from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from apps.api.core.database import get_db
from apps.api.schemas.prd import ProjectPRDOut, PRDApproveIn, PRDDiscoveryIn
from apps.api.services.prd_service import prd_service

router = APIRouter(prefix="/projects/{project_id}/prd", tags=["Product Requirements (PRD)"])

@router.get("", response_model=ProjectPRDOut)
def get_project_prd(
    project_id: str,
    db: Session = Depends(get_db)
):
    """
    Mengambil Dokumen Kebutuhan Produk (PRD) aktif untuk proyek.
    Jika belum ada, sistem menginisialisasi draf awal.
    """
    return prd_service.get_or_create_prd(project_id, db)


@router.get("/discovery")
def get_discovery_questions(
    project_id: str,
    db: Session = Depends(get_db)
):
    """
    Mengambil daftar pertanyaan wawancara discovery interaktif dari Dewi Lestari (PO).
    """
    return prd_service.get_discovery_questions(project_id, db)


@router.post("/generate", response_model=ProjectPRDOut)
def generate_project_prd(
    project_id: str,
    payload: Optional[PRDDiscoveryIn] = None,
    db: Session = Depends(get_db)
):
    """
    Memicu Technical Product Owner (Dewi Lestari) untuk mensintesis ide awal proyek
    dan jawaban wawancara discovery menjadi Dokumen Kebutuhan (PRD) resmi berstandar industri.
    """
    answers = [a.model_dump() for a in payload.interview_answers] if payload and payload.interview_answers else None
    return prd_service.generate_full_prd(project_id, answers, db)


@router.post("/approve", response_model=ProjectPRDOut)
def approve_project_prd(
    project_id: str,
    payload: Optional[PRDApproveIn] = None,
    db: Session = Depends(get_db)
):
    """
    Gerbang Persetujuan Manusia (Human Sign-Off Gate).
    Menyetujui dokumen PRD sebagai acuan baku yang mengunci spesifikasi sebelum Sprint dimulai.
    """
    approved_by = payload.approved_by if payload else "Project Owner"
    return prd_service.approve_prd(project_id, approved_by, db)
