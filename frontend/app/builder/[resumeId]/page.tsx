"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { resumeApi } from "@/lib/api";
import { AppNav } from "@/app/dashboard/page";
import Link from "next/link";

export default function EditResumePage() {
  const params = useParams();
  const router = useRouter();
  const resumeId = params.resumeId as string;
  const [loading, setLoading] = useState(true);
  const [resume, setResume] = useState<Record<string, unknown> | null>(null);

  useEffect(() => {
    const token = localStorage.getItem("ats_token");
    if (!token) {
      router.push("/auth/login");
      return;
    }
    loadResume();
  }, [resumeId, router]);

  async function loadResume() {
    try {
      const res = await resumeApi.get(resumeId);
      setResume(res.data);
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return (
      <div style={{ minHeight: "100vh", background: "var(--bg-base)" }}>
        <AppNav />
        <div className="container" style={{ padding: "3rem 1.5rem" }}>
          <div className="skeleton" style={{ height: "40px", width: "300px", marginBottom: "1rem" }} />
          <div className="skeleton" style={{ height: "400px" }} />
        </div>
      </div>
    );
  }

  return (
    <div style={{ minHeight: "100vh", background: "var(--bg-base)" }}>
      <AppNav />
      <main className="container" style={{ padding: "2rem 1.5rem", maxWidth: "760px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "2rem", flexWrap: "wrap", gap: "0.75rem" }}>
          <div>
            <Link href="/dashboard" style={{ color: "var(--text-muted)", fontSize: "0.8rem", textDecoration: "none" }}>Dashboard</Link>
            <span style={{ color: "var(--text-muted)", margin: "0 0.4rem" }}>/</span>
            <span style={{ fontSize: "0.8rem", color: "var(--text-secondary)" }}>{(resume as { title?: string })?.title || "Resume"}</span>
          </div>
          <Link href={`/builder/${resumeId}/score`} className="btn btn-primary btn-sm">
            Score and export
          </Link>
        </div>

        <div className="card" style={{ padding: "2rem", textAlign: "center" }}>
          <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ margin: "0 auto 1rem" }}>
            <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
            <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
          </svg>
          <h2 style={{ fontSize: "1.1rem", fontWeight: 700, marginBottom: "0.5rem" }}>Edit resume</h2>
          <p style={{ color: "var(--text-secondary)", fontSize: "0.875rem", marginBottom: "1.5rem" }}>
            In the full build, this page will load the multi-step form pre-populated with your existing resume data.
            For now, you can view the raw data below or proceed to Score and Export.
          </p>
          <pre
            style={{
              background: "var(--bg-elevated)",
              border: "1px solid var(--bg-border)",
              borderRadius: 8,
              padding: "1rem",
              fontSize: "0.75rem",
              textAlign: "left",
              overflow: "auto",
              maxHeight: "400px",
              color: "var(--text-secondary)",
              lineHeight: 1.6,
            }}
          >
            {JSON.stringify(resume, null, 2)}
          </pre>
        </div>
      </main>
    </div>
  );
}
