"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import LocaleSwitcher from "@/components/LocaleSwitcher";

type ProjectListItem = {
  id: string;
  name: string;
  created_at: string;
  member_count: number;
};

export default function HomePage() {
  const router = useRouter();
  const t = useTranslations("home");
  const tApp = useTranslations("app");

  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const [startHour, setStartHour] = useState(8);
  const [endHour, setEndHour] = useState(22);
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);

  const [projects, setProjects] = useState<ProjectListItem[]>([]);
  const [loadingList, setLoadingList] = useState(true);

  useEffect(() => {
    fetch("/api/projects")
      .then((r) => (r.ok ? r.json() : { projects: [] }))
      .then((d) => setProjects(d.projects ?? []))
      .catch(() => {})
      .finally(() => setLoadingList(false));
  }, []);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setCreateError(null);
    if (!name.trim()) return setCreateError(t("errNameRequired"));
    if (password.length < 4) return setCreateError(t("errPasswordShort"));
    if (!(startHour < endHour)) return setCreateError(t("errHourOrder"));

    setCreating(true);
    try {
      const res = await fetch("/api/projects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          password,
          visible_start_hour: startHour,
          visible_end_hour: endHour,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "create_failed");
      router.push(`/project/${data.id}`);
    } catch {
      setCreateError(t("errCreateFailed"));
      setCreating(false);
    }
  }

  return (
    <main className="mx-auto flex max-w-2xl flex-col gap-10 px-5 py-14 sm:py-20">
      <div className="flex justify-end">
        <LocaleSwitcher />
      </div>

      {/* 히어로 */}
      <header className="flex flex-col items-center gap-4 text-center">
        <Logomark />
        <div>
          <h1 className="text-[28px] font-bold tracking-tight sm:text-3xl">
            {tApp("title")}
          </h1>
          <p className="mt-2 text-[15px] text-[var(--muted)]">{t("subtitle")}</p>
        </div>
      </header>

      {/* 프로젝트 생성 */}
      <section className="card">
        <h2 className="mb-5 text-base font-semibold">{t("createHeading")}</h2>
        <form onSubmit={handleCreate} className="flex flex-col gap-4">
          <label className="flex flex-col gap-1.5 text-sm">
            <span className="font-medium">{t("name")}</span>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={t("namePlaceholder")}
              className="field"
            />
          </label>

          <label className="flex flex-col gap-1.5 text-sm">
            <span className="font-medium">{t("password")}</span>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder={t("passwordPlaceholder")}
              className="field"
            />
          </label>

          <div className="flex gap-3">
            <label className="flex flex-1 flex-col gap-1.5 text-sm">
              <span className="font-medium">{t("startHour")}</span>
              <select
                value={startHour}
                onChange={(e) => setStartHour(Number(e.target.value))}
                className="field tabular"
              >
                {Array.from({ length: 24 }, (_, h) => (
                  <option key={h} value={h}>{String(h).padStart(2, "0")}:00</option>
                ))}
              </select>
            </label>
            <label className="flex flex-1 flex-col gap-1.5 text-sm">
              <span className="font-medium">{t("endHour")}</span>
              <select
                value={endHour}
                onChange={(e) => setEndHour(Number(e.target.value))}
                className="field tabular"
              >
                {Array.from({ length: 24 }, (_, h) => h + 1).map((h) => (
                  <option key={h} value={h}>{String(h).padStart(2, "0")}:00</option>
                ))}
              </select>
            </label>
          </div>

          {createError && <p className="text-sm text-red-500">{createError}</p>}

          <button type="submit" disabled={creating} className="btn btn-primary mt-1 py-2.5">
            {creating ? t("creating") : t("create")}
          </button>
        </form>
      </section>

      {/* 프로젝트 목록 */}
      <section className="flex flex-col gap-3">
        <h2 className="px-1 text-sm font-semibold text-[var(--muted)]">
          {t("listHeading")}
        </h2>

        {loadingList ? (
          <div className="flex flex-col gap-2">
            {[0, 1, 2].map((i) => (
              <div
                key={i}
                className="h-[58px] animate-pulse rounded-xl"
                style={{ background: "var(--surface-2)" }}
              />
            ))}
          </div>
        ) : projects.length === 0 ? (
          <p className="rounded-xl border border-dashed px-4 py-8 text-center text-sm text-[var(--muted)]"
             style={{ borderColor: "var(--line-strong)" }}>
            {t("listEmpty")}
          </p>
        ) : (
          <ul className="flex flex-col gap-2">
            {projects.map((p) => (
              <li key={p.id}>
                <button
                  onClick={() => router.push(`/project/${p.id}`)}
                  className="group flex w-full items-center gap-3 rounded-xl px-4 py-3 text-left transition"
                  style={{ background: "var(--surface)", border: "1px solid var(--line)" }}
                >
                  <span
                    className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-sm font-semibold"
                    style={{ background: "var(--surface-2)", color: "var(--muted)" }}
                  >
                    {p.name.slice(0, 1).toUpperCase()}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-medium">{p.name}</span>
                    <span className="text-xs text-[var(--muted)]">
                      {t("memberCount", { count: p.member_count })}
                    </span>
                  </span>
                  <LockIcon />
                  <svg
                    className="text-[var(--muted)] transition group-hover:translate-x-0.5"
                    width="18" height="18" viewBox="0 0 24 24" fill="none"
                    stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
                  >
                    <path d="m9 18 6-6-6-6" />
                  </svg>
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>
    </main>
  );
}

function Logomark() {
  return (
    <span
      className="flex h-12 w-12 items-center justify-center rounded-2xl shadow-sm"
      style={{ background: "var(--fg)" }}
    >
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none"
        stroke="var(--bg)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="4.5" width="18" height="16" rx="3" />
        <path d="M3 9.5h18" />
        <path d="M8 4.5V2.5M16 4.5V2.5" />
        <rect x="6.5" y="12.5" width="4.5" height="3" rx="1" fill="var(--bg)" stroke="none" />
        <rect x="13" y="12.5" width="4.5" height="3" rx="1" fill="var(--bg)" stroke="none" opacity="0.5" />
      </svg>
    </span>
  );
}

function LockIcon() {
  return (
    <svg className="shrink-0 text-[var(--muted)]" width="14" height="14" viewBox="0 0 24 24"
      fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="5" y="11" width="14" height="10" rx="2" />
      <path d="M8 11V7a4 4 0 0 1 8 0v4" />
    </svg>
  );
}
