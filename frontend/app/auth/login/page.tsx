"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { authApi } from "@/lib/api";

const schema = z.object({
  email: z.string().email("Enter a valid email address."),
  password: z.string().min(8, "Password must be at least 8 characters."),
});
type FormData = z.infer<typeof schema>;

export default function LoginPage() {
  const router = useRouter();
  const [serverError, setServerError] = useState("");
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormData>({ resolver: zodResolver(schema) });

  const onSubmit = async (data: FormData) => {
    setServerError("");
    try {
      const res = await authApi.login(data.email, data.password);
      localStorage.setItem("ats_token", res.data.access_token);
      router.push("/dashboard");
    } catch (err: unknown) {
      const e = err as { response?: { data?: { detail?: string } } };
      setServerError(e.response?.data?.detail || "Login failed. Check your credentials.");
    }
  };

  return (
    <AuthLayout title="Sign in" subtitle="Continue building your resume.">
      <form onSubmit={handleSubmit(onSubmit)} style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
        <div className="form-group">
          <label className="form-label" htmlFor="login-email">Email</label>
          <input
            id="login-email"
            className="form-input"
            type="email"
            placeholder="you@example.com"
            {...register("email")}
          />
          {errors.email && <span className="form-error">{errors.email.message}</span>}
        </div>
        <div className="form-group">
          <label className="form-label" htmlFor="login-password">Password</label>
          <input
            id="login-password"
            className="form-input"
            type="password"
            placeholder="Min. 8 characters"
            {...register("password")}
          />
          {errors.password && <span className="form-error">{errors.password.message}</span>}
        </div>
        {serverError && (
          <div className="alert alert-error" style={{ fontSize: "0.85rem" }}>{serverError}</div>
        )}
        <button
          id="login-submit"
          type="submit"
          className="btn btn-primary"
          disabled={isSubmitting}
          style={{ marginTop: "0.5rem", justifyContent: "center" }}
        >
          {isSubmitting ? "Signing in..." : "Sign in"}
        </button>
        <p style={{ textAlign: "center", fontSize: "0.85rem", color: "var(--text-muted)" }}>
          No account?{" "}
          <Link href="/auth/register" style={{ color: "var(--accent)", textDecoration: "none" }}>
            Create one
          </Link>
        </p>
      </form>
    </AuthLayout>
  );
}

function AuthLayout({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle: string;
  children: React.ReactNode;
}) {
  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "2rem 1rem",
        background: "var(--bg-base)",
      }}
    >
      <div style={{ width: "100%", maxWidth: "400px" }}>
        <div style={{ textAlign: "center", marginBottom: "2rem" }}>
          <Link href="/" style={{ display: "inline-flex", alignItems: "center", gap: "0.5rem", textDecoration: "none" }}>
            <svg width="28" height="28" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
              <rect x="2" y="2" width="28" height="28" rx="6" fill="#1a2236" stroke="#2dd4bf" strokeWidth="1.5"/>
              <rect x="7" y="5" width="18" height="22" rx="2" fill="#111827" stroke="#1e2d45" strokeWidth="1"/>
              <line x1="10" y1="10" x2="22" y2="10" stroke="#2dd4bf" strokeWidth="1.5" strokeLinecap="round"/>
              <line x1="10" y1="13.5" x2="22" y2="13.5" stroke="#64748b" strokeWidth="1" strokeLinecap="round"/>
              <line x1="10" y1="17" x2="18" y2="17" stroke="#64748b" strokeWidth="1" strokeLinecap="round"/>
            </svg>
            <span style={{ fontWeight: 700, color: "var(--text-primary)" }}>ATS Builder</span>
          </Link>
          <h1 style={{ marginTop: "1.5rem", fontSize: "1.5rem", color: "var(--text-primary)" }}>{title}</h1>
          <p style={{ color: "var(--text-muted)", fontSize: "0.875rem", marginTop: "0.25rem" }}>{subtitle}</p>
        </div>
        <div className="card">{children}</div>
      </div>
    </div>
  );
}
