"""
Tailor router — generates a JD-tailored copy of a resume.
"""
import uuid
import copy
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.database import get_db
from app.models import Resume, ResumeSection, ResumeEntry, Bullet, ContactInfo, JobDescription, SectionType
from app.schemas import TailorRequest, TailorOut
from app.services.tailor import extract_keywords, compute_overlap, generate_suggestions
from app.routers.resumes import load_full_resume
from app.deps import get_current_user_id

router = APIRouter(prefix="/resumes", tags=["tailor"])


@router.post("/{resume_id}/tailor", response_model=TailorOut)
async def tailor_resume(
    resume_id: uuid.UUID,
    data: TailorRequest,
    db: AsyncSession = Depends(get_db),
    user_id: str = Depends(get_current_user_id),
):
    original = await load_full_resume(resume_id, db)
    if str(original.user_id) != user_id:
        raise HTTPException(status_code=403, detail="Access denied.")

    # Extract keywords from JD
    jd_keywords = extract_keywords(data.jd_text)

    # Compute overlap
    matched, missing = compute_overlap(original, jd_keywords)

    # Generate suggestions
    suggestions = generate_suggestions(missing, matched)

    # Create a copy of the resume
    new_title = data.resume_title or f"{original.title} (Tailored)"
    new_resume = Resume(
        user_id=original.user_id,
        title=new_title,
        is_tailored_copy_of=original.id,
    )
    db.add(new_resume)
    await db.flush()

    # Copy contact
    if original.contact:
        c = original.contact
        new_contact = ContactInfo(
            resume_id=new_resume.id,
            full_name=c.full_name,
            email=c.email,
            phone=c.phone,
            city=c.city,
            linkedin=c.linkedin,
            github=c.github,
            portfolio=c.portfolio,
        )
        db.add(new_contact)

    # Copy sections and entries
    for section in original.sections:
        new_section = ResumeSection(
            resume_id=new_resume.id,
            type=section.type,
            order_index=section.order_index,
        )
        db.add(new_section)
        await db.flush()

        for entry in section.entries:
            new_entry = ResumeEntry(
                section_id=new_section.id,
                order_index=entry.order_index,
                payload=dict(entry.payload),
            )
            db.add(new_entry)
            await db.flush()

            for bullet in entry.bullets:
                new_bullet = Bullet(
                    entry_id=new_entry.id,
                    raw_text=bullet.raw_text,
                    improved_text=bullet.improved_text,
                    has_metric=bullet.has_metric,
                    order_index=bullet.order_index,
                )
                db.add(new_bullet)

    # Save JD
    jd = JobDescription(
        resume_id=new_resume.id,
        raw_text=data.jd_text,
        extracted_keywords=jd_keywords,
    )
    db.add(jd)

    await db.commit()

    return TailorOut(
        tailored_resume_id=new_resume.id,
        keywords_matched=matched,
        keywords_missing=missing,
        suggestions=suggestions,
    )
