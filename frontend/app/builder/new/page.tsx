// @ts-nocheck
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm, useFieldArray, UseFormRegister, Control } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { resumeApi, bulletApi } from "@/lib/api";
import { AppNav } from "@/app/dashboard/page";

// ── Zod schema ────────────────────────────────────────────────────────────────
const bulletSchema = z.object({
  raw_text: z.string().min(5, "Bullet must be at least 5 characters."),
  order_index: z.number().default(0),
});

const contactSchema = z.object({
  full_name: z.string().min(1, "Name is required."),
  email: z.string().email("Enter a valid email."),
  phone: z.string().optional(),
  city: z.string().optional(),
  linkedin: z.string().optional(),
  github: z.string().optional(),
  portfolio: z.string().optional(),
});

const educationEntry = z.object({
  payload: z.object({
    institution: z.string().min(1, "Institution required."),
    degree: z.string().min(1, "Degree required."),
    field: z.string().min(1, "Field of study required."),
    start_date: z.string().optional(),
    end_date: z.string().optional(),
    gpa: z.string().optional(),
  }),
  order_index: z.number().default(0),
  bullets: z.array(bulletSchema).default([]),
});

const experienceEntry = z.object({
  payload: z.object({
    company: z.string().min(1, "Company required."),
    role: z.string().min(1, "Role required."),
    location: z.string().optional(),
    start_date: z.string().optional(),
    end_date: z.string().optional(),
  }),
  order_index: z.number().default(0),
  bullets: z.array(bulletSchema).default([]),
});

const projectEntry = z.object({
  payload: z.object({
    name: z.string().min(1, "Project name required."),
    tech_stack: z.string().optional(),
    start_date: z.string().optional(),
    end_date: z.string().optional(),
    link: z.string().optional(),
  }),
  order_index: z.number().default(0),
  bullets: z.array(bulletSchema).default([]),
});

const skillEntry = z.object({
  payload: z.object({
    groups: z.record(z.string()).default({}),
  }),
  order_index: z.number().default(0),
  bullets: z.array(bulletSchema).default([]),
});

const achievementEntry = z.object({
  payload: z.object({
    title: z.string().min(1, "Title required."),
    issuer: z.string().optional(),
    date: z.string().optional(),
  }),
  order_index: z.number().default(0),
  bullets: z.array(bulletSchema).default([]),
});

const formSchema = z.object({
  title: z.string().min(1, "Resume title required."),
  contact: contactSchema,
  education: z.array(educationEntry).default([]),
  experience: z.array(experienceEntry).default([]),
  projects: z.array(projectEntry).default([]),
  skills: z.object({
    languages: z.string().optional(),
    frameworks: z.string().optional(),
    tools: z.string().optional(),
    databases: z.string().optional(),
    other: z.string().optional(),
  }),
  achievements: z.array(achievementEntry).default([]),
  jd_text: z.string().optional(),
});

type FormData = z.infer<typeof formSchema>;

const STEPS = [
  { id: "contact", label: "Contact" },
  { id: "education", label: "Education" },
  { id: "experience", label: "Experience" },
  { id: "projects", label: "Projects" },
  { id: "skills", label: "Skills" },
  { id: "achievements", label: "Achievements" },
  { id: "jd", label: "Job Description" },
];

export default function NewResumeBuilder() {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const {
    register,
    control,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      title: "",
      contact: { full_name: "", email: "" },
      education: [],
      experience: [],
      projects: [],
      skills: {},
      achievements: [],
    },
  });

  const eduFields = useFieldArray({ control, name: "education" });
  const expFields = useFieldArray({ control, name: "experience" });
  const projFields = useFieldArray({ control, name: "projects" });
  const achFields = useFieldArray({ control, name: "achievements" });

  const onSubmit = async (data: FormData) => {
    setSaving(true);
    setError("");
    try {
      // Build sections array
      const sections = [];
      let idx = 0;

      if (data.education.length > 0) {
        sections.push({
          type: "education",
          order_index: idx++,
          entries: data.education.map((e, i) => ({ ...e, order_index: i })),
        });
      }
      if (data.experience.length > 0) {
        sections.push({
          type: "experience",
          order_index: idx++,
          entries: data.experience.map((e, i) => ({ ...e, order_index: i })),
        });
      }
      if (data.projects.length > 0) {
        sections.push({
          type: "project",
          order_index: idx++,
          entries: data.projects.map((e, i) => ({ ...e, order_index: i })),
        });
      }

      // Build skills
      const skillGroups: Record<string, string> = {};
      if (data.skills.languages) skillGroups["Languages"] = data.skills.languages;
      if (data.skills.frameworks) skillGroups["Frameworks"] = data.skills.frameworks;
      if (data.skills.tools) skillGroups["Tools"] = data.skills.tools;
      if (data.skills.databases) skillGroups["Databases"] = data.skills.databases;
      if (data.skills.other) skillGroups["Other"] = data.skills.other;
      if (Object.keys(skillGroups).length > 0) {
        sections.push({
          type: "skill",
          order_index: idx++,
          entries: [{ payload: { groups: skillGroups }, order_index: 0, bullets: [] }],
        });
      }

      if (data.achievements.length > 0) {
        sections.push({
          type: "achievement",
          order_index: idx++,
          entries: data.achievements.map((e, i) => ({ ...e, order_index: i })),
        });
      }

      const payload = {
        title: data.title,
        contact: data.contact,
        sections,
      };

      const res = await resumeApi.create(payload);
      const resumeId = res.data.id;
      router.push(`/builder/${resumeId}/score`);
    } catch (err: unknown) {
      const e = err as { response?: { data?: { detail?: string } } };
      setError(e.response?.data?.detail || "Failed to save resume.");
      setSaving(false);
    }
  };

  const totalSteps = STEPS.length;

  return (
    <div style={{ minHeight: "100vh", background: "var(--bg-base)" }}>
      <AppNav />

      {/* Step indicator */}
      <div style={{ borderBottom: "1px solid var(--bg-border)", background: "var(--bg-surface)", padding: "1rem 0", overflowX: "auto" }}>
        <div className="container">
          {/* Title input at top */}
          <div style={{ marginBottom: "0.875rem" }}>
            <input
              className="form-input"
              style={{ maxWidth: "380px", fontWeight: 600 }}
              placeholder="Resume title (e.g. 'Software Engineer — Google')"
              id="resume-title"
              {...register("title")}
            />
            {errors.title && <span className="form-error" style={{ display: "block", marginTop: 4 }}>{errors.title.message}</span>}
          </div>

          <div className="step-indicator" style={{ gap: 0 }}>
            {STEPS.map((s, i) => (
              <div key={s.id} style={{ display: "flex", alignItems: "center" }}>
                <button
                  type="button"
                  className={`step ${i === step ? "active" : i < step ? "done" : ""}`}
                  onClick={() => setStep(i)}
                  style={{ background: "none", border: "none", cursor: "pointer", display: "flex", alignItems: "center", gap: "0.4rem", padding: "0 0.25rem" }}
                >
                  <span className="step-number">
                    {i < step ? (
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="20 6 9 17 4 12"/>
                      </svg>
                    ) : (
                      i + 1
                    )}
                  </span>
                  <span className="step-label" style={{ display: "none", whiteSpace: "nowrap" }}>
                    {s.label}
                  </span>
                </button>
                {i < totalSteps - 1 && <div className={`step-connector ${i < step ? "done" : ""}`} />}
              </div>
            ))}
          </div>
          <div style={{ marginTop: "0.5rem", fontSize: "0.875rem", fontWeight: 600, color: "var(--text-primary)" }}>
            {STEPS[step].label}
          </div>
        </div>
      </div>

      <form onSubmit={handleSubmit(onSubmit)}>
        <div className="container" style={{ padding: "2rem 1.5rem", maxWidth: "760px" }}>
          {/* ── Step 0: Contact ── */}
          {step === 0 && (
            <div className="animate-fade-in">
              <SectionHeader title="Contact information" hint="This appears at the top of your resume. No icons or images." />
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.875rem" }}>
                <div className="form-group" style={{ gridColumn: "1/-1" }}>
                  <label className="form-label" htmlFor="full-name">Full name *</label>
                  <input id="full-name" className="form-input" placeholder="Jane Smith" {...register("contact.full_name")} />
                  {errors.contact?.full_name && <span className="form-error">{errors.contact.full_name.message}</span>}
                </div>
                <div className="form-group">
                  <label className="form-label" htmlFor="contact-email">Email *</label>
                  <input id="contact-email" className="form-input" type="email" placeholder="jane@example.com" {...register("contact.email")} />
                  {errors.contact?.email && <span className="form-error">{errors.contact.email.message}</span>}
                </div>
                <div className="form-group">
                  <label className="form-label" htmlFor="contact-phone">Phone</label>
                  <input id="contact-phone" className="form-input" placeholder="+1 (555) 000-0000" {...register("contact.phone")} />
                </div>
                <div className="form-group">
                  <label className="form-label" htmlFor="contact-city">City</label>
                  <input id="contact-city" className="form-input" placeholder="San Francisco, CA" {...register("contact.city")} />
                </div>
                <div className="form-group">
                  <label className="form-label" htmlFor="contact-linkedin">LinkedIn URL</label>
                  <input id="contact-linkedin" className="form-input" placeholder="linkedin.com/in/janesmith" {...register("contact.linkedin")} />
                </div>
                <div className="form-group">
                  <label className="form-label" htmlFor="contact-github">GitHub URL</label>
                  <input id="contact-github" className="form-input" placeholder="github.com/janesmith" {...register("contact.github")} />
                </div>
                <div className="form-group" style={{ gridColumn: "1/-1" }}>
                  <label className="form-label" htmlFor="contact-portfolio">Portfolio URL</label>
                  <input id="contact-portfolio" className="form-input" placeholder="janesmith.dev" {...register("contact.portfolio")} />
                </div>
              </div>
            </div>
          )}

          {/* ── Step 1: Education ── */}
          {step === 1 && (
            <div className="animate-fade-in">
              <SectionHeader
                title="Education"
                hint="List your most recent degree first. Dates should use the format 'Aug 2024' or 'May 2026'."
              />
              {eduFields.fields.map((field, i) => (
                <div key={field.id} className="card" style={{ marginBottom: "1rem" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.875rem" }}>
                    <span style={{ fontWeight: 600, fontSize: "0.875rem" }}>Education {i + 1}</span>
                    <button type="button" className="btn btn-danger btn-sm" onClick={() => eduFields.remove(i)}>Remove</button>
                  </div>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem" }}>
                    <div className="form-group" style={{ gridColumn: "1/-1" }}>
                      <label className="form-label">Institution *</label>
                      <input className="form-input" placeholder="Stanford University" {...register(`education.${i}.payload.institution`)} />
                    </div>
                    <div className="form-group">
                      <label className="form-label">Degree *</label>
                      <input className="form-input" placeholder="B.S." {...register(`education.${i}.payload.degree`)} />
                    </div>
                    <div className="form-group">
                      <label className="form-label">Field of study *</label>
                      <input className="form-input" placeholder="Computer Science" {...register(`education.${i}.payload.field`)} />
                    </div>
                    <div className="form-group">
                      <label className="form-label">Start date</label>
                      <input className="form-input" placeholder="Aug 2020" {...register(`education.${i}.payload.start_date`)} />
                    </div>
                    <div className="form-group">
                      <label className="form-label">End date (or &quot;Expected May 2024&quot;)</label>
                      <input className="form-input" placeholder="May 2024" {...register(`education.${i}.payload.end_date`)} />
                    </div>
                    <div className="form-group">
                      <label className="form-label">GPA / Percentage (optional)</label>
                      <input className="form-input" placeholder="3.8 / 4.0" {...register(`education.${i}.payload.gpa`)} />
                    </div>
                  </div>
                </div>
              ))}
              <button
                type="button"
                className="btn btn-secondary btn-sm"
                id="add-education"
                onClick={() =>
                  eduFields.append({
                    payload: { institution: "", degree: "", field: "", start_date: "", end_date: "", gpa: "" },
                    order_index: eduFields.fields.length,
                    bullets: [],
                  })
                }
              >
                + Add education
              </button>
            </div>
          )}

          {/* ── Step 2: Experience ── */}
          {step === 2 && (
            <div className="animate-fade-in">
              <SectionHeader
                title="Work experience"
                hint="Write 2-4 bullets per role. Start each bullet with an action verb (past tense). Use the AI assistant to improve weak bullets."
              />
              {expFields.fields.map((field, i) => (
                <ExperienceCard
                  key={field.id}
                  index={i}
                  register={register}
                  control={control}
                  onRemove={() => expFields.remove(i)}
                />
              ))}
              <button
                type="button"
                className="btn btn-secondary btn-sm"
                id="add-experience"
                onClick={() =>
                  expFields.append({
                    payload: { company: "", role: "", location: "", start_date: "", end_date: "" },
                    order_index: expFields.fields.length,
                    bullets: [],
                  })
                }
              >
                + Add experience
              </button>
            </div>
          )}

          {/* ── Step 3: Projects ── */}
          {step === 3 && (
            <div className="animate-fade-in">
              <SectionHeader
                title="Projects"
                hint="Include 2-4 bullets per project with the tech stack used and what you measured."
              />
              {projFields.fields.map((field, i) => (
                <ProjectCard
                  key={field.id}
                  index={i}
                  register={register}
                  control={control}
                  onRemove={() => projFields.remove(i)}
                />
              ))}
              <button
                type="button"
                className="btn btn-secondary btn-sm"
                id="add-project"
                onClick={() =>
                  projFields.append({
                    payload: { name: "", tech_stack: "", start_date: "", end_date: "", link: "" },
                    order_index: projFields.fields.length,
                    bullets: [],
                  })
                }
              >
                + Add project
              </button>
            </div>
          )}

          {/* ── Step 4: Skills ── */}
          {step === 4 && (
            <div className="animate-fade-in">
              <SectionHeader
                title="Skills"
                hint="List only skills you can actually demonstrate. Separate items with commas. Don't add skills you don't have."
              />
              <div style={{ display: "flex", flexDirection: "column", gap: "0.875rem" }}>
                {[
                  ["Languages", "skills.languages" as const, "Python, JavaScript, Java, C++"],
                  ["Frameworks", "skills.frameworks" as const, "React, Next.js, FastAPI, Django"],
                  ["Tools", "skills.tools" as const, "Git, Docker, Kubernetes, GitHub Actions"],
                  ["Databases", "skills.databases" as const, "PostgreSQL, MongoDB, Redis"],
                  ["Other", "skills.other" as const, "REST APIs, GraphQL, Agile"],
                ].map(([label, field, placeholder]) => (
                  <div key={field} className="form-group">
                    <label className="form-label" htmlFor={`skill-${field}`}>{label}</label>
                    <input
                      id={`skill-${field}`}
                      className="form-input"
                      placeholder={placeholder}
                      {...register(field as "skills.languages" | "skills.frameworks" | "skills.tools" | "skills.databases" | "skills.other")}
                    />
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ── Step 5: Achievements ── */}
          {step === 5 && (
            <div className="animate-fade-in">
              <SectionHeader title="Achievements & certifications" hint="Optional. Include relevant certifications, awards, or publications." />
              {achFields.fields.map((field, i) => (
                <div key={field.id} className="card" style={{ marginBottom: "1rem" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "0.875rem" }}>
                    <span style={{ fontWeight: 600, fontSize: "0.875rem" }}>Achievement {i + 1}</span>
                    <button type="button" className="btn btn-danger btn-sm" onClick={() => achFields.remove(i)}>Remove</button>
                  </div>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem" }}>
                    <div className="form-group" style={{ gridColumn: "1/-1" }}>
                      <label className="form-label">Title *</label>
                      <input className="form-input" placeholder="AWS Certified Solutions Architect" {...register(`achievements.${i}.payload.title`)} />
                    </div>
                    <div className="form-group">
                      <label className="form-label">Issuer</label>
                      <input className="form-input" placeholder="Amazon Web Services" {...register(`achievements.${i}.payload.issuer`)} />
                    </div>
                    <div className="form-group">
                      <label className="form-label">Date</label>
                      <input className="form-input" placeholder="Aug 2024" {...register(`achievements.${i}.payload.date`)} />
                    </div>
                  </div>
                </div>
              ))}
              <button
                type="button"
                className="btn btn-secondary btn-sm"
                id="add-achievement"
                onClick={() =>
                  achFields.append({
                    payload: { title: "", issuer: "", date: "" },
                    order_index: achFields.fields.length,
                    bullets: [],
                  })
                }
              >
                + Add achievement
              </button>
            </div>
          )}

          {/* ── Step 6: Job Description ── */}
          {step === 6 && (
            <div className="animate-fade-in">
              <SectionHeader
                title="Job description (optional)"
                hint="Paste the full job description. The app extracts keywords and shows overlap. This does not generate your resume; you do."
              />
              <div className="form-group">
                <label className="form-label" htmlFor="jd-text">Job description text</label>
                <textarea
                  id="jd-text"
                  className="form-input"
                  style={{ minHeight: "220px", fontFamily: "inherit" }}
                  placeholder="Paste the full job description here. The app will extract skills and keywords and score your resume's keyword coverage."
                  {...register("jd_text")}
                />
              </div>
              <div className="alert alert-info" style={{ marginTop: "1rem" }}>
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0, marginTop: 2 }}>
                  <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
                </svg>
                <span style={{ fontSize: "0.825rem" }}>
                  The score produced is a proxy for keyword coverage, not a guarantee of ranking in any employer&apos;s ATS.
                </span>
              </div>
            </div>
          )}

          {/* ── Navigation ── */}
          {error && <div className="alert alert-error" style={{ marginBottom: "1rem" }}>{error}</div>}

          <div style={{ display: "flex", justifyContent: "space-between", marginTop: "2rem", gap: "0.75rem" }}>
            <button
              type="button"
              className="btn btn-ghost"
              onClick={() => setStep((s) => Math.max(0, s - 1))}
              disabled={step === 0}
              id="prev-step-btn"
            >
              Back
            </button>
            {step < totalSteps - 1 ? (
              <button
                type="button"
                className="btn btn-primary"
                onClick={() => setStep((s) => Math.min(totalSteps - 1, s + 1))}
                id="next-step-btn"
              >
                Next
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M5 12h14M12 5l7 7-7 7"/>
                </svg>
              </button>
            ) : (
              <button
                type="submit"
                className="btn btn-primary"
                disabled={saving}
                id="save-resume-btn"
              >
                {saving ? "Saving..." : "Save and score resume"}
              </button>
            )}
          </div>
        </div>
      </form>
    </div>
  );
}

// ── Sub-components ─────────────────────────────────────────────────────────────
function SectionHeader({ title, hint }: { title: string; hint: string }) {
  return (
    <div style={{ marginBottom: "1.25rem" }}>
      <h2 style={{ fontSize: "1.125rem", fontWeight: 700, marginBottom: "0.3rem" }}>{title}</h2>
      <p style={{ fontSize: "0.825rem", color: "var(--text-secondary)" }}>{hint}</p>
      <div className="divider" style={{ marginTop: "0.875rem" }} />
    </div>
  );
}

function BulletsField({
  nestPath,
  register,
  control,
  resumeId,
  context,
}: {
  nestPath: string;
  register: UseFormRegister<FormData>;
  control: Control<FormData>;
  resumeId?: string;
  context?: string;
}) {
  const { fields, append, remove } = useFieldArray({ control, name: nestPath as `experience.${number}.bullets` });
  const [improving, setImproving] = useState<Record<number, boolean>>({});
  const [improvements, setImprovements] = useState<Record<number, { text: string; flags: string[]; question?: string }>>({});

  async function handleImprove(i: number, rawText: string) {
    if (!resumeId || !rawText) return;
    setImproving((prev) => ({ ...prev, [i]: true }));
    try {
      const res = await bulletApi.improve(resumeId, rawText, context);
      const data = res.data;
      setImprovements((prev) => ({
        ...prev,
        [i]: {
          text: data.improved_text || "",
          flags: data.flags || [],
          question: data.metric_question,
        },
      }));
    } finally {
      setImproving((prev) => ({ ...prev, [i]: false }));
    }
  }

  return (
    <div style={{ marginTop: "0.875rem" }}>
      <div style={{ fontSize: "0.78rem", fontWeight: 600, color: "var(--text-secondary)", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: "0.5rem" }}>
        Bullets (2-4)
      </div>
      {fields.map((f, i) => (
        <div key={f.id} style={{ marginBottom: "0.625rem" }}>
          <div style={{ display: "flex", gap: "0.5rem", alignItems: "flex-start" }}>
            <textarea
              className="form-input"
              style={{ minHeight: "56px", flex: 1, resize: "vertical", fontSize: "0.85rem" }}
              placeholder="Describe what you did, how, and what was measured."
              {...(register as UseFormRegister<Record<string, unknown>>)(`${nestPath}.${i}.raw_text` as never)}
            />
            <div style={{ display: "flex", flexDirection: "column", gap: "0.375rem", flexShrink: 0 }}>
              <button
                type="button"
                className="btn btn-ghost btn-sm"
                onClick={() => remove(i)}
                title="Remove bullet"
              >
                ×
              </button>
            </div>
          </div>
          {improvements[i] && (
            <div
              style={{
                marginTop: "0.5rem",
                padding: "0.75rem",
                background: "var(--bg-elevated)",
                borderRadius: 8,
                border: "1px solid var(--bg-border)",
                fontSize: "0.825rem",
              }}
            >
              {improvements[i].text && (
                <div style={{ marginBottom: "0.5rem" }}>
                  <span style={{ fontWeight: 600, color: "var(--accent)", display: "block", marginBottom: "0.25rem" }}>Suggested improvement:</span>
                  <span style={{ color: "var(--text-primary)" }}>{improvements[i].text}</span>
                </div>
              )}
              {improvements[i].flags.length > 0 && (
                <div style={{ marginBottom: "0.375rem" }}>
                  {improvements[i].flags.map((flag, fi) => (
                    <div key={fi} style={{ color: "var(--warning)", fontSize: "0.78rem", marginBottom: "0.2rem" }}>
                      {flag}
                    </div>
                  ))}
                </div>
              )}
              {improvements[i].question && (
                <div className="alert alert-warning" style={{ marginTop: "0.5rem", fontSize: "0.78rem" }}>
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
                    <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
                  </svg>
                  <strong>Metric needed:</strong> {improvements[i].question}
                </div>
              )}
            </div>
          )}
        </div>
      ))}
      <div style={{ display: "flex", gap: "0.5rem" }}>
        <button
          type="button"
          className="btn btn-ghost btn-sm"
          onClick={() => append({ raw_text: "", order_index: fields.length })}
        >
          + Add bullet
        </button>
      </div>
    </div>
  );
}

function ExperienceCard({
  index,
  register,
  control,
  onRemove,
}: {
  index: number;
  register: UseFormRegister<FormData>;
  control: Control<FormData>;
  onRemove: () => void;
}) {
  return (
    <div className="card" style={{ marginBottom: "1rem" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.875rem" }}>
        <span style={{ fontWeight: 600, fontSize: "0.875rem" }}>Experience {index + 1}</span>
        <button type="button" className="btn btn-danger btn-sm" onClick={onRemove}>Remove</button>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem" }}>
        <div className="form-group" style={{ gridColumn: "1/-1" }}>
          <label className="form-label">Company *</label>
          <input className="form-input" placeholder="Acme Corp" {...register(`experience.${index}.payload.company`)} />
        </div>
        <div className="form-group">
          <label className="form-label">Role *</label>
          <input className="form-input" placeholder="Software Engineer Intern" {...register(`experience.${index}.payload.role`)} />
        </div>
        <div className="form-group">
          <label className="form-label">Location</label>
          <input className="form-input" placeholder="San Francisco, CA" {...register(`experience.${index}.payload.location`)} />
        </div>
        <div className="form-group">
          <label className="form-label">Start date</label>
          <input className="form-input" placeholder="Jun 2023" {...register(`experience.${index}.payload.start_date`)} />
        </div>
        <div className="form-group">
          <label className="form-label">End date</label>
          <input className="form-input" placeholder="Aug 2023 (or Present)" {...register(`experience.${index}.payload.end_date`)} />
        </div>
      </div>
      <BulletsField
        nestPath={`experience.${index}.bullets`}
        register={register}
        control={control}
        context="experience"
      />
    </div>
  );
}

function ProjectCard({
  index,
  register,
  control,
  onRemove,
}: {
  index: number;
  register: UseFormRegister<FormData>;
  control: Control<FormData>;
  onRemove: () => void;
}) {
  return (
    <div className="card" style={{ marginBottom: "1rem" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.875rem" }}>
        <span style={{ fontWeight: 600, fontSize: "0.875rem" }}>Project {index + 1}</span>
        <button type="button" className="btn btn-danger btn-sm" onClick={onRemove}>Remove</button>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem" }}>
        <div className="form-group" style={{ gridColumn: "1/-1" }}>
          <label className="form-label">Project name *</label>
          <input className="form-input" placeholder="Open-source ML pipeline" {...register(`projects.${index}.payload.name`)} />
        </div>
        <div className="form-group" style={{ gridColumn: "1/-1" }}>
          <label className="form-label">Tech stack</label>
          <input className="form-input" placeholder="Python, FastAPI, React, PostgreSQL" {...register(`projects.${index}.payload.tech_stack`)} />
        </div>
        <div className="form-group">
          <label className="form-label">Start date</label>
          <input className="form-input" placeholder="Jan 2024" {...register(`projects.${index}.payload.start_date`)} />
        </div>
        <div className="form-group">
          <label className="form-label">End date</label>
          <input className="form-input" placeholder="Mar 2024" {...register(`projects.${index}.payload.end_date`)} />
        </div>
        <div className="form-group" style={{ gridColumn: "1/-1" }}>
          <label className="form-label">Link (GitHub, demo, etc.)</label>
          <input className="form-input" placeholder="github.com/you/project" {...register(`projects.${index}.payload.link`)} />
        </div>
      </div>
      <BulletsField
        nestPath={`projects.${index}.bullets`}
        register={register}
        control={control}
        context="project"
      />
    </div>
  );
}
