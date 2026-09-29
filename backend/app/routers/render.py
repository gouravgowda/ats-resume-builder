"""
Render router — generates PDF and DOCX from a resume.
"""
import uuid
from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import Response
from sqlalchemy.ext.asyncio import AsyncSession
from app.database import get_db
from app.schemas import RenderRequest
from app.services.renderer import render_pdf, get_html
from app.services.docx_export import build_docx
from app.routers.resumes import load_full_resume
from app.deps import get_current_user_id

router = APIRouter(prefix="/resumes", tags=["render"])


@router.post("/{resume_id}/render")
async def render_resume(
    resume_id: uuid.UUID,
    data: RenderRequest,
    db: AsyncSession = Depends(get_db),
    user_id: str = Depends(get_current_user_id),
):
    resume = await load_full_resume(resume_id, db)
    if str(resume.user_id) != user_id:
        raise HTTPException(status_code=403, detail="Access denied.")

    if data.format == "pdf":
        pdf_bytes = await render_pdf(resume, data.template)
        return Response(
            content=pdf_bytes,
            media_type="application/pdf",
            headers={"Content-Disposition": f'attachment; filename="{resume.title}.pdf"'},
        )
    elif data.format == "docx":
        docx_bytes = build_docx(resume)
        return Response(
            content=docx_bytes,
            media_type="application/vnd.openxmlformats-officedocument.wordprocessingml.document",
            headers={"Content-Disposition": f'attachment; filename="{resume.title}.docx"'},
        )
    else:
        raise HTTPException(status_code=400, detail="Format must be 'pdf' or 'docx'.")


@router.get("/{resume_id}/preview-html")
async def preview_html(
    resume_id: uuid.UUID,
    template: str = "clean",
    db: AsyncSession = Depends(get_db),
    user_id: str = Depends(get_current_user_id),
):
    """Return the raw HTML used to generate the PDF — useful for live preview."""
    resume = await load_full_resume(resume_id, db)
    if str(resume.user_id) != user_id:
        raise HTTPException(status_code=403, detail="Access denied.")
    html = get_html(resume, template)
    return Response(content=html, media_type="text/html")
