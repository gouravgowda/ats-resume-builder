"""
Scoring engine (PRD 6.4) — deterministic and explainable.
Component weights:
  Parse quality:         30%
  JD keyword match:      30%
  Bullet quality:        20%
  Completeness:          10%
  Formatting:            10%
"""
import re
from typing import Optional
from app.schemas import ResumeOut, ScoreOut, ScoreBreakdownItem
from app.services.parse_check import ParseCheckResult
import uuid
from datetime import datetime

# ─── Action verbs (strong openers) ──────────────────────────────────────────
ACTION_VERBS = {
    "built", "designed", "developed", "implemented", "created", "led", "managed",
    "architected", "deployed", "optimized", "reduced", "increased", "improved",
    "automated", "integrated", "launched", "shipped", "wrote", "refactored",
    "debugged", "tested", "analyzed", "researched", "collaborated", "mentored",
    "trained", "configured", "migrated", "scaled", "delivered", "engineered",
    "established", "maintained", "monitored", "resolved", "streamlined",
}

METRIC_PATTERN = re.compile(
    r"\b(\d+[\.,]?\d*\s*(%|percent|x|times|ms|seconds?|hours?|days?|users?|k|M|GB|TB|MB|requests?))(?!\w)",
    re.IGNORECASE,
)

FILLER_WORDS = {
    "passionate", "hardworking", "results-driven", "dedicated", "motivated",
    "dynamic", "synergistic", "leveraged", "utilized", "innovative", "proactive",
}

BANNED_COPY = {
    "unlock your potential", "land your dream job", "passionate", "hardworking",
}


def score_bullets(resume: ResumeOut) -> tuple[float, list[str]]:
    """Score bullets on: action verb start, length, metric presence, no fillers."""
    all_bullets = []
    for section in resume.sections:
        for entry in section.entries:
            for bullet in entry.bullets:
                text = bullet.improved_text or bullet.raw_text
                all_bullets.append(text)

    if not all_bullets:
        return 0.0, ["No bullets found in resume."]

    issues = []
    total_score = 0.0

    for bullet in all_bullets:
        b_score = 0.0
        words = bullet.strip().split()
        if not words:
            continue

        # Action verb check (33%)
        first_word = words[0].lower().rstrip(".,;:")
        if first_word in ACTION_VERBS:
            b_score += 0.33
        else:
            issues.append(f"Bullet does not start with a strong action verb: '{bullet[:60]}...'")

        # Length check 12–25 words (33%)
        word_count = len(words)
        if 12 <= word_count <= 25:
            b_score += 0.34
        elif word_count < 12:
            issues.append(f"Bullet too short ({word_count} words): '{bullet[:60]}'")
        else:
            issues.append(f"Bullet too long ({word_count} words): '{bullet[:60]}'")

        # Metric check (34%)
        if METRIC_PATTERN.search(bullet):
            b_score += 0.33
        else:
            issues.append(f"No measurable metric found: '{bullet[:60]}'")

        # Filler penalty
        for fw in FILLER_WORDS:
            if fw in bullet.lower():
                b_score = max(0.0, b_score - 0.1)
                issues.append(f"Filler word '{fw}' found in bullet.")

        total_score += b_score

    return min(1.0, total_score / len(all_bullets)), issues


def score_completeness(resume: ResumeOut) -> tuple[float, list[str]]:
    """Score required fields presence."""
    issues = []
    score = 0.0

    contact = resume.contact
    if contact:
        fields = [contact.full_name, contact.email]
        if all(fields):
            score += 0.4
        else:
            issues.append("Missing required contact fields (name or email).")
    else:
        issues.append("No contact info present.")

    has_experience = any(s.type.value in ("experience", "project") for s in resume.sections)
    has_experience_entries = any(
        s.type.value in ("experience", "project") and len(s.entries) > 0
        for s in resume.sections
    )
    if has_experience_entries:
        score += 0.4
    else:
        issues.append("No experience or project entries found.")

    has_skills = any(s.type.value == "skill" and len(s.entries) > 0 for s in resume.sections)
    if has_skills:
        score += 0.2
    else:
        issues.append("No skills section found.")

    return min(1.0, score), issues


def score_formatting(resume: ResumeOut) -> tuple[float, list[str]]:
    """
    Score formatting consistency.
    Since we control the template, this is mostly about data consistency.
    """
    issues = []
    score = 1.0

    # Check date format consistency
    date_patterns = []
    for section in resume.sections:
        for entry in section.entries:
            p = entry.payload
            for key in ("start_date", "end_date", "date"):
                val = p.get(key)
                if val and val.lower() not in ("present", "current", ""):
                    date_patterns.append(val)

    if date_patterns:
        # Check if all match the same rough format (Mon YYYY or MM/YYYY)
        fmt_month_year = re.compile(r"^(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\s+\d{4}$", re.IGNORECASE)
        fmt_mm_yyyy = re.compile(r"^\d{1,2}/\d{4}$")
        month_year_count = sum(1 for d in date_patterns if fmt_month_year.match(d))
        mm_yyyy_count = sum(1 for d in date_patterns if fmt_mm_yyyy.match(d))
        mixed = len(date_patterns) - month_year_count - mm_yyyy_count

        if month_year_count > 0 and mm_yyyy_count > 0:
            score -= 0.3
            issues.append("Mixed date formats detected (e.g., 'Aug 2024' and '08/2024'). Use one format throughout.")
        if mixed > 0:
            score -= 0.2
            issues.append(f"{mixed} dates in unrecognized format. Use 'Mon YYYY' (e.g., 'Aug 2024').")

    return max(0.0, score), issues


def score_keywords(resume: ResumeOut, jd_keywords: Optional[list[str]]) -> tuple[float, list[str], list[str], list[str]]:
    """Score keyword match against JD. Returns score, issues, matched, missing."""
    if not jd_keywords:
        return 0.0, ["No job description provided - keyword score not computed."], [], []

    # Build a full text of the resume
    resume_text = ""
    if resume.contact:
        resume_text += resume.contact.full_name or ""
    for section in resume.sections:
        for entry in section.entries:
            resume_text += " " + str(entry.payload)
            for bullet in entry.bullets:
                resume_text += " " + (bullet.improved_text or bullet.raw_text)

    resume_lower = resume_text.lower()
    matched = []
    missing = []
    for kw in jd_keywords:
        if kw.lower() in resume_lower:
            matched.append(kw)
        else:
            missing.append(kw)

    if not jd_keywords:
        return 0.0, [], [], []

    score = len(matched) / len(jd_keywords)
    issues = []
    if missing:
        issues.append(f"Missing JD keywords: {', '.join(missing[:10])}" + (" ..." if len(missing) > 10 else ""))

    return min(1.0, score), issues, matched, missing


def compute_score(
    resume: ResumeOut,
    parse_result: Optional[ParseCheckResult] = None,
    jd_keywords: Optional[list[str]] = None,
) -> dict:
    """
    Run all scoring components and return a complete score dict.
    """
    # Parse quality (30%)
    if parse_result:
        parse_score = parse_result.accuracy
        parse_issues = parse_result.issues
    else:
        parse_score = 0.8  # unknown — moderate default
        parse_issues = ["PDF not yet generated - parse score estimated."]

    # JD keyword match (30%)
    kw_score, kw_issues, kw_matched, kw_missing = score_keywords(resume, jd_keywords)

    # Bullet quality (20%)
    bullet_score, bullet_issues = score_bullets(resume)

    # Completeness (10%)
    completeness_score, completeness_issues = score_completeness(resume)

    # Formatting (10%)
    formatting_score, formatting_issues = score_formatting(resume)

    # Weighted total
    total = (
        parse_score * 0.30
        + kw_score * 0.30
        + bullet_score * 0.20
        + completeness_score * 0.10
        + formatting_score * 0.10
    )

    breakdown = {
        "parse_quality": {
            "score": round(parse_score, 3),
            "weight": 0.30,
            "weighted": round(parse_score * 0.30, 3),
            "explanation": "Re-extracted PDF vs original structured data comparison.",
            "items": parse_issues,
        },
        "jd_keyword_match": {
            "score": round(kw_score, 3),
            "weight": 0.30,
            "weighted": round(kw_score * 0.30, 3),
            "explanation": "Keywords from job description found in resume.",
            "items": kw_issues,
            "matched": kw_matched,
            "missing": kw_missing,
        },
        "bullet_quality": {
            "score": round(bullet_score, 3),
            "weight": 0.20,
            "weighted": round(bullet_score * 0.20, 3),
            "explanation": "Action verb start, 12–25 word length, metric presence, no filler words.",
            "items": bullet_issues,
        },
        "completeness": {
            "score": round(completeness_score, 3),
            "weight": 0.10,
            "weighted": round(completeness_score * 0.10, 3),
            "explanation": "Required fields present: name, email, experience/project, skills.",
            "items": completeness_issues,
        },
        "formatting_consistency": {
            "score": round(formatting_score, 3),
            "weight": 0.10,
            "weighted": round(formatting_score * 0.10, 3),
            "explanation": "Consistent date format, single font family (enforced by template).",
            "items": formatting_issues,
        },
        "disclaimer": (
            "This score is a proxy for ATS parseability and keyword alignment. "
            "It does not predict your ranking in any specific employer's ATS "
            "(Workday, Greenhouse, Lever, etc.)."
        ),
    }

    return {
        "parse_score": round(parse_score, 3),
        "keyword_score": round(kw_score, 3),
        "bullet_score": round(bullet_score, 3),
        "completeness_score": round(completeness_score, 3),
        "formatting_score": round(formatting_score, 3),
        "total_score": round(total, 3),
        "breakdown": breakdown,
    }
