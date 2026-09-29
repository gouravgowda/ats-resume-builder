"""
Bullet improvement service — uses Claude API.
Rules (PRD 6.2):
- Never invents a number.
- Prompts student if no metric is present.
- Rejects first-person pronouns, passive voice, filler adjectives.
- Rejects duplicate opening verbs.
"""
import re
from typing import Optional
from groq import AsyncGroq
from app.config import settings
from app.schemas import BulletImproveResponse

FILLER_WORDS = {
    "passionate", "hardworking", "results-driven", "dedicated", "motivated",
    "dynamic", "synergistic", "leveraged", "utilized", "innovative", "proactive",
    "go-getter", "team player", "detail-oriented", "self-starter",
}

PASSIVE_PATTERNS = [
    r"\bwas (developed|built|created|implemented|designed|tested|deployed)\b",
    r"\bwere (developed|built|created|implemented|designed|tested|deployed)\b",
    r"\bhas been\b",
    r"\bhave been\b",
]

FIRST_PERSON = re.compile(r"\b(I|me|my|myself|we|our|us)\b", re.IGNORECASE)

METRIC_PATTERN = re.compile(
    r"\b(\d+[\.,]?\d*\s*(%|percent|x|times|ms|seconds?|hours?|days?|users?|requests?|k|M|GB|TB|MB))(?!\w)",
    re.IGNORECASE,
)

METRIC_QUESTIONS = [
    "How many users did this serve or impact?",
    "What was the performance improvement (speed, latency, throughput)?",
    "How much time or cost did this save?",
    "What scale did this operate at (requests/second, data volume, etc.)?",
    "How many test cases, bugs, or incidents did this address?",
]


def detect_flags(text: str) -> list[str]:
    flags = []
    if FIRST_PERSON.search(text):
        flags.append("Contains first-person pronoun - remove it.")
    for pat in PASSIVE_PATTERNS:
        if re.search(pat, text, re.IGNORECASE):
            flags.append("Passive voice detected - use an active action verb.")
            break
    found_fillers = [w for w in FILLER_WORDS if w.lower() in text.lower()]
    if found_fillers:
        flags.append(f"Filler words detected: {', '.join(found_fillers)} - remove or replace with specifics.")
    return flags


def has_metric(text: str) -> bool:
    return bool(METRIC_PATTERN.search(text))


def pick_metric_question(raw_text: str) -> str:
    """Simple heuristic: pick the most relevant metric question."""
    lower = raw_text.lower()
    if any(w in lower for w in ["user", "customer", "client"]):
        return METRIC_QUESTIONS[0]
    if any(w in lower for w in ["fast", "slow", "latency", "performance", "speed", "optimize"]):
        return METRIC_QUESTIONS[1]
    if any(w in lower for w in ["time", "cost", "save", "reduc"]):
        return METRIC_QUESTIONS[2]
    if any(w in lower for w in ["scale", "load", "request", "traffic"]):
        return METRIC_QUESTIONS[3]
    return METRIC_QUESTIONS[4]


SYSTEM_PROMPT = """You are a professional resume editor. Your task is to rewrite a resume bullet point.

Rules you MUST follow:
1. Start with a strong action verb (past tense for past roles, present for current).
2. Structure: Action verb + what you did + how you did it + measurable result.
3. Target length: 12-25 words.
4. NEVER invent, fabricate, or estimate a number that is not in the original text. If no metric exists in the original, write the best version WITHOUT a metric, and set needs_metric_prompt to true.
5. Remove all first-person pronouns (I, me, my, we).
6. Avoid passive voice.
7. Remove filler adjectives: passionate, hardworking, results-driven, dedicated, innovative, etc.
8. Output ONLY the improved bullet text. No quotes, no explanations, no prefix like "Bullet:".
9. Do not use em dashes (—). Use commas or semicolons instead.

Context about the role/project may be provided to help you understand the domain."""


async def improve_bullet(raw_text: str, context: Optional[str] = None) -> BulletImproveResponse:
    if not settings.GROQ_API_KEY:
        # Fallback without API key: return flags only
        flags = detect_flags(raw_text)
        metric_present = has_metric(raw_text)
        return BulletImproveResponse(
            improved_text=None,
            has_metric=metric_present,
            needs_metric_prompt=not metric_present,
            metric_question=pick_metric_question(raw_text) if not metric_present else None,
            flags=flags,
        )

    client = AsyncGroq(api_key=settings.GROQ_API_KEY)

    user_message = f"Rewrite this resume bullet:\n{raw_text}"
    if context:
        user_message = f"Context (role/project): {context}\n\n{user_message}"

    # Pre-flight checks on raw input
    flags = detect_flags(raw_text)
    metric_present = has_metric(raw_text)

    try:
        response = await client.chat.completions.create(
            model=settings.GROQ_MODEL,
            max_tokens=200,
            temperature=0.3,
            messages=[
                {"role": "system", "content": SYSTEM_PROMPT},
                {"role": "user", "content": user_message},
            ],
        )
        improved = response.choices[0].message.content.strip()

        # Hard validation: if improved text introduces a number not in original, strip it
        original_numbers = set(re.findall(r"\d+", raw_text))
        improved_numbers = set(re.findall(r"\d+", improved))
        invented = improved_numbers - original_numbers
        if invented:
            # Remove invented numbers from the improved text
            for num in invented:
                improved = re.sub(rf"\b{num}\b[\w%x]*", "[metric needed]", improved)
            flags.append("AI-invented metrics were removed. Please add a real number.")

        # Check if improved still has a metric
        improved_has_metric = has_metric(improved) and not invented

        return BulletImproveResponse(
            improved_text=improved,
            has_metric=improved_has_metric,
            needs_metric_prompt=not improved_has_metric,
            metric_question=pick_metric_question(raw_text) if not improved_has_metric else None,
            flags=flags,
        )

    except Exception as e:
        flags.append(f"AI improvement failed: {str(e)}")
        return BulletImproveResponse(
            improved_text=None,
            has_metric=metric_present,
            needs_metric_prompt=not metric_present,
            metric_question=pick_metric_question(raw_text) if not metric_present else None,
            flags=flags,
        )
