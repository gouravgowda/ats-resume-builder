"""
JD tailoring service (PRD 6.6).
Extracts keywords from a JD, finds overlap with resume, suggests improvements.
Never fabricates skills.
"""
import re
from typing import Optional
from app.schemas import ResumeOut

# Common tech keywords to look for (extendable)
TECH_TERMS = re.compile(
    r"\b(Python|Java|JavaScript|TypeScript|Go|Rust|C\+\+|C#|Ruby|PHP|Swift|Kotlin|"
    r"React|Next\.js|Vue|Angular|Node\.js|Express|Django|FastAPI|Flask|Spring|"
    r"PostgreSQL|MySQL|MongoDB|Redis|Elasticsearch|Cassandra|DynamoDB|"
    r"AWS|GCP|Azure|Docker|Kubernetes|Terraform|Ansible|CI/CD|GitHub Actions|"
    r"REST|GraphQL|gRPC|Kafka|RabbitMQ|Celery|"
    r"Machine Learning|Deep Learning|NLP|PyTorch|TensorFlow|scikit-learn|"
    r"Git|Linux|Bash|SQL|NoSQL|API|Agile|Scrum|"
    r"Figma|Tailwind|Bootstrap|SASS|CSS|HTML)\b",
    re.IGNORECASE,
)

SOFT_TERMS = re.compile(
    r"\b(communication|leadership|collaboration|problem.solving|analytical|"
    r"mentoring|project management|cross.functional|stakeholder)\b",
    re.IGNORECASE,
)


def extract_keywords(jd_text: str) -> list[str]:
    """Extract skill keywords from a job description."""
    tech_matches = set(m.group(0) for m in TECH_TERMS.finditer(jd_text))
    soft_matches = set(m.group(0) for m in SOFT_TERMS.finditer(jd_text))
    return sorted(tech_matches | soft_matches)


def get_resume_text(resume: ResumeOut) -> str:
    text = ""
    if resume.contact:
        text += (resume.contact.full_name or "") + " "
    for section in resume.sections:
        for entry in section.entries:
            text += " " + str(entry.payload)
            for bullet in entry.bullets:
                text += " " + (bullet.improved_text or bullet.raw_text)
    return text


def compute_overlap(resume: ResumeOut, jd_keywords: list[str]) -> tuple[list[str], list[str]]:
    resume_text = get_resume_text(resume).lower()
    matched = [kw for kw in jd_keywords if kw.lower() in resume_text]
    missing = [kw for kw in jd_keywords if kw.lower() not in resume_text]
    return matched, missing


def generate_suggestions(missing: list[str], matched: list[str]) -> list[str]:
    """
    Generate concrete suggestions. NEVER fabricates skills.
    Only tells the student what's missing and asks if they have it.
    """
    suggestions = []
    if missing:
        suggestions.append(
            f"The following keywords from the JD are not on your resume: {', '.join(missing[:8])}. "
            "If you have experience with any of these, add them to your Skills section."
        )
    if matched:
        suggestions.append(
            f"These JD keywords are already on your resume: {', '.join(matched[:8])}. "
            "Consider reinforcing them in your experience bullets with metrics."
        )
    if not missing:
        suggestions.append("Your resume covers all detected JD keywords. Good keyword coverage.")
    return suggestions
