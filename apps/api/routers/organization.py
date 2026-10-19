from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session
from apps.api.core.database import get_db
from apps.api.models import Department, JobRole, AIAgent, AuditEvent
from apps.api.schemas.organization import (
    DepartmentCreate, DepartmentOut,
    JobRoleCreate, JobRoleOut,
)

router = APIRouter(prefix="/organization", tags=["Organization & Roles"])

@router.get("/departments", response_model=List[DepartmentOut])
def list_departments(db: Session = Depends(get_db)):
    departments = db.query(Department).all()
    results = []
    for d in departments:
        out = DepartmentOut(
            id=d.id,
            name=d.name,
            code=d.code,
            description=d.description,
            created_at=d.created_at,
            roles_count=len(d.roles),
            agents_count=len(d.agents),
        )
        results.append(out)
    return results

@router.post("/departments", response_model=DepartmentOut, status_code=status.HTTP_201_CREATED)
def create_department(dept_in: DepartmentCreate, db: Session = Depends(get_db)):
    existing = db.query(Department).filter(
        (Department.name == dept_in.name) | (Department.code == dept_in.code)
    ).first()
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Department with name '{dept_in.name}' or code '{dept_in.code}' already exists."
        )

    dept = Department(
        name=dept_in.name,
        code=dept_in.code.upper(),
        description=dept_in.description
    )
    db.add(dept)
    db.commit()
    db.refresh(dept)

    # Record Audit Event
    db.add(AuditEvent(
        actor="Agency Owner",
        action="CREATE_DEPARTMENT",
        target_type="DEPARTMENT",
        target_id=dept.id,
        policy_basis="ORGANIZATION_MANAGEMENT",
        details={"name": dept.name, "code": dept.code}
    ))
    db.commit()

    return DepartmentOut(
        id=dept.id,
        name=dept.name,
        code=dept.code,
        description=dept.description,
        created_at=dept.created_at,
        roles_count=0,
        agents_count=0,
    )

@router.get("/roles", response_model=List[JobRoleOut])
def list_roles(
    department_id: Optional[str] = Query(None),
    is_official: Optional[bool] = Query(None),
    db: Session = Depends(get_db)
):
    query = db.query(JobRole)
    if department_id:
        query = query.filter(JobRole.department_id == department_id)
    if is_official is not None:
        query = query.filter(JobRole.is_official == is_official)

    roles = query.all()
    results = []
    for r in roles:
        out = JobRoleOut(
            id=r.id,
            department_id=r.department_id,
            name=r.name,
            code=r.code,
            description=r.description,
            responsibilities=r.responsibilities or [],
            skills=r.skills or [],
            capability_categories=r.capability_categories or [],
            qualification_criteria=r.qualification_criteria or [],
            is_official=r.is_official,
            version=r.version,
            created_at=r.created_at,
            department_name=r.department.name if r.department else None,
            agents_count=len(r.agents),
        )
        results.append(out)
    return results

@router.post("/roles", response_model=JobRoleOut, status_code=status.HTTP_201_CREATED)
def create_role(role_in: JobRoleCreate, db: Session = Depends(get_db)):
    dept = db.query(Department).filter(Department.id == role_in.department_id).first()
    if not dept:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Department '{role_in.department_id}' not found."
        )

    existing = db.query(JobRole).filter(JobRole.code == role_in.code).first()
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"JobRole with code '{role_in.code}' already exists."
        )

    role = JobRole(
        department_id=role_in.department_id,
        name=role_in.name,
        code=role_in.code.upper(),
        description=role_in.description,
        responsibilities=role_in.responsibilities,
        skills=role_in.skills,
        capability_categories=role_in.capability_categories,
        qualification_criteria=role_in.qualification_criteria,
        is_official=role_in.is_official,
        version=1,
    )
    db.add(role)
    db.commit()
    db.refresh(role)

    # Record Audit Event
    db.add(AuditEvent(
        actor="Agency Owner",
        action="CREATE_ROLE",
        target_type="JOB_ROLE",
        target_id=role.id,
        policy_basis="ROLE_CATALOG_MANAGEMENT",
        details={"name": role.name, "code": role.code, "is_official": role.is_official}
    ))
    db.commit()

    return JobRoleOut(
        id=role.id,
        department_id=role.department_id,
        name=role.name,
        code=role.code,
        description=role.description,
        responsibilities=role.responsibilities or [],
        skills=role.skills or [],
        capability_categories=role.capability_categories or [],
        qualification_criteria=role.qualification_criteria or [],
        is_official=role.is_official,
        version=role.version,
        created_at=role.created_at,
        department_name=dept.name,
        agents_count=0,
    )


@router.post("/sync-agency-structure")
def sync_agency_structure(db: Session = Depends(get_db)):
    """
    Synchronizes the full enterprise digital agency organizational structure
    (3 Directorates, 19 Roles, 10 Specialist Agents with verified skills).
    """
    from apps.api.core.seed import seed_enterprise_agency
    seed_enterprise_agency(db)
    return {
        "status": "success",
        "message": "Enterprise agency organization structure successfully synchronized."
    }

