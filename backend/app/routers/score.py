"""
Scoring router — runs the full deterministic scoring engine.
"""
import uuid
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from datetime import datetime
from app.database import get_db
from app.models import Score, JobDescription
from app.schemas import ScoreRequest, ScoreOut
from app.services.scorer import compute_score
from app.services.parse_check import check_parse
from app.services.renderer import render_pdf
from app.services.tailor import extract_keywords
from app.routers.resumes import load_full_resume
from app.deps import get_current_user_id

router = APIRouter(prefix="/resumes", tags=["score"])


@router.post("/{resume_id}/score", response_model=ScoreOut)
async def score_resume(
    resume_id: uuid.UUID,
    data: ScoreRequest,
    db: AsyncSession = Depends(get_db),
    user_id: str = Depends(get_current_user_id),
):
    resume = await load_full_resume(resume_id, db)
    if str(resume.user_id) != user_id:
        raise HTTPException(status_code=403, detail="Access denied.")

    # Run parse check (generates PDF internally)
    pdf_bytes = await render_pdf(resume)
    parse_result = check_parse(pdf_bytes, resume)

    # Extract JD keywords if provided
    jd_id = None
    jd_keywords = None
    if data.jd_text:
        jd_keywords = extract_keywords(data.jd_text)
        # Save JD
        jd = JobDescription(
            resume_id=resume.id,
            raw_text=data.jd_text,
            extracted_keywords=jd_keywords,
        )
        db.add(jd)
        await db.flush()
        jd_id = jd.id

    # Compute scores
    score_data = compute_score(resume, parse_result, jd_keywords)

    # Save score
    score = Score(
        resume_id=resume.id,
        jd_id=jd_id,
        **score_data,
        computed_at=datetime.utcnow(),
    )
    db.add(score)
    await db.commit()
    await db.refresh(score)

    return score
