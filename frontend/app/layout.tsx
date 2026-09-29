import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "ATS Resume Builder — ATS-Parseable PDF Resumes",
  description:
    "Generates ATS-parseable PDF resumes with real selectable text, checks them against a job description, and scores parse quality, keyword match, and bullet strength.",
  icons: {
    icon: "/favicon.svg",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
