"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { Locale, Member, Note, pickMessage } from "@/lib/types";

type Props = {
  members: Member[];
  notes: Note[];
  selfMemberId: string | null;
  locale: Locale;
  onSave: (memberId: string, message: string) => void;
};

export default function DailyNotes({ members, notes, selfMemberId, locale, onSave }: Props) {
  const t = useTranslations("note");
  const byMember = new Map(notes.map((n) => [n.member_id, n]));

  if (members.length === 0) return null;

  return (
    <section className="flex flex-col gap-2">
      <h2 className="flex items-center gap-1.5 px-1 text-sm font-semibold text-[var(--muted)]">
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor"
          strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M7.9 20A9 9 0 1 0 4 16.1L2 22z" />
        </svg>
        {t("heading")}
      </h2>

      <div className="momentum flex gap-2 overflow-x-auto pb-1">
        {members.map((m) => {
          const note = byMember.get(m.id);
          const isSelf = m.id === selfMemberId;
          return (
            <div
              key={m.id}
              className="flex min-w-[170px] max-w-[280px] flex-1 flex-col gap-1.5 rounded-xl p-3 sm:min-w-[200px]"
              style={{
                background: "var(--surface)",
                border: isSelf
                  ? "1px solid color-mix(in srgb, var(--accent) 45%, transparent)"
                  : "1px solid var(--line)",
              }}
            >
              <div className="flex items-center gap-1.5 text-sm font-medium">
                <span className="inline-block h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: m.color }} />
                <span className="truncate">{m.name}</span>
              </div>

              {isSelf ? (
                <SelfNoteInput
                  key={m.id}
                  initial={note?.message ?? ""}
                  placeholder={t("placeholder")}
                  onSave={(msg) => onSave(m.id, msg)}
                />
              ) : note ? (
                <p className="text-sm leading-snug break-words">{pickMessage(note, locale)}</p>
              ) : (
                <p className="text-sm italic text-[var(--muted)]">{t("emptyOther")}</p>
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
}

function SelfNoteInput({
  initial,
  placeholder,
  onSave,
}: {
  initial: string;
  placeholder: string;
  onSave: (msg: string) => void;
}) {
  const [draft, setDraft] = useState(initial);
  const [focused, setFocused] = useState(false);

  // 폴링으로 서버 값이 바뀌면 반영하되, 편집 중일 때는 건드리지 않음
  useEffect(() => {
    if (!focused) setDraft(initial);
  }, [initial, focused]);

  function commit() {
    const v = draft.trim();
    if (v !== initial.trim()) onSave(v);
  }

  return (
    <input
      value={draft}
      onChange={(e) => setDraft(e.target.value)}
      onFocus={() => setFocused(true)}
      onBlur={() => {
        setFocused(false);
        commit();
      }}
      onKeyDown={(e) => {
        if (e.key === "Enter") {
          e.currentTarget.blur();
        }
      }}
      maxLength={200}
      placeholder={placeholder}
      className="field py-1.5 text-sm"
    />
  );
}
