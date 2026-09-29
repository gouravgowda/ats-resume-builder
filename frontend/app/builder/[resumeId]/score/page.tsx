"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { scoreApi, parseCheckApi, renderApi, downloadBlob, tailorApi } from "@/lib/api";
import { AppNav } from "@/app/dashboard/page";
import Link from "next/link";

interface ScoreBreakdownItem {
  score: number;
  weight: number;
  weighted: number;
  explanation: string;
  items: string[];
  matched?: string[];
  missing?: string[];
}

interface ScoreData {
  id: string;
  total_score: number;
  parse_score: number;
  keyword_score: number;
  bullet_score: number;
  completeness_score: number;
  formatting_score: number;
  breakdown: {
    parse_quality: ScoreBreakdownItem;
    jd_keyword_match: ScoreBreakdownItem;
    bullet_quality: ScoreBreakdownItem;
    completeness: ScoreBreakdownItem;
    formatting_consistency: ScoreBreakdownItem;
    disclaimer: string;
  };
  disclaimer: string;
}

interface ParseCheckData {
  passed: boolean;
  sections_found: string[];
  sections_missing: string[];
  order_correct: boolean;
  issues: string[];
  accuracy: number;
}

export default function ScorePage() {
  const params = useParams();
  const router = useRouter();
  const resumeId = params.resumeId as string;

  const [jdText, setJdText] = useState("");
  const [scoring, setScoring] = useState(false);
  const [score, setScore] = useState<ScoreData | null>(null);
  const [parseResult, setParseResult] = useState<ParseCheckData | null>(null);
  const [parseRunning, setParseRunning] = useState(false);
  const [downloading, setDownloading] = useState<"pdf" | "docx" | null>(null);
  const [tailoring, setTailoring] = useState(false);
  const [tailorResult, setTailorResult] = useState<{ matched: string[]; missing: string[]; suggestions: string[]; tailoredId: string } | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    const token = localStorage.getItem("ats_token");
    if (!token) router.push("/auth/login");
  }, [router]);

  async function handleParseCheck() {
    setParseRunning(true);
    setError("");
    try {
      const res = await parseCheckApi.run(resumeId);
      setParseResult(res.data);
    } catch {
      setError("Parse check failed.");
    } finally {
      setParseRunning(false);
    }
  }

  async function handleScore() {
    setScoring(true);
    setError("");
    try {
      const res = await scoreApi.run(resumeId, jdText || undefined);
      setScore(res.data);
    } catch {
      setError("Scoring failed.");
    } finally {
      setScoring(false);
    }
  }

  const [template, setTemplate] = useState("clean");

  async function handleDownload(format: "pdf" | "docx") {
    setDownloading(format);
    setError("");
    try {
      const res = await renderApi.download(resumeId, format, template);
      downloadBlob(res.data as Blob, `resume.${format}`);
    } catch {
      setError(`Download failed. Check that the backend is running, then retry.`);
    } finally {
      setDownloading(null);
    }
  }

  async function handleTailor() {
    if (!jdText) return;
    setTailoring(true);
    setError("");
    try {
      const res = await tailorApi.run(resumeId, jdText);
      setTailorResult({
        matched: res.data.keywords_matched,
        missing: res.data.keywords_missing,
        suggestions: res.data.suggestions,
        tailoredId: res.data.tailored_resume_id,
      });
    } catch {
      setError("Tailoring failed. Check that the backend is running, then retry.");
    } finally {
      setTailoring(false);
    }
  }

  const totalPct = score ? Math.round(score.total_score * 100) : null;
  const scoreColor = totalPct == null ? "var(--accent)" : totalPct >= 75 ? "var(--success)" : totalPct >= 50 ? "var(--warning)" : "var(--error)";

  return (
    <div style={{ minHeight: "100vh", background: "var(--bg-base)" }}>
      <AppNav />
      <main className="container" style={{ padding: "2rem 1.5rem", maxWidth: "860px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "2rem", flexWrap: "wrap", gap: "0.75rem" }}>
          <div>
            <Link href="/dashboard" style={{ color: "var(--text-muted)", fontSize: "0.8rem", textDecoration: "none" }}>
              Dashboard
            </Link>
            <span style={{ color: "var(--text-muted)", margin: "0 0.4rem" }}>/</span>
            <span style={{ fontSize: "0.8rem", color: "var(--text-secondary)" }}>Score &amp; Export</span>
          </div>
          <div style={{ display: "flex", gap: "0.5rem" }}>
            <Link href={`/builder/${resumeId}`} className="btn btn-ghost btn-sm">Edit resume</Link>
          </div>
        </div>

        {/* ── Parse-back verification (shown first — core differentiator) ── */}
        <div className="card" style={{ marginBottom: "1.5rem" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "1rem", flexWrap: "wrap", gap: "0.75rem" }}>
            <div>
              <h2 style={{ fontSize: "1rem", fontWeight: 700, marginBottom: "0.25rem" }}>Parse-back verification</h2>
              <p style={{ fontSize: "0.825rem", color: "var(--text-secondary)" }}>
                Generates your PDF and immediately re-extracts its text. Export is blocked if accuracy &lt; 95%.
              </p>
            </div>
            <button
              className="btn btn-secondary btn-sm"
              onClick={handleParseCheck}
              disabled={parseRunning}
              id="run-parse-check-btn"
            >
              {parseRunning ? "Running..." : "Run parse check"}
            </button>
          </div>

          {parseResult && (
            <div className="animate-fade-in">
              <div style={{ display: "flex", gap: "0.75rem", alignItems: "center", marginBottom: "0.875rem", flexWrap: "wrap" }}>
                <span className={`badge ${parseResult.passed ? "badge-success" : "badge-error"}`}>
                  {parseResult.passed ? "Passed" : "Failed"}
                </span>
                <span style={{ fontSize: "0.875rem", color: "var(--text-secondary)" }}>
                  Parse accuracy: <strong style={{ color: "var(--text-primary)" }}>{Math.round(parseResult.accuracy * 100)}%</strong>
                </span>
                <span className={`badge ${parseResult.order_correct ? "badge-success" : "badge-warning"}`}>
                  {parseResult.order_correct ? "Order correct" : "Order incorrect"}
                </span>
              </div>

              <div style={{ display: "flex", gap: "1rem", marginBottom: "0.875rem", flexWrap: "wrap" }}>
                {parseResult.sections_found.length > 0 && (
                  <div>
                    <div style={{ fontSize: "0.75rem", fontWeight: 600, color: "var(--success)", marginBottom: "0.25rem", textTransform: "uppercase", letterSpacing: "0.05em" }}>Found</div>
                    <div style={{ display: "flex", gap: "0.375rem", flexWrap: "wrap" }}>
                      {parseResult.sections_found.map((s) => (
                        <span key={s} className="badge badge-success">{s}</span>
                      ))}
                    </div>
                  </div>
                )}
                {parseResult.sections_missing.length > 0 && (
                  <div>
                    <div style={{ fontSize: "0.75rem", fontWeight: 600, color: "var(--error)", marginBottom: "0.25rem", textTransform: "uppercase", letterSpacing: "0.05em" }}>Missing</div>
                    <div style={{ display: "flex", gap: "0.375rem", flexWrap: "wrap" }}>
                      {parseResult.sections_missing.map((s) => (
                        <span key={s} className="badge badge-error">{s}</span>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {parseResult.issues.length > 0 && (
                <div style={{ display: "flex", flexDirection: "column", gap: "0.375rem" }}>
                  {parseResult.issues.map((issue, i) => (
                    <div key={i} className="alert alert-error" style={{ fontSize: "0.8rem", padding: "0.5rem 0.75rem" }}>
                      {issue}
                    </div>
                  ))}
                </div>
              )}

              {!parseResult.passed && (
                <div className="alert alert-warning" style={{ marginTop: "0.75rem" }}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
                    <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/>
                  </svg>
                  Export is blocked until parse accuracy reaches 95% or above. Fix the issues above, then re-run.
                </div>
              )}
            </div>
          )}
        </div>

        {/* ── Export ── */}
        <div className="card" style={{ marginBottom: "1.5rem" }}>
          <h2 style={{ fontSize: "1rem", fontWeight: 700, marginBottom: "0.25rem" }}>Export resume</h2>
          <p style={{ fontSize: "0.825rem", color: "var(--text-secondary)", marginBottom: "1rem" }}>
            PDF via Playwright (real selectable text). DOCX via python-docx.
            {parseResult && !parseResult.passed && (
              <span style={{ color: "var(--error)" }}> Export blocked — fix parse errors first.</span>
            )}
          </p>
          <div style={{ display: "flex", gap: "0.625rem", flexWrap: "wrap", alignItems: "center" }}>
            <select 
              className="form-input" 
              style={{ width: "auto", padding: "0.25rem 0.5rem", height: "auto" }}
              value={template} 
              onChange={e => setTemplate(e.target.value)}
            >
              <option value="clean">Clean (Standard)</option>
              <option value="minimal">Minimal (No borders)</option>
            </select>
            <button
              className="btn btn-primary btn-sm"
              onClick={() => handleDownload("pdf")}
              disabled={downloading !== null || (parseResult !== null && !parseResult.passed)}
              id="download-pdf-btn"
            >
              {downloading === "pdf" ? "Generating..." : "Download PDF"}
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/>
              </svg>
            </button>
            <button
              className="btn btn-secondary btn-sm"
              onClick={() => handleDownload("docx")}
              disabled={downloading !== null || (parseResult !== null && !parseResult.passed)}
              id="download-docx-btn"
            >
              {downloading === "docx" ? "Generating..." : "Download DOCX"}
            </button>
          </div>
        </div>

        {/* ── Scoring ── */}
        <div className="card" style={{ marginBottom: "1.5rem" }}>
          <h2 style={{ fontSize: "1rem", fontWeight: 700, marginBottom: "0.25rem" }}>Resume score</h2>
          <p style={{ fontSize: "0.825rem", color: "var(--text-secondary)", marginBottom: "1rem" }}>
            Paste a job description to include keyword match in the score. Otherwise only parse quality, bullet quality, completeness, and formatting are scored.
          </p>
          <div className="form-group" style={{ marginBottom: "0.875rem" }}>
            <label className="form-label" htmlFor="score-jd">Job description (optional)</label>
            <textarea
              id="score-jd"
              className="form-input"
              style={{ minHeight: "100px" }}
              placeholder="Paste job description here for keyword scoring..."
              value={jdText}
              onChange={(e) => setJdText(e.target.value)}
            />
          </div>
          <button
            className="btn btn-primary btn-sm"
            onClick={handleScore}
            disabled={scoring}
            id="run-score-btn"
          >
            {scoring ? "Scoring..." : "Run score"}
          </button>

          {error && <div className="alert alert-error" style={{ marginTop: "0.75rem" }}>{error}</div>}

          {score && (
            <div className="animate-fade-in" style={{ marginTop: "1.25rem" }}>
              {/* Total score ring-like display */}
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "1.25rem",
                  padding: "1rem 1.25rem",
                  background: "var(--bg-elevated)",
                  borderRadius: 10,
                  border: "1px solid var(--bg-border)",
                  marginBottom: "1.25rem",
                }}
              >
                <div
                  style={{
                    width: 68,
                    height: 68,
                    borderRadius: "50%",
                    border: `4px solid ${scoreColor}`,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    flexShrink: 0,
                    boxShadow: `0 0 18px ${scoreColor}33`,
                  }}
                >
                  <span style={{ fontSize: "1.25rem", fontWeight: 800, color: scoreColor }}>{totalPct}</span>
                </div>
                <div>
                  <div style={{ fontWeight: 700, fontSize: "1rem", marginBottom: "0.2rem" }}>
                    Total proxy score: {totalPct}/100
                  </div>
                  <div style={{ fontSize: "0.78rem", color: "var(--text-secondary)", lineHeight: 1.5 }}>
                    {score.disclaimer}
                  </div>
                </div>
              </div>

              {/* Breakdown */}
              <div style={{ display: "flex", flexDirection: "column", gap: "0.875rem" }}>
                {[
                  {
                    key: "parse_quality",
                    label: "Parse quality",
                    weight: "30%",
                    data: score.breakdown.parse_quality,
                  },
                  {
                    key: "jd_keyword_match",
                    label: "JD keyword match",
                    weight: "30%",
                    data: score.breakdown.jd_keyword_match,
                  },
                  {
                    key: "bullet_quality",
                    label: "Bullet quality",
                    weight: "20%",
                    data: score.breakdown.bullet_quality,
                  },
                  {
                    key: "completeness",
                    label: "Completeness",
                    weight: "10%",
                    data: score.breakdown.completeness,
                  },
                  {
                    key: "formatting_consistency",
                    label: "Formatting consistency",
                    weight: "10%",
                    data: score.breakdown.formatting_consistency,
                  },
                ].map(({ key, label, weight, data }) => {
                  const pct = Math.round(data.score * 100);
                  const color = pct >= 75 ? "var(--success)" : pct >= 50 ? "var(--warning)" : "var(--error)";
                  const fillClass = pct >= 75 ? "progress-fill-success" : pct >= 50 ? "progress-fill-warning" : "progress-fill-error";
                  return (
                    <div key={key} style={{ background: "var(--bg-elevated)", borderRadius: 8, padding: "0.875rem", border: "1px solid var(--bg-border)" }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.5rem" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                          <span style={{ fontWeight: 600, fontSize: "0.875rem" }}>{label}</span>
                          <span style={{ fontSize: "0.72rem", color: "var(--text-muted)", background: "var(--bg-surface)", padding: "0.1rem 0.4rem", borderRadius: 4 }}>{weight}</span>
                        </div>
                        <span style={{ fontWeight: 700, color, fontSize: "0.9rem" }}>{pct}/100</span>
                      </div>
                      <div className="progress-bar">
                        <div
                          className={`progress-fill ${fillClass}`}
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                      <p style={{ fontSize: "0.775rem", color: "var(--text-secondary)", marginTop: "0.5rem" }}>
                        {data.explanation}
                      </p>
                      {data.items?.length > 0 && (
                        <ul style={{ marginTop: "0.375rem", paddingLeft: "1rem" }}>
                          {data.items.slice(0, 5).map((item, i) => (
                            <li key={i} style={{ fontSize: "0.775rem", color: "var(--warning)", marginBottom: "0.15rem" }}>{item}</li>
                          ))}
                          {data.items.length > 5 && (
                            <li style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>+{data.items.length - 5} more issues</li>
                          )}
                        </ul>
                      )}
                      {key === "jd_keyword_match" && (data.matched?.length || data.missing?.length) ? (
                        <div style={{ marginTop: "0.625rem", display: "flex", gap: "1rem", flexWrap: "wrap" }}>
                          {data.matched && data.matched.length > 0 && (
                            <div>
                              <div style={{ fontSize: "0.72rem", fontWeight: 600, color: "var(--success)", marginBottom: "0.25rem" }}>Matched</div>
                              <div style={{ display: "flex", gap: "0.25rem", flexWrap: "wrap" }}>
                                {data.matched.slice(0, 12).map((kw) => (
                                  <span key={kw} className="badge badge-success">{kw}</span>
                                ))}
                              </div>
                            </div>
                          )}
                          {data.missing && data.missing.length > 0 && (
                            <div>
                              <div style={{ fontSize: "0.72rem", fontWeight: 600, color: "var(--error)", marginBottom: "0.25rem" }}>Missing</div>
                              <div style={{ display: "flex", gap: "0.25rem", flexWrap: "wrap" }}>
                                {data.missing.slice(0, 12).map((kw) => (
                                  <span key={kw} className="badge badge-error">{kw}</span>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      ) : null}
                    </div>
                  );
                })}
              </div>

              <div className="alert alert-info" style={{ marginTop: "1rem" }}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
                  <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
                </svg>
                <span style={{ fontSize: "0.8rem" }}>{score.breakdown.disclaimer}</span>
              </div>
            </div>
          )}
        </div>

        {/* ── JD Tailoring ── */}
        {jdText && (
          <div className="card" style={{ marginBottom: "1.5rem" }}>
            <h2 style={{ fontSize: "1rem", fontWeight: 700, marginBottom: "0.25rem" }}>Create tailored copy</h2>
            <p style={{ fontSize: "0.825rem", color: "var(--text-secondary)", marginBottom: "1rem" }}>
              Creates a copy of this resume linked to the pasted job description. Only adds keywords you actually have; never fabricates skills.
            </p>
            <button
              className="btn btn-secondary btn-sm"
              onClick={handleTailor}
              disabled={tailoring}
              id="tailor-resume-btn"
            >
              {tailoring ? "Creating copy..." : "Create tailored copy"}
            </button>

            {tailorResult && (
              <div className="animate-fade-in" style={{ marginTop: "1rem" }}>
                <div style={{ display: "flex", gap: "1rem", flexWrap: "wrap", marginBottom: "0.875rem" }}>
                  <div>
                    <div style={{ fontSize: "0.72rem", fontWeight: 600, color: "var(--success)", marginBottom: "0.375rem", textTransform: "uppercase", letterSpacing: "0.05em" }}>
                      Keywords on your resume ({tailorResult.matched.length})
                    </div>
                    <div style={{ display: "flex", gap: "0.25rem", flexWrap: "wrap" }}>
                      {tailorResult.matched.slice(0, 10).map((kw) => (
                        <span key={kw} className="badge badge-success">{kw}</span>
                      ))}
                    </div>
                  </div>
                  {tailorResult.missing.length > 0 && (
                    <div>
                      <div style={{ fontSize: "0.72rem", fontWeight: 600, color: "var(--error)", marginBottom: "0.375rem", textTransform: "uppercase", letterSpacing: "0.05em" }}>
                        Missing from resume ({tailorResult.missing.length})
                      </div>
                      <div style={{ display: "flex", gap: "0.25rem", flexWrap: "wrap" }}>
                        {tailorResult.missing.slice(0, 10).map((kw) => (
                          <span key={kw} className="badge badge-error">{kw}</span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
                {tailorResult.suggestions.map((s, i) => (
                  <div key={i} className="alert alert-info" style={{ marginBottom: "0.5rem", fontSize: "0.825rem" }}>{s}</div>
                ))}
                <Link
                  href={`/builder/${tailorResult.tailoredId}/score`}
                  className="btn btn-primary btn-sm"
                  style={{ marginTop: "0.5rem", display: "inline-flex" }}
                >
                  Open tailored copy
                </Link>
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
}
