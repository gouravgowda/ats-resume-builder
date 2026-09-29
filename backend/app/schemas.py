"""
Pydantic schemas for all API request/response models.
"""
from __future__ import annotations
from typing import Optional, List, Any
from uuid import UUID
from datetime import datetime
from pydantic import BaseModel, EmailStr, field_validator
import enum


# ─────────────────────── Enums ────────────────────────
class SectionTypeEnum(str, enum.Enum):
    education = "education"
    experience = "experience"
    project = "project"
    skill = "skill"
    achievement = "achievement"


# ─────────────────────── Auth ────────────────────────
class UserCreate(BaseModel):
    email: EmailStr
    password: str


class UserOut(BaseModel):
    id: UUID
    email: EmailStr
    created_at: datetime

    class Config:
        from_attributes = True


class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"


# ─────────────────────── Contact ────────────────────────
class ContactInfoCreate(BaseModel):
    full_name: str
    email: EmailStr
    phone: Optional[str] = None
    city: Optional[str] = None
    linkedin: Optional[str] = None
    github: Optional[str] = None
    portfolio: Optional[str] = None


class ContactInfoOut(ContactInfoCreate):
    id: UUID
    resume_id: UUID

    class Config:
        from_attributes = True


# ─────────────────────── Bullet ────────────────────────
class BulletCreate(BaseModel):
    raw_text: str
    order_index: int = 0


class BulletImproveRequest(BaseModel):
    raw_text: str
    context: Optional[str] = None  # role/company/project name for context


class BulletImproveResponse(BaseModel):
    improved_text: Optional[str]
    has_metric: bool
    needs_metric_prompt: bool
    metric_question: Optional[str]
    flags: List[str]  # passive voice, filler words, etc.


class BulletOut(BaseModel):
    id: UUID
    raw_text: str
    improved_text: Optional[str]
    has_metric: bool
    order_index: int
    needs_metric_prompt: bool
    metric_question: Optional[str]

    class Config:
        from_attributes = True


# ─────────────────────── Resume Entry ────────────────────────
class ResumeEntryCreate(BaseModel):
    order_index: int = 0
    payload: dict  # type-specific structured fields
    bullets: List[BulletCreate] = []


class ResumeEntryOut(BaseModel):
    id: UUID
    order_index: int
    payload: dict
    bullets: List[BulletOut] = []

    class Config:
        from_attributes = True


# ─────────────────────── Resume Section ────────────────────────
class ResumeSectionCreate(BaseModel):
    type: SectionTypeEnum
    order_index: int
    entries: List[ResumeEntryCreate] = []


class ResumeSectionOut(BaseModel):
    id: UUID
    type: SectionTypeEnum
    order_index: int
    entries: List[ResumeEntryOut] = []

    class Config:
        from_attributes = True


# ─────────────────────── Resume ────────────────────────
class ResumeCreate(BaseModel):
    title: str
    contact: ContactInfoCreate
    sections: List[ResumeSectionCreate] = []


class ResumeUpdate(BaseModel):
    title: Optional[str] = None
    contact: Optional[ContactInfoCreate] = None
    sections: Optional[List[ResumeSectionCreate]] = None


class ResumeOut(BaseModel):
    id: UUID
    user_id: UUID
    title: str
    created_at: datetime
    updated_at: datetime
    is_tailored_copy_of: Optional[UUID]
    contact: Optional[ContactInfoOut]
    sections: List[ResumeSectionOut] = []

    class Config:
        from_attributes = True


class ResumeSummary(BaseModel):
    id: UUID
    title: str
    created_at: datetime
    updated_at: datetime
    is_tailored_copy_of: Optional[UUID]

    class Config:
        from_attributes = True


# ─────────────────────── Job Description ────────────────────────
class JobDescriptionCreate(BaseModel):
    raw_text: str


class JobDescriptionOut(BaseModel):
    id: UUID
    resume_id: UUID
    raw_text: str
    extracted_keywords: Optional[Any]
    created_at: datetime

    class Config:
        from_attributes = True


# ─────────────────────── Score ────────────────────────
class ScoreRequest(BaseModel):
    jd_text: Optional[str] = None  # if None, keyword_score = 0


class ScoreBreakdownItem(BaseModel):
    score: float          # 0.0 – 1.0
    weight: float
    weighted: float
    explanation: str
    items: List[str] = []  # per-issue details


class ScoreOut(BaseModel):
    id: UUID
    resume_id: UUID
    jd_id: Optional[UUID]
    parse_score: float
    keyword_score: float
    bullet_score: float
    completeness_score: float
    formatting_score: float
    total_score: float
    breakdown: Optional[Any]
    computed_at: datetime
    disclaimer: str = (
        "This score is a proxy for ATS parseability and keyword alignment. "
        "It does not predict your ranking in any specific employer's ATS."
    )

    class Config:
        from_attributes = True


# ─────────────────────── Render ────────────────────────
class RenderRequest(BaseModel):
    format: str = "pdf"   # "pdf" | "docx"
    template: str = "clean"  # "clean" | "minimal"


# ─────────────────────── Tailor ────────────────────────
class TailorRequest(BaseModel):
    jd_text: str
    resume_title: Optional[str] = None


class TailorOut(BaseModel):
    tailored_resume_id: UUID
    keywords_matched: List[str]
    keywords_missing: List[str]
    suggestions: List[str]


# ─────────────────────── Parse Check ────────────────────────
class ParseCheckResult(BaseModel):
    passed: bool
    sections_found: List[str]
    sections_missing: List[str]
    order_correct: bool
    issues: List[str]
    accuracy: float  # 0.0–1.0
