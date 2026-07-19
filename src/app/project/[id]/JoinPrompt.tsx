"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import Link from "next/link";
import LocaleSwitcher from "@/components/LocaleSwitcher";

export default function JoinPrompt({
  projectId,
  projectName,
}: {
  projectId: string;
  projectName: string;
}) {
  const router = useRouter();
  const t = useTranslations("join");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await fetch(`/api/projects/${projectId}/join`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(
          data.error === "wrong_password"
            ? t("errWrongPassword")
            : data.error === "not_found"
              ? t("errNotFound")
              : t("errFailed"),
        );
        setLoading(false);
        return;
      }
      router.refresh();
    } catch {
      setError(t("errNetwork"));
      setLoading(false);
    }
  }

  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col justify-center gap-6 px-5 py-14">
      <div className="flex justify-end">
        <LocaleSwitcher />
      </div>
      <div className="card">
        <span className="inline-flex h-9 w-9 items-center justify-center rounded-lg"
          style={{ background: "var(--surface-2)", color: "var(--muted)" }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor"
            strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect x="5" y="11" width="14" height="10" rx="2" />
            <path d="M8 11V7a4 4 0 0 1 8 0v4" />
          </svg>
        </span>
        <p className="mt-3 text-sm text-[var(--muted)]">{t("label")}</p>
        <h1 className="mt-1 text-2xl font-bold tracking-tight">{projectName}</h1>
        <form onSubmit={submit} className="mt-5 flex flex-col gap-3">
          <input
            type="password"
            autoFocus
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder={t("passwordPlaceholder")}
            className="field"
          />
          {error && <p className="text-sm text-red-500">{error}</p>}
          <button type="submit" disabled={loading} className="btn btn-primary py-2.5">
            {loading ? t("checking") : t("submit")}
          </button>
        </form>
      </div>
      <Link href="/" className="text-center text-sm text-[var(--muted)] transition hover:text-[var(--fg)]">
        {t("backHome")}
      </Link>
    </main>
  );
}
