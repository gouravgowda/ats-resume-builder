"""
Bullet improvement router — calls Claude API via bullets service.
"""
import uuid
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.database import get_db
from app.models import Bullet
from app.schemas import BulletImproveRequest, BulletImproveResponse
from app.services.bullets import improve_bullet
from app.deps import get_current_user_id

router = APIRouter(prefix="/resumes", tags=["bullets"])


@router.post("/{resume_id}/bullets/improve", response_model=BulletImproveResponse)
async def improve_bullet_endpoint(
    resume_id: uuid.UUID,
    data: BulletImproveRequest,
    db: AsyncSession = Depends(get_db),
    user_id: str = Depends(get_current_user_id),
):
    """
    Send a raw bullet text; receive an improved version.
    If no metric is in the original, returns needs_metric_prompt=True
    with a specific question to ask the student.
    Never invents numbers.
    """
    result = await improve_bullet(data.raw_text, data.context)
    return result


@router.put("/{resume_id}/bullets/{bullet_id}", response_model=dict)
async def update_bullet(
    resume_id: uuid.UUID,
    bullet_id: uuid.UUID,
    improved_text: str,
    db: AsyncSession = Depends(get_db),
    user_id: str = Depends(get_current_user_id),
):
    """Save improved bullet text back to the database."""
    result = await db.execute(select(Bullet).where(Bullet.id == bullet_id))
    bullet = result.scalar_one_or_none()
    if not bullet:
        raise HTTPException(status_code=404, detail="Bullet not found.")
    bullet.improved_text = improved_text
    await db.commit()
    return {"status": "saved"}
