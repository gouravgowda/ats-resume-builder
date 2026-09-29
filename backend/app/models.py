"""
SQLAlchemy models — exactly mirrors PRD Section 9 data model.
"""
import uuid
from datetime import datetime
from sqlalchemy import (
    Column, String, Boolean, Integer, Float, DateTime,
    ForeignKey, Text, JSON, Enum as SAEnum
)
from sqlalchemy import UUID
from sqlalchemy.orm import relationship
from app.database import Base
import enum


class SectionType(str, enum.Enum):
    education = "education"
    experience = "experience"
    project = "project"
    skill = "skill"
    achievement = "achievement"


class User(Base):
    __tablename__ = "users"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    email = Column(String, unique=True, nullable=False, index=True)
    hashed_password = Column(String, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)
    is_active = Column(Boolean, default=True)

    resumes = relationship("Resume", back_populates="user", cascade="all, delete-orphan")


class Resume(Base):
    __tablename__ = "resumes"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    title = Column(String, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    is_tailored_copy_of = Column(UUID(as_uuid=True), ForeignKey("resumes.id"), nullable=True)

    user = relationship("User", back_populates="resumes")
    sections = relationship("ResumeSection", back_populates="resume", cascade="all, delete-orphan", order_by="ResumeSection.order_index")
    job_descriptions = relationship("JobDescription", back_populates="resume", cascade="all, delete-orphan")
    scores = relationship("Score", back_populates="resume", cascade="all, delete-orphan")
    contact = relationship("ContactInfo", back_populates="resume", uselist=False, cascade="all, delete-orphan")


class ContactInfo(Base):
    __tablename__ = "contact_info"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    resume_id = Column(UUID(as_uuid=True), ForeignKey("resumes.id"), nullable=False)
    full_name = Column(String, nullable=False)
    email = Column(String, nullable=False)
    phone = Column(String)
    city = Column(String)
    linkedin = Column(String)
    github = Column(String)
    portfolio = Column(String)

    resume = relationship("Resume", back_populates="contact")


class ResumeSection(Base):
    __tablename__ = "resume_sections"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    resume_id = Column(UUID(as_uuid=True), ForeignKey("resumes.id"), nullable=False)
    type = Column(SAEnum(SectionType), nullable=False)
    order_index = Column(Integer, nullable=False)

    resume = relationship("Resume", back_populates="sections")
    entries = relationship("ResumeEntry", back_populates="section", cascade="all, delete-orphan", order_by="ResumeEntry.order_index")


class ResumeEntry(Base):
    __tablename__ = "resume_entries"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    section_id = Column(UUID(as_uuid=True), ForeignKey("resume_sections.id"), nullable=False)
    order_index = Column(Integer, nullable=False, default=0)
    payload = Column(JSON, nullable=False)  # structured fields per type

    section = relationship("ResumeSection", back_populates="entries")
    bullets = relationship("Bullet", back_populates="entry", cascade="all, delete-orphan", order_by="Bullet.order_index")


class Bullet(Base):
    __tablename__ = "bullets"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    entry_id = Column(UUID(as_uuid=True), ForeignKey("resume_entries.id"), nullable=False)
    raw_text = Column(Text, nullable=False)
    improved_text = Column(Text, nullable=True)
    has_metric = Column(Boolean, default=False)
    order_index = Column(Integer, nullable=False, default=0)
    needs_metric_prompt = Column(Boolean, default=False)
    metric_question = Column(String, nullable=True)

    entry = relationship("ResumeEntry", back_populates="bullets")


class JobDescription(Base):
    __tablename__ = "job_descriptions"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    resume_id = Column(UUID(as_uuid=True), ForeignKey("resumes.id"), nullable=False)
    raw_text = Column(Text, nullable=False)
    extracted_keywords = Column(JSON, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    resume = relationship("Resume", back_populates="job_descriptions")
    scores = relationship("Score", back_populates="job_description")


class Score(Base):
    __tablename__ = "scores"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    resume_id = Column(UUID(as_uuid=True), ForeignKey("resumes.id"), nullable=False)
    jd_id = Column(UUID(as_uuid=True), ForeignKey("job_descriptions.id"), nullable=True)
    parse_score = Column(Float, nullable=False, default=0.0)
    keyword_score = Column(Float, nullable=False, default=0.0)
    bullet_score = Column(Float, nullable=False, default=0.0)
    completeness_score = Column(Float, nullable=False, default=0.0)
    formatting_score = Column(Float, nullable=False, default=0.0)
    total_score = Column(Float, nullable=False, default=0.0)
    breakdown = Column(JSON, nullable=True)  # per-item explanations
    computed_at = Column(DateTime, default=datetime.utcnow)

    resume = relationship("Resume", back_populates="scores")
    job_description = relationship("JobDescription", back_populates="scores")
