"""
FastAPI application entrypoint.
"""
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.config import settings
from app.database import engine, Base
from app.routers import auth, resumes, bullets, render, parse_check, score, tailor

app = FastAPI(
    title="ATS Resume Builder API",
    description="Generates ATS-parseable PDF resumes and checks them against a job description.",
    version="1.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Register routers
app.include_router(auth.router)
app.include_router(resumes.router)
app.include_router(bullets.router)
app.include_router(render.router)
app.include_router(parse_check.router)
app.include_router(score.router)
app.include_router(tailor.router)


@app.on_event("startup")
async def startup():
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)


@app.get("/health")
async def health():
    return {"status": "ok", "version": "1.0.0"}
