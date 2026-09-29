"""
Parse-check router — re-extracts PDF and diffs against original data.
"""
import uuid
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
from sqlalchemy.ext.asyncio import AsyncSession
from app.database import get_db
from app.schemas import ParseCheckResult
from app.services.parse_check import check_parse
from app.services.renderer import render_pdf
from app.routers.resumes import load_full_resume
from app.deps import get_current_user_id

router = APIRouter(prefix="/resumes", tags=["parse-check"])


@router.post("/{resume_id}/parse-check", response_model=ParseCheckResult)
async def run_parse_check(
    resume_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    user_id: str = Depends(get_current_user_id),
):
    """
    Generate PDF from resume, then immediately re-extract its text
    and diff against the original structured input.
    Blocks export if parse accuracy < 95%.
    """
    resume = await load_full_resume(resume_id, db)
    if str(resume.user_id) != user_id:
        raise HTTPException(status_code=403, detail="Access denied.")

    # Generate PDF
    pdf_bytes = await render_pdf(resume)

    # Run parse-back verification
    result = check_parse(pdf_bytes, resume)
    return result


@router.post("/{resume_id}/parse-check/upload", response_model=ParseCheckResult)
async def parse_check_upload(
    resume_id: uuid.UUID,
    file: UploadFile = File(...),
    db: AsyncSession = Depends(get_db),
    user_id: str = Depends(get_current_user_id),
):
    """
    Accept an uploaded PDF and run parse-back verification against resume data.
    Useful for verifying externally generated PDFs.
    """
    resume = await load_full_resume(resume_id, db)
    if str(resume.user_id) != user_id:
        raise HTTPException(status_code=403, detail="Access denied.")

    pdf_bytes = await file.read()
    result = check_parse(pdf_bytes, resume)
    return result
