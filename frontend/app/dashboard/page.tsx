"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { resumeApi } from "@/lib/api";

interface ResumeSummary {
  id: string;
  title: string;
  created_at: string;
  updated_at: string;
  is_tailored_copy_of: string | null;
}

export default function DashboardPage() {
  const router = useRouter();
  const [resumes, setResumes] = useState<ResumeSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  useEffect(() => {
    const token = localStorage.getItem("ats_token");
    if (!token) {
      router.push("/auth/login");
      return;
    }
    loadResumes();
  }, [router]);

  async function loadResumes() {
    try {
      const res = await resumeApi.list();
      setResumes(res.data);
    } catch {
      // handled by interceptor
    } finally {
      setLoading(false);
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("Delete this resume? This cannot be undone.")) return;
    setDeletingId(id);
    try {
      await resumeApi.delete(id);
      setResumes((prev) => prev.filter((r) => r.id !== id));
    } finally {
      setDeletingId(null);
    }
  }

  function formatDate(iso: string) {
    return new Date(iso).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  }

  return (
    <div style={{ minHeight: "100vh", background: "var(--bg-base)" }}>
      <AppNav />
      <main className="container" style={{ padding: "2rem 1.5rem" }}>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: "2rem",
          }}
        >
          <div>
            <h1 style={{ fontSize: "1.5rem", fontWeight: 700, marginBottom: "0.25rem" }}>
              Your resumes
            </h1>
            <p style={{ color: "var(--text-secondary)", fontSize: "0.875rem" }}>
              Build, score, and export ATS-parseable resumes.
            </p>
          </div>
          <Link href="/builder/new" className="btn btn-primary" id="create-resume-btn">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
            </svg>
            New resume
          </Link>
        </div>

        {loading ? (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: "1rem" }}>
            {[1, 2, 3].map((i) => (
              <div key={i} className="card skeleton" style={{ height: "140px" }} />
            ))}
          </div>
        ) : resumes.length === 0 ? (
          <div className="card" style={{ textAlign: "center", padding: "3rem", maxWidth: "440px", margin: "0 auto" }}>
            <div
              style={{
                width: 56,
                height: 56,
                borderRadius: 12,
                background: "var(--accent-glow)",
                border: "1px solid rgba(45,212,191,0.2)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                margin: "0 auto 1rem",
              }}
            >
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                <polyline points="14 2 14 8 20 8"/>
                <line x1="12" y1="18" x2="12" y2="12"/><line x1="9" y1="15" x2="15" y2="15"/>
              </svg>
            </div>
            <h3 style={{ fontSize: "1rem", fontWeight: 600, marginBottom: "0.5rem" }}>No resumes yet</h3>
            <p style={{ color: "var(--text-muted)", fontSize: "0.875rem", marginBottom: "1.25rem" }}>
              Build your first ATS-parseable resume.
            </p>
            <Link href="/builder/new" className="btn btn-primary" style={{ justifyContent: "center" }}>
              Create resume
            </Link>
          </div>
        ) : (
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))",
              gap: "1rem",
            }}
          >
            {resumes.map((r) => (
              <div
                key={r.id}
                className="card animate-fade-in"
                style={{ display: "flex", flexDirection: "column", justifyContent: "space-between", gap: "1rem" }}
              >
                <div>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "0.5rem", marginBottom: "0.5rem" }}>
                    <h3 style={{ fontSize: "0.95rem", fontWeight: 700, lineHeight: 1.3 }}>{r.title}</h3>
                    {r.is_tailored_copy_of && (
                      <span className="badge badge-accent" style={{ flexShrink: 0 }}>Tailored</span>
                    )}
                  </div>
                  <p style={{ fontSize: "0.78rem", color: "var(--text-muted)" }}>
                    Updated {formatDate(r.updated_at)}
                  </p>
                </div>
                <div style={{ display: "flex", gap: "0.5rem" }}>
                  <Link
                    href={`/builder/${r.id}`}
                    className="btn btn-secondary btn-sm"
                    id={`edit-resume-${r.id}`}
                  >
                    Edit
                  </Link>
                  <Link
                    href={`/builder/${r.id}/score`}
                    className="btn btn-ghost btn-sm"
                    id={`score-resume-${r.id}`}
                  >
                    Score
                  </Link>
                  <button
                    className="btn btn-danger btn-sm"
                    id={`delete-resume-${r.id}`}
                    onClick={() => handleDelete(r.id)}
                    disabled={deletingId === r.id}
                    style={{ marginLeft: "auto" }}
                  >
                    {deletingId === r.id ? "..." : "Delete"}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}

export function AppNav() {
  const router = useRouter();
  function logout() {
    localStorage.removeItem("ats_token");
    router.push("/");
  }
  return (
    <nav
      style={{
        borderBottom: "1px solid var(--bg-border)",
        background: "rgba(10,14,26,0.95)",
        backdropFilter: "blur(12px)",
        position: "sticky",
        top: 0,
        zIndex: 50,
      }}
    >
      <div
        className="container"
        style={{ display: "flex", alignItems: "center", justifyContent: "space-between", height: "56px" }}
      >
        <Link
          href="/dashboard"
          style={{ display: "flex", alignItems: "center", gap: "0.625rem", textDecoration: "none" }}
        >
          <svg width="22" height="22" viewBox="0 0 32 32" fill="none">
            <rect x="2" y="2" width="28" height="28" rx="6" fill="#1a2236" stroke="#2dd4bf" strokeWidth="1.5"/>
            <rect x="7" y="5" width="18" height="22" rx="2" fill="#111827" stroke="#1e2d45" strokeWidth="1"/>
            <line x1="10" y1="10" x2="22" y2="10" stroke="#2dd4bf" strokeWidth="1.5" strokeLinecap="round"/>
            <line x1="10" y1="13.5" x2="22" y2="13.5" stroke="#64748b" strokeWidth="1" strokeLinecap="round"/>
            <line x1="10" y1="17" x2="18" y2="17" stroke="#64748b" strokeWidth="1" strokeLinecap="round"/>
          </svg>
          <span style={{ fontWeight: 700, fontSize: "0.95rem", color: "var(--text-primary)" }}>ATS Builder</span>
        </Link>
        <button onClick={logout} className="btn btn-ghost btn-sm" id="logout-btn">
          Sign out
        </button>
      </div>
    </nav>
  );
}
