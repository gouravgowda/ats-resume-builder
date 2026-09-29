"""
Parse-back verification loop (PRD 6.5).
After generating a PDF, re-extract its text using PyMuPDF
and diff against the original structured input.
This is the core technical differentiator.
"""
import re
from typing import Any
import fitz  # PyMuPDF
from app.schemas import ParseCheckResult, ResumeOut

EXPECTED_SECTIONS = {
    "education": ["EDUCATION"],
    "experience": ["EXPERIENCE"],
    "project": ["PROJECTS", "PROJECT"],
    "skill": ["SKILLS"],
    "achievement": ["ACHIEVEMENTS", "CERTIFICATIONS"],
}


def extract_text_from_pdf(pdf_bytes: bytes) -> str:
    """Extract all text from PDF bytes using PyMuPDF."""
    doc = fitz.open(stream=pdf_bytes, filetype="pdf")
    text = ""
    for page in doc:
        text += page.get_text()
    doc.close()
    return text


def normalize(text: str) -> str:
    return re.sub(r"\s+", " ", text).strip().lower()


def check_parse(pdf_bytes: bytes, resume: ResumeOut) -> ParseCheckResult:
    """
    Re-extract PDF text and diff against original structured data.
    Returns a ParseCheckResult with pass/fail and issue details.
    """
    extracted = extract_text_from_pdf(pdf_bytes)
    extracted_upper = extracted.upper()
    issues = []
    sections_found = []
    sections_missing = []

    # 1. Check contact info
    contact = resume.contact
    if contact:
        if contact.full_name and normalize(contact.full_name) not in normalize(extracted):
            issues.append(f"Name '{contact.full_name}' not found in extracted PDF text.")
        if contact.email and contact.email.lower() not in extracted.lower():
            issues.append(f"Email '{contact.email}' not found in extracted PDF text.")

    # 2. Check section headings present and in correct order
    section_types_in_resume = [s.type.value for s in resume.sections]
    found_positions = {}

    for section_type in section_types_in_resume:
        aliases = EXPECTED_SECTIONS.get(section_type, [section_type.upper()])
        found = False
        for alias in aliases:
            pos = extracted_upper.find(alias)
            if pos != -1:
                found_positions[section_type] = pos
                sections_found.append(section_type)
                found = True
                break
        if not found:
            sections_missing.append(section_type)
            issues.append(f"Section '{section_type}' heading not found in extracted PDF text.")

    # 3. Check section order
    order_correct = True
    if len(found_positions) > 1:
        positions = [found_positions[s] for s in section_types_in_resume if s in found_positions]
        if positions != sorted(positions):
            order_correct = False
            issues.append("Sections appear out of order in the extracted PDF text.")

    # 4. Check key entries (spot-check names/titles)
    for section in resume.sections:
        for entry in section.entries:
            p = entry.payload
            check_field = None
            if section.type.value == "education":
                check_field = p.get("institution")
            elif section.type.value == "experience":
                check_field = p.get("company")
            elif section.type.value == "project":
                check_field = p.get("name")
            elif section.type.value == "achievement":
                check_field = p.get("title")

            if check_field and normalize(check_field) not in normalize(extracted):
                issues.append(f"Entry '{check_field}' not found in extracted PDF text.")

    # 5. Calculate accuracy
    total_sections = len(section_types_in_resume)
    found_count = len(sections_found)
    accuracy = found_count / total_sections if total_sections > 0 else 1.0
    if issues and accuracy == 1.0:
        accuracy = max(0.9, 1.0 - len(issues) * 0.02)

    passed = len(issues) == 0 and order_correct and accuracy >= 0.95

    return ParseCheckResult(
        passed=passed,
        sections_found=sections_found,
        sections_missing=sections_missing,
        order_correct=order_correct,
        issues=issues,
        accuracy=round(accuracy, 3),
    )
