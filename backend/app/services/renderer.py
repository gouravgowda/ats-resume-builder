"""
PDF rendering service using Playwright.
Generates real selectable-text PDFs — never image-based.
ATS-safety rules are baked into the HTML template.
"""
import asyncio
from pathlib import Path
from typing import Optional
from playwright.async_api import async_playwright
from app.schemas import ResumeOut

TEMPLATE_DIR = Path(__file__).parent.parent / "templates"


def build_html(resume: ResumeOut, template: str = "clean") -> str:
    """
    Build an ATS-safe HTML string from structured resume data.
    Hard rules (PRD 6.3):
    - Single column, no tables, no text boxes
    - No icons, images, charts
    - Standard section headings only
    - Standard font (Arial / Calibri / Times New Roman)
    - Consistent date format
    - Simple bullet characters only
    """
    contact = resume.contact
    name = contact.full_name if contact else "Your Name"

    contact_parts = []
    if contact:
        if contact.email:
            contact_parts.append(contact.email)
        if contact.phone:
            contact_parts.append(contact.phone)
        if contact.city:
            contact_parts.append(contact.city)
        if contact.linkedin:
            contact_parts.append(contact.linkedin)
        if contact.github:
            contact_parts.append(contact.github)
        if contact.portfolio:
            contact_parts.append(contact.portfolio)

    contact_line = " | ".join(contact_parts)

    # Build sections HTML
    sections_html = ""
    for section in resume.sections:
        section_type = section.type.value
        heading_map = {
            "education": "Education",
            "experience": "Experience",
            "project": "Projects",
            "skill": "Skills",
            "achievement": "Achievements",
        }
        heading = heading_map.get(section_type, section_type.title())

        entries_html = ""
        for entry in section.entries:
            p = entry.payload

            if section_type == "education":
                entries_html += f"""
                <div class="entry">
                    <div class="entry-header">
                        <span class="entry-title">{p.get('institution', '')}</span>
                        <span class="entry-date">{p.get('start_date', '')} &ndash; {p.get('end_date', '')}</span>
                    </div>
                    <div class="entry-subtitle">{p.get('degree', '')} in {p.get('field', '')}</div>
                    {"<div class='entry-detail'>GPA: " + str(p.get('gpa','')) + "</div>" if p.get('gpa') else ""}
                </div>"""

            elif section_type == "experience":
                bullets_html = ""
                for b in entry.bullets:
                    text = b.improved_text or b.raw_text
                    bullets_html += f"<li>{text}</li>"
                entries_html += f"""
                <div class="entry">
                    <div class="entry-header">
                        <span class="entry-title">{p.get('company', '')}</span>
                        <span class="entry-date">{p.get('start_date', '')} &ndash; {p.get('end_date', 'Present')}</span>
                    </div>
                    <div class="entry-subtitle">{p.get('role', '')}{(', ' + p.get('location','')) if p.get('location') else ''}</div>
                    <ul class="bullets">{bullets_html}</ul>
                </div>"""

            elif section_type == "project":
                bullets_html = ""
                for b in entry.bullets:
                    text = b.improved_text or b.raw_text
                    bullets_html += f"<li>{text}</li>"
                tech = p.get('tech_stack', '')
                link = p.get('link', '')
                subtitle_parts = []
                if tech:
                    subtitle_parts.append(f"Tech: {tech}")
                if link:
                    subtitle_parts.append(link)
                entries_html += f"""
                <div class="entry">
                    <div class="entry-header">
                        <span class="entry-title">{p.get('name', '')}</span>
                        <span class="entry-date">{p.get('start_date', '')} &ndash; {p.get('end_date', '')}</span>
                    </div>
                    {"<div class='entry-subtitle'>" + " | ".join(subtitle_parts) + "</div>" if subtitle_parts else ""}
                    <ul class="bullets">{bullets_html}</ul>
                </div>"""

            elif section_type == "skill":
                skill_groups = p.get('groups', {})  # e.g. {"Languages": "Python, Java", ...}
                if isinstance(skill_groups, dict):
                    for group_name, skills in skill_groups.items():
                        entries_html += f"""
                        <div class="skill-row">
                            <span class="skill-category">{group_name}:</span>
                            <span class="skill-list">{skills}</span>
                        </div>"""
                else:
                    entries_html += f'<div class="skill-row"><span class="skill-list">{skill_groups}</span></div>'

            elif section_type == "achievement":
                entries_html += f"""
                <div class="entry">
                    <div class="entry-header">
                        <span class="entry-title">{p.get('title', '')}</span>
                        <span class="entry-date">{p.get('date', '')}</span>
                    </div>
                    {"<div class='entry-subtitle'>" + p.get('issuer','') + "</div>" if p.get('issuer') else ""}
                </div>"""

        sections_html += f"""
        <section class="resume-section">
            <h2 class="section-heading">{heading}</h2>
            <div class="section-content">{entries_html}</div>
        </section>"""

    if template == "minimal":
        css = """
  /* Minimal ATS-safe: no borders, clean spacing */
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body {
    font-family: Arial, Helvetica, sans-serif;
    font-size: 11pt;
    line-height: 1.4;
    color: #000;
    background: #fff;
    padding: 0.6in 0.65in;
    max-width: 8.5in;
  }
  .resume-header {
    text-align: center;
    margin-bottom: 15px;
  }
  .resume-name {
    font-size: 16pt;
    font-weight: bold;
  }
  .resume-contact {
    font-size: 10pt;
    margin-top: 4px;
  }
  .resume-section {
    margin-top: 12px;
  }
  .section-heading {
    font-size: 12pt;
    font-weight: bold;
    text-transform: uppercase;
    margin-bottom: 4px;
  }
  .entry { margin-bottom: 8px; }
  .entry-header { display: flex; justify-content: space-between; align-items: baseline; }
  .entry-title { font-weight: bold; font-size: 11pt; }
  .entry-date { font-size: 10pt; margin-left: 8px; }
  .entry-subtitle { font-style: italic; font-size: 10.5pt; margin-top: 1px; }
  .entry-detail { font-size: 10.5pt; }
  ul.bullets { margin: 4px 0 0 18px; padding: 0; }
  ul.bullets li { margin-bottom: 3px; font-size: 10.5pt; list-style-type: disc; }
  .skill-row { margin-bottom: 4px; font-size: 10.5pt; }
  .skill-category { font-weight: bold; }
  @page { size: letter; margin: 0; }
"""
    else:
        css = """
  /* Standard ATS-safe: single column, borders */
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body {
    font-family: Arial, Helvetica, sans-serif;
    font-size: 10.5pt;
    line-height: 1.35;
    color: #000;
    background: #fff;
    padding: 0.6in 0.65in;
    max-width: 8.5in;
  }
  .resume-header {
    text-align: center;
    margin-bottom: 10px;
    border-bottom: 1.5px solid #000;
    padding-bottom: 8px;
  }
  .resume-name { font-size: 18pt; font-weight: bold; letter-spacing: 0.5px; }
  .resume-contact { font-size: 9.5pt; margin-top: 3px; }
  .resume-section { margin-top: 10px; }
  .section-heading {
    font-size: 11pt;
    font-weight: bold;
    text-transform: uppercase;
    letter-spacing: 0.8px;
    border-bottom: 1px solid #000;
    margin-bottom: 5px;
    padding-bottom: 2px;
  }
  .entry { margin-bottom: 7px; }
  .entry-header { display: flex; justify-content: space-between; align-items: baseline; }
  .entry-title { font-weight: bold; font-size: 10.5pt; }
  .entry-date { font-size: 10pt; white-space: nowrap; margin-left: 8px; }
  .entry-subtitle { font-style: italic; font-size: 10pt; margin-top: 1px; }
  .entry-detail { font-size: 10pt; }
  ul.bullets { margin: 3px 0 0 16px; padding: 0; }
  ul.bullets li { margin-bottom: 2px; font-size: 10.5pt; list-style-type: disc; }
  .skill-row { margin-bottom: 3px; font-size: 10.5pt; }
  .skill-category { font-weight: bold; }
  @page { size: letter; margin: 0; }
"""

    html = f"""<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<title>{name} - Resume</title>
<style>{css}</style>
</head>
<body>
  <header class="resume-header">
    <div class="resume-name">{name}</div>
    <div class="resume-contact">{contact_line}</div>
  </header>
  <main>
    {sections_html}
  </main>
</body>
</html>"""

    return html


async def render_pdf(resume: ResumeOut, template: str = "clean") -> bytes:
    """Render resume to a real selectable-text PDF using Playwright."""
    html_content = build_html(resume, template)

    async with async_playwright() as p:
        browser = await p.chromium.launch()
        page = await browser.new_page()
        await page.set_content(html_content, wait_until="networkidle")
        pdf_bytes = await page.pdf(
            format="Letter",
            print_background=True,
            margin={"top": "0", "right": "0", "bottom": "0", "left": "0"},
        )
        await browser.close()

    return pdf_bytes


def get_html(resume: ResumeOut, template: str = "clean") -> str:
    return build_html(resume, template)
