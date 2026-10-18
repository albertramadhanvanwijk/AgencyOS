import uuid
from datetime import datetime, timezone
from sqlalchemy import Column, String, Text, Boolean, Integer, DateTime, ForeignKey, JSON
from sqlalchemy.orm import relationship
from apps.api.core.database import Base

def generate_uuid():
    return str(uuid.uuid4())

class Department(Base):
    __tablename__ = "departments"

    id = Column(String(64), primary_key=True, default=generate_uuid)
    name = Column(String(128), nullable=False, unique=True)
    code = Column(String(32), nullable=False, unique=True)
    description = Column(Text, nullable=True)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))

    roles = relationship("JobRole", back_populates="department", cascade="all, delete-orphan")
    agents = relationship("AIAgent", back_populates="department")

class JobRole(Base):
    __tablename__ = "job_roles"

    id = Column(String(64), primary_key=True, default=generate_uuid)
    department_id = Column(String(64), ForeignKey("departments.id", ondelete="CASCADE"), nullable=False)
    name = Column(String(128), nullable=False)
    code = Column(String(64), nullable=False, unique=True)
    description = Column(Text, nullable=True)
    responsibilities = Column(JSON, default=list) # List of strings
    skills = Column(JSON, default=list) # List of strings
    capability_categories = Column(JSON, default=list) # List of strings (e.g. "code", "review", "design")
    qualification_criteria = Column(JSON, default=list) # List of criteria checks
    is_official = Column(Boolean, default=True) # AI-proposed roles must be approved by human to be official
    version = Column(Integer, default=1)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))

    department = relationship("Department", back_populates="roles")
    agents = relationship("AIAgent", back_populates="role")
