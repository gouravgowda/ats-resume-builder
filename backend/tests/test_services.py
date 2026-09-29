"""
Backend tests — covers core services: bullet flags, scoring, parse-check.
Run with: pytest tests/ -v
"""
import pytest
from app.services.bullets import detect_flags, has_metric, pick_metric_question
from app.services.scorer import score_bullets, score_completeness, score_formatting


# ── Bullet flag detection ──────────────────────────────────────────────────────
def test_first_person_flag():
    flags = detect_flags("I built a pipeline that reduced latency by 30%.")
    assert any("first-person" in f.lower() for f in flags)


def test_passive_voice_flag():
    flags = detect_flags("The API was developed to improve performance.")
    assert any("passive" in f.lower() for f in flags)


def test_filler_word_flag():
    flags = detect_flags("Passionate team player who utilized synergies.")
    assert any("filler" in f.lower() for f in flags)


def test_clean_bullet_no_flags():
    flags = detect_flags("Built a distributed caching layer reducing API latency by 40%.")
    assert len(flags) == 0


def test_metric_detection_percentage():
    assert has_metric("Reduced build time by 35%.")


def test_metric_detection_multiplier():
    assert has_metric("Improved throughput 3x compared to previous implementation.")


def test_no_metric():
    assert not has_metric("Built a REST API for the authentication service.")


# ── Completeness scoring ──────────────────────────────────────────────────────
class FakeContact:
    full_name = "Jane Smith"
    email = "jane@example.com"
    phone = "+1 555 0000"
    city = "SF"
    linkedin = None
    github = None
    portfolio = None


class FakeSection:
    def __init__(self, stype, entries=None):
        self.type = type("T", (), {"value": stype})()
        self.entries = entries or []


class FakeResume:
    def __init__(self, contact=None, sections=None):
        self.contact = contact
        self.sections = sections or []


def test_completeness_full():
    resume = FakeResume(
        contact=FakeContact(),
        sections=[
            FakeSection("experience", entries=[object()]),
            FakeSection("skill", entries=[object()]),
        ],
    )
    score, issues = score_completeness(resume)
    assert score >= 0.9
    assert len(issues) == 0


def test_completeness_no_contact():
    resume = FakeResume(contact=None, sections=[])
    score, issues = score_completeness(resume)
    assert score < 0.5
    assert any("contact" in i.lower() for i in issues)


def test_completeness_no_skills():
    resume = FakeResume(
        contact=FakeContact(),
        sections=[FakeSection("experience", entries=[object()])],
    )
    score, issues = score_completeness(resume)
    assert any("skill" in i.lower() for i in issues)
