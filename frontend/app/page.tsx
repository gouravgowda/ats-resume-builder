"use client";

import Link from "next/link";

export default function HomePage() {
  return (
    <div className="min-h-screen" style={{ background: "var(--bg-base)" }}>
      {/* ── Navigation ── */}
      <nav
        style={{
          borderBottom: "1px solid var(--bg-border)",
          background: "rgba(10,14,26,0.9)",
          backdropFilter: "blur(12px)",
          position: "sticky",
          top: 0,
          zIndex: 50,
        }}
      >
        <div
          className="container"
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            height: "56px",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "0.625rem" }}>
            <svg width="24" height="24" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
              <rect x="2" y="2" width="28" height="28" rx="6" fill="#1a2236" stroke="#2dd4bf" strokeWidth="1.5"/>
              <rect x="7" y="5" width="18" height="22" rx="2" fill="#111827" stroke="#1e2d45" strokeWidth="1"/>
              <line x1="10" y1="10" x2="22" y2="10" stroke="#2dd4bf" strokeWidth="1.5" strokeLinecap="round"/>
              <line x1="10" y1="13.5" x2="22" y2="13.5" stroke="#64748b" strokeWidth="1" strokeLinecap="round"/>
              <line x1="10" y1="17" x2="18" y2="17" stroke="#64748b" strokeWidth="1" strokeLinecap="round"/>
              <line x1="10" y1="20.5" x2="20" y2="20.5" stroke="#64748b" strokeWidth="1" strokeLinecap="round"/>
            </svg>
            <span style={{ fontWeight: 700, fontSize: "1rem", color: "var(--text-primary)", letterSpacing: "-0.01em" }}>
              ATS Builder
            </span>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
            <Link href="/auth/login" className="btn btn-ghost btn-sm">
              Sign in
            </Link>
            <Link href="/auth/register" className="btn btn-primary btn-sm">
              Get started
            </Link>
          </div>
        </div>
      </nav>

      {/* ── Hero ── */}
      <section style={{ padding: "5rem 0 4rem" }}>
        <div className="container" style={{ maxWidth: "760px" }}>
          {/* Specific capability badge — no vague copy */}
          <div style={{ marginBottom: "1.5rem" }}>
            <span className="badge badge-accent">
              ATS-parseable PDF resumes
            </span>
          </div>

          <h1
            style={{
              fontSize: "clamp(2.25rem, 5vw, 3.5rem)",
              fontWeight: 800,
              color: "var(--text-primary)",
              lineHeight: 1.1,
              marginBottom: "1.25rem",
            }}
          >
            Build a resume that{" "}
            <span style={{ color: "var(--accent)" }}>ATS parsers can read</span>
            {" "}and hiring managers actually want to see.
          </h1>

          <p
            style={{
              fontSize: "1.125rem",
              color: "var(--text-secondary)",
              lineHeight: 1.7,
              marginBottom: "2rem",
              maxWidth: "600px",
            }}
          >
            Generates a single-column resume as a real selectable-text PDF (not an image).
            Re-extracts the PDF immediately after generation and diffs it against your input
            to verify parse accuracy. Scores keyword overlap against a pasted job description.
            Rewrites weak bullets into action-verb, metric-driven statements.
          </p>

          <div style={{ display: "flex", gap: "0.75rem", flexWrap: "wrap" }}>
            <Link href="/auth/register" className="btn btn-primary btn-lg">
              Start building
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M5 12h14M12 5l7 7-7 7"/>
              </svg>
            </Link>
            <a
              href="https://github.com"
              className="btn btn-secondary btn-lg"
              target="_blank"
              rel="noopener noreferrer"
            >
              View source
            </a>
          </div>
        </div>
      </section>

      {/* ── What it actually does (specific claims only) ── */}
      <section style={{ padding: "3rem 0" }}>
        <div className="container">
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
              gap: "1rem",
            }}
          >
            {FEATURES.map((f) => (
              <div key={f.title} className="card">
                <div
                  style={{
                    width: 36,
                    height: 36,
                    borderRadius: 8,
                    background: "var(--accent-glow)",
                    border: "1px solid rgba(45,212,191,0.2)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    marginBottom: "0.875rem",
                  }}
                >
                  <f.Icon size={18} color="var(--accent)" />
                </div>
                <h3 style={{ fontSize: "0.95rem", fontWeight: 700, marginBottom: "0.4rem", color: "var(--text-primary)" }}>
                  {f.title}
                </h3>
                <p style={{ fontSize: "0.85rem", color: "var(--text-secondary)", lineHeight: 1.6 }}>
                  {f.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── How parse-back verification works (the core differentiator) ── */}
      <section style={{ padding: "3rem 0" }}>
        <div className="container" style={{ maxWidth: "700px" }}>
          <div className="card" style={{ border: "1px solid rgba(45,212,191,0.25)" }}>
            <span className="badge badge-accent" style={{ marginBottom: "1rem", display: "inline-flex" }}>
              Core technical differentiator
            </span>
            <h2 style={{ fontSize: "1.25rem", marginBottom: "0.75rem" }}>Parse-back verification loop</h2>
            <p style={{ color: "var(--text-secondary)", fontSize: "0.9rem", lineHeight: 1.7, marginBottom: "1rem" }}>
              After generating your PDF, the app immediately re-extracts its text using PyMuPDF
              and diffs it against your original structured input. If a section is missing, out of order,
              or garbled, export is blocked until the issue is resolved. No other resume tool does this.
            </p>
            <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
              {PARSE_STEPS.map((step, i) => (
                <div key={i} style={{ display: "flex", alignItems: "flex-start", gap: "0.75rem" }}>
                  <span
                    style={{
                      minWidth: 22,
                      height: 22,
                      borderRadius: "50%",
                      background: "var(--accent-glow)",
                      border: "1px solid rgba(45,212,191,0.3)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontSize: "0.7rem",
                      fontWeight: 700,
                      color: "var(--accent)",
                      marginTop: 2,
                      flexShrink: 0,
                    }}
                  >
                    {i + 1}
                  </span>
                  <span style={{ fontSize: "0.875rem", color: "var(--text-secondary)" }}>{step}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── Scoring disclaimer (required by PRD) ── */}
      <section style={{ padding: "2rem 0 4rem" }}>
        <div className="container" style={{ maxWidth: "700px" }}>
          <div className="alert alert-info">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0, marginTop: 2 }}>
              <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
            </svg>
            <div>
              <strong>About the score:</strong> The score this tool produces is a proxy for
              ATS parseability and keyword overlap. It does not predict your ranking inside
              Workday, Greenhouse, Lever, or any other employer&apos;s proprietary system.
              No universal ATS score exists.
            </div>
          </div>
        </div>
      </section>

      {/* ── Footer ── */}
      <footer
        style={{
          borderTop: "1px solid var(--bg-border)",
          padding: "1.5rem 0",
          color: "var(--text-muted)",
          fontSize: "0.8rem",
        }}
      >
        <div
          className="container"
          style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "0.5rem" }}
        >
          <span>ATS Builder</span>
          <span style={{ color: "var(--text-muted)" }}>
            Generates real selectable-text PDF resumes and verifies parse accuracy.
          </span>
        </div>
      </footer>
    </div>
  );
}

// ── Feature data ──────────────────────────────────────────────────────────────
// All claims are specific and true — no vague marketing copy
function FileTextIcon({ size, color }: { size: number; color: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
      <polyline points="14 2 14 8 20 8"/>
      <line x1="16" y1="13" x2="8" y2="13"/>
      <line x1="16" y1="17" x2="8" y2="17"/>
      <polyline points="10 9 9 9 8 9"/>
    </svg>
  );
}
function CheckCircleIcon({ size, color }: { size: number; color: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/>
      <polyline points="22 4 12 14.01 9 11.01"/>
    </svg>
  );
}
function SearchIcon({ size, color }: { size: number; color: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="11" cy="11" r="8"/>
      <line x1="21" y1="21" x2="16.65" y2="16.65"/>
    </svg>
  );
}
function ZapIcon({ size, color }: { size: number; color: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/>
    </svg>
  );
}
function DownloadIcon({ size, color }: { size: number; color: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
      <polyline points="7 10 12 15 17 10"/>
      <line x1="12" y1="15" x2="12" y2="3"/>
    </svg>
  );
}

const FEATURES = [
  {
    Icon: FileTextIcon,
    title: "ATS-safe PDF export",
    description:
      "Single-column layout. No tables, images, icons, or text boxes. Selectable text — not a flattened image. Generated via Playwright headless browser.",
  },
  {
    Icon: CheckCircleIcon,
    title: "Parse-back verification",
    description:
      "Immediately re-extracts the generated PDF with PyMuPDF and diffs it against your input. Export is blocked until parse accuracy reaches 95%.",
  },
  {
    Icon: SearchIcon,
    title: "JD keyword scoring",
    description:
      "Paste a job description. The app extracts required skills and shows which ones are present, missing, or need reinforcing in your bullets.",
  },
  {
    Icon: ZapIcon,
    title: "Bullet rewriting",
    description:
      "Claude rewrites weak bullets into action-verb + task + method + measurable result. Never invents a number. Asks you directly if a metric is missing.",
  },
  {
    Icon: DownloadIcon,
    title: "PDF and DOCX export",
    description:
      "Both formats generated from the same structured data. DOCX via python-docx. PDF via Playwright — real selectable text, not an image.",
  },
];

const PARSE_STEPS = [
  "You fill in structured fields — education, experience, projects, skills.",
  "The app renders a single-column ATS-safe HTML resume and converts it to PDF via Playwright.",
  "The PDF is immediately re-parsed with PyMuPDF to extract all text.",
  "The extracted text is diffed against your original input section by section.",
  "If any section is missing, out of order, or garbled, export is blocked with a specific error.",
  "Once parse accuracy is 95% or above, you can download the PDF or DOCX.",
];
