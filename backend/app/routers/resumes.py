"""
Resume CRUD router.
Handles: create, list, get, update, delete resumes.
"""
import json
import uuid
from datetime import datetime
from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from sqlalchemy.orm import selectinload
from app.database import get_db
from app.models import Resume, ContactInfo, ResumeSection, ResumeEntry, Bullet, SectionType
from app.schemas import ResumeCreate, ResumeOut, ResumeSummary, ResumeUpdate
from app.deps import get_current_user_id

router = APIRouter(prefix="/resumes", tags=["resumes"])


async def load_full_resume(resume_id: uuid.UUID, db: AsyncSession) -> Resume:
    result = await db.execute(
        select(Resume)
        .where(Resume.id == resume_id)
        .options(
            selectinload(Resume.contact),
            selectinload(Resume.sections)
            .selectinload(ResumeSection.entries)
            .selectinload(ResumeEntry.bullets),
        )
    )
    resume = result.scalar_one_or_none()
    if not resume:
        raise HTTPException(status_code=404, detail="Resume not found.")
    return resume


@router.post("", response_model=ResumeOut, status_code=status.HTTP_201_CREATED)
async def create_resume(
    data: ResumeCreate,
    db: AsyncSession = Depends(get_db),
    user_id: str = Depends(get_current_user_id),
):
    resume = Resume(
        user_id=uuid.UUID(user_id),
        title=data.title,
    )
    db.add(resume)
    await db.flush()

    # Contact
    if data.contact:
        contact = ContactInfo(resume_id=resume.id, **data.contact.model_dump())
        db.add(contact)

    # Sections
    for sec_data in data.sections:
        section = ResumeSection(
            resume_id=resume.id,
            type=SectionType(sec_data.type.value),
            order_index=sec_data.order_index,
        )
        db.add(section)
        await db.flush()

        for entry_data in sec_data.entries:
            entry = ResumeEntry(
                section_id=section.id,
                order_index=entry_data.order_index,
                payload=entry_data.payload,
            )
            db.add(entry)
            await db.flush()

            for bullet_data in entry_data.bullets:
                bullet = Bullet(
                    entry_id=entry.id,
                    raw_text=bullet_data.raw_text,
                    order_index=bullet_data.order_index,
                )
                db.add(bullet)

    await db.commit()
    return await load_full_resume(resume.id, db)


@router.get("", response_model=List[ResumeSummary])
async def list_resumes(
    db: AsyncSession = Depends(get_db),
    user_id: str = Depends(get_current_user_id),
):
    result = await db.execute(
        select(Resume)
        .where(Resume.user_id == uuid.UUID(user_id))
        .order_by(Resume.updated_at.desc())
    )
    return result.scalars().all()


@router.get("/{resume_id}", response_model=ResumeOut)
async def get_resume(
    resume_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    user_id: str = Depends(get_current_user_id),
):
    resume = await load_full_resume(resume_id, db)
    if str(resume.user_id) != user_id:
        raise HTTPException(status_code=403, detail="Access denied.")
    return resume


@router.put("/{resume_id}/sections", response_model=ResumeOut)
async def update_sections(
    resume_id: uuid.UUID,
    data: ResumeUpdate,
    db: AsyncSession = Depends(get_db),
    user_id: str = Depends(get_current_user_id),
):
    resume = await load_full_resume(resume_id, db)
    if str(resume.user_id) != user_id:
        raise HTTPException(status_code=403, detail="Access denied.")

    if data.title:
        resume.title = data.title

    if data.contact and resume.contact:
        for field, val in data.contact.model_dump(exclude_unset=True).items():
            setattr(resume.contact, field, val)
    elif data.contact and not resume.contact:
        contact = ContactInfo(resume_id=resume.id, **data.contact.model_dump())
        db.add(contact)

    if data.sections is not None:
        # Delete existing sections and re-create
        for existing_section in resume.sections:
            await db.delete(existing_section)
        await db.flush()

        for sec_data in data.sections:
            section = ResumeSection(
                resume_id=resume.id,
                type=SectionType(sec_data.type.value),
                order_index=sec_data.order_index,
            )
            db.add(section)
            await db.flush()

            for entry_data in sec_data.entries:
                entry = ResumeEntry(
                    section_id=section.id,
                    order_index=entry_data.order_index,
                    payload=entry_data.payload,
                )
                db.add(entry)
                await db.flush()

                for bullet_data in entry_data.bullets:
                    bullet = Bullet(
                        entry_id=entry.id,
                        raw_text=bullet_data.raw_text,
                        order_index=bullet_data.order_index,
                    )
                    db.add(bullet)

    resume.updated_at = datetime.utcnow()
    await db.commit()
    return await load_full_resume(resume_id, db)


@router.delete("/{resume_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_resume(
    resume_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    user_id: str = Depends(get_current_user_id),
):
    resume = await load_full_resume(resume_id, db)
    if str(resume.user_id) != user_id:
        raise HTTPException(status_code=403, detail="Access denied.")
    await db.delete(resume)
    await db.commit()
