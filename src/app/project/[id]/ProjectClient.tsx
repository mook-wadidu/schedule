"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useLocale, useTranslations } from "next-intl";
import { BCP47, EventRow, Locale, Member, Note, Project } from "@/lib/types";
import { addDays, formatDateDisplay, hourLabel, todayISO } from "@/lib/date";
import Timetable from "@/components/Timetable";
import DailyNotes from "@/components/DailyNotes";
import LocaleSwitcher from "@/components/LocaleSwitcher";

type EventModalState = {
  mode: "add" | "edit";
  id?: string;
  memberId: string;
  startHour: number;
  endHour: number;
  title: string;
};

export default function ProjectClient({ project }: { project: Project }) {
  const locale = useLocale() as Locale;
  const t = useTranslations("project");
  const tm = useTranslations("member");
  const te = useTranslations("event");

  const [date, setDate] = useState<string>(todayISO());
  const [members, setMembers] = useState<Member[]>([]);
  const [events, setEvents] = useState<EventRow[]>([]);
  const [notes, setNotes] = useState<Note[]>([]);
  const [freeOnly, setFreeOnly] = useState(false);

  const [selfMemberId, setSelfMemberId] = useState<string | null>(null);
  const [addMemberOpen, setAddMemberOpen] = useState(false);
  const [newMemberName, setNewMemberName] = useState("");
  const [memberError, setMemberError] = useState<string | null>(null);

  const [modal, setModal] = useState<EventModalState | null>(null);
  const [copied, setCopied] = useState(false);

  const vs = project.visible_start_hour;
  const ve = project.visible_end_hour;

  // 데이터 로드 (폴링)
  const load = useCallback(async (d: string) => {
    try {
      const res = await fetch(`/api/board?date=${d}`, { cache: "no-store" });
      if (!res.ok) return;
      const data = await res.json();
      setMembers(data.members ?? []);
      setEvents(data.events ?? []);
      setNotes(data.notes ?? []);
    } catch {
      /* 네트워크 일시 오류는 다음 폴링에서 회복 */
    }
  }, []);

  // "오늘의 한 마디" 저장 (빈 값이면 서버에서 삭제)
  async function saveNote(memberId: string, message: string) {
    await fetch("/api/notes", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ member_id: memberId, date, message, source_lang: locale }),
    });
    load(date);
  }

  useEffect(() => {
    load(date);
    const id = setInterval(() => load(date), 5000);
    return () => clearInterval(id);
  }, [date, load]);

  // 내 이름 기억
  useEffect(() => {
    const saved = localStorage.getItem(`planner_self_${project.id}`);
    if (saved) setSelfMemberId(saved);
  }, [project.id]);

  function chooseSelf(id: string) {
    setSelfMemberId(id);
    localStorage.setItem(`planner_self_${project.id}`, id);
  }

  // 멤버 추가
  async function addMember(e: React.FormEvent) {
    e.preventDefault();
    setMemberError(null);
    const name = newMemberName.trim();
    if (!name) return;
    const res = await fetch("/api/members", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name }),
    });
    const data = await res.json();
    if (!res.ok) {
      setMemberError(data.error === "name_exists" ? tm("errExists") : tm("errFailed"));
      return;
    }
    chooseSelf(data.member.id);
    setNewMemberName("");
    setAddMemberOpen(false);
    load(date);
  }

  // 이벤트 모달 열기
  function openAdd(memberId: string, hour: number) {
    const start = Math.max(vs, Math.min(hour, ve - 1));
    setModal({
      mode: "add",
      memberId: memberId || selfMemberId || members[0]?.id || "",
      startHour: start,
      endHour: Math.min(start + 1, ve),
      title: "",
    });
  }

  function openEdit(ev: EventRow) {
    setModal({
      mode: "edit",
      id: ev.id,
      memberId: ev.member_id,
      startHour: ev.start_hour,
      endHour: ev.end_hour,
      title: ev.title,
    });
  }

  async function saveEvent() {
    if (!modal) return;
    if (!modal.memberId || !modal.title.trim() || !(modal.startHour < modal.endHour)) return;

    if (modal.mode === "add") {
      await fetch("/api/events", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          member_id: modal.memberId,
          date,
          start_hour: modal.startHour,
          end_hour: modal.endHour,
          title: modal.title.trim(),
          source_lang: locale,
        }),
      });
    } else {
      await fetch(`/api/events/${modal.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          start_hour: modal.startHour,
          end_hour: modal.endHour,
          title: modal.title.trim(),
          source_lang: locale,
        }),
      });
    }
    setModal(null);
    load(date);
  }

  async function deleteEvent() {
    if (!modal?.id) return;
    await fetch(`/api/events/${modal.id}`, { method: "DELETE" });
    setModal(null);
    load(date);
  }

  function share() {
    navigator.clipboard?.writeText(window.location.href).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  const hourOptions = Array.from({ length: ve - vs + 1 }, (_, i) => vs + i);
  const isToday = date === todayISO();

  return (
    <main className="mx-auto flex max-w-6xl flex-col gap-5 px-4 py-6">
      {/* 상단 */}
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <Link
            href="/"
            className="text-xs text-[var(--muted)] transition hover:text-[var(--fg)]"
          >
            {t("backHome")}
          </Link>
          <h1 className="truncate text-2xl font-bold tracking-tight">{project.name}</h1>
        </div>
        <div className="flex items-center gap-2">
          <LocaleSwitcher />
          <button onClick={share} className="btn btn-ghost">
            {copied ? (
              t("copied")
            ) : (
              <>
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                  strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8" />
                  <path d="M16 6l-4-4-4 4" />
                  <path d="M12 2v13" />
                </svg>
                {t("share")}
              </>
            )}
          </button>
        </div>
      </header>

      {/* 컨트롤 바 */}
      <div
        className="flex flex-wrap items-center gap-2 rounded-xl p-2"
        style={{ background: "var(--surface)", border: "1px solid var(--line)" }}
      >
        {/* 날짜 이동 */}
        <div className="flex items-center gap-1">
          <button onClick={() => setDate(addDays(date, -1))} className="chip px-2" aria-label="prev day">
            <Chevron dir="left" />
          </button>
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value || todayISO())}
            className="field tabular w-auto py-1.5"
          />
          <button onClick={() => setDate(addDays(date, 1))} className="chip px-2" aria-label="next day">
            <Chevron dir="right" />
          </button>
          <button
            onClick={() => setDate(todayISO())}
            className="chip"
            style={isToday ? { borderColor: "var(--accent)", color: "var(--accent)" } : undefined}
          >
            {t("today")}
          </button>
        </div>

        <span className="hidden text-sm text-[var(--muted)] md:inline">
          {formatDateDisplay(date, BCP47[locale])}
        </span>

        <div className="ml-auto flex flex-wrap items-center gap-2">
          {/* 내 이름 */}
          <select
            value={selfMemberId ?? ""}
            onChange={(e) => chooseSelf(e.target.value)}
            className="field w-auto py-1.5"
          >
            <option value="">{t("selfPlaceholder")}</option>
            {members.map((m) => (
              <option key={m.id} value={m.id}>
                {m.name}
              </option>
            ))}
          </select>
          <button onClick={() => setAddMemberOpen(true)} className="chip">
            {t("addName")}
          </button>

          {/* 비교 토글 */}
          <button
            onClick={() => setFreeOnly((v) => !v)}
            className="chip"
            style={
              freeOnly
                ? {
                    background: "color-mix(in srgb, var(--free) 14%, transparent)",
                    borderColor: "color-mix(in srgb, var(--free) 45%, transparent)",
                    color: "color-mix(in srgb, var(--free) 65%, var(--fg))",
                  }
                : undefined
            }
          >
            <span
              className="inline-block h-2 w-2 rounded-full"
              style={{ background: freeOnly ? "var(--free)" : "var(--line-strong)" }}
            />
            {t("freeOnly")}
          </button>

          {/* 일정 추가 */}
          <button
            onClick={() => openAdd(selfMemberId || members[0]?.id || "", vs)}
            disabled={members.length === 0}
            className="btn btn-primary"
          >
            {t("addEvent")}
          </button>
        </div>
      </div>

      {/* 오늘의 한 마디 */}
      <DailyNotes
        members={members}
        notes={notes}
        selfMemberId={selfMemberId}
        locale={locale}
        onSave={saveNote}
      />

      <p className="px-1 text-xs text-[var(--muted)]">{t("help")}</p>

      {/* 시간표 */}
      <Timetable
        members={members}
        events={events}
        visibleStart={vs}
        visibleEnd={ve}
        locale={locale}
        freeOnly={freeOnly}
        isToday={isToday}
        onEmptyClick={openAdd}
        onEventClick={openEdit}
      />

      {/* 멤버 추가 모달 */}
      {addMemberOpen && (
        <Overlay onClose={() => setAddMemberOpen(false)}>
          <h3 className="text-lg font-semibold">{tm("addHeading")}</h3>
          <form onSubmit={addMember} className="mt-4 flex flex-col gap-3">
            <input
              autoFocus
              value={newMemberName}
              onChange={(e) => setNewMemberName(e.target.value)}
              placeholder={tm("namePlaceholder")}
              className="field"
            />
            {memberError && <p className="text-sm text-red-500">{memberError}</p>}
            <div className="flex justify-end gap-2">
              <button type="button" onClick={() => setAddMemberOpen(false)} className="btn btn-ghost">
                {tm("cancel")}
              </button>
              <button type="submit" className="btn btn-primary">
                {tm("add")}
              </button>
            </div>
          </form>
        </Overlay>
      )}

      {/* 이벤트 추가/수정 모달 */}
      {modal && (
        <Overlay onClose={() => setModal(null)}>
          <h3 className="text-lg font-semibold">
            {modal.mode === "add" ? te("addHeading") : te("editHeading")}
          </h3>
          <div className="mt-4 flex flex-col gap-3">
            <label className="flex flex-col gap-1.5 text-sm">
              <span className="font-medium">{te("who")}</span>
              <select
                value={modal.memberId}
                onChange={(e) => setModal({ ...modal, memberId: e.target.value })}
                className="field"
              >
                {members.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.name}
                  </option>
                ))}
              </select>
            </label>

            <div className="flex gap-3">
              <label className="flex flex-1 flex-col gap-1.5 text-sm">
                <span className="font-medium">{te("start")}</span>
                <select
                  value={modal.startHour}
                  onChange={(e) => {
                    const s = Number(e.target.value);
                    setModal({ ...modal, startHour: s, endHour: Math.max(s + 1, modal.endHour) });
                  }}
                  className="field tabular"
                >
                  {hourOptions.slice(0, -1).map((h) => (
                    <option key={h} value={h}>{hourLabel(h)}</option>
                  ))}
                </select>
              </label>
              <label className="flex flex-1 flex-col gap-1.5 text-sm">
                <span className="font-medium">{te("end")}</span>
                <select
                  value={modal.endHour}
                  onChange={(e) => setModal({ ...modal, endHour: Number(e.target.value) })}
                  className="field tabular"
                >
                  {hourOptions.filter((h) => h > modal.startHour).map((h) => (
                    <option key={h} value={h}>{hourLabel(h)}</option>
                  ))}
                </select>
              </label>
            </div>

            <label className="flex flex-col gap-1.5 text-sm">
              <span className="font-medium">{te("content")}</span>
              <input
                autoFocus
                value={modal.title}
                onChange={(e) => setModal({ ...modal, title: e.target.value })}
                placeholder={te("contentPlaceholder")}
                className="field"
              />
            </label>

            <div className="mt-1 flex items-center justify-between">
              {modal.mode === "edit" ? (
                <button onClick={deleteEvent} className="btn btn-danger">
                  {te("delete")}
                </button>
              ) : (
                <span />
              )}
              <div className="flex gap-2">
                <button onClick={() => setModal(null)} className="btn btn-ghost">
                  {te("cancel")}
                </button>
                <button onClick={saveEvent} className="btn btn-primary">
                  {te("save")}
                </button>
              </div>
            </div>
          </div>
        </Overlay>
      )}
    </main>
  );
}

function Chevron({ dir }: { dir: "left" | "right" }) {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor"
      strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      {dir === "left" ? <path d="m15 18-6-6 6-6" /> : <path d="m9 18 6-6-6-6" />}
    </svg>
  );
}

function Overlay({
  children,
  onClose,
}: {
  children: React.ReactNode;
  onClose: () => void;
}) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: "rgba(9,9,11,0.45)", backdropFilter: "blur(2px)" }}
      onClick={onClose}
    >
      <div
        className="w-full max-w-sm rounded-2xl p-5 shadow-2xl"
        style={{ background: "var(--surface)", border: "1px solid var(--line-strong)" }}
        onClick={(e) => e.stopPropagation()}
      >
        {children}
      </div>
    </div>
  );
}
