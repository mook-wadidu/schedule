"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { EventRow, Locale, Member, pickTitle } from "@/lib/types";
import { hourLabel } from "@/lib/date";

const HEADER_H = 40; // px, 멤버 헤더 높이

type Props = {
  members: Member[];
  events: EventRow[];
  visibleStart: number;
  visibleEnd: number;
  locale: Locale;
  freeOnly: boolean;
  isToday: boolean;
  onEmptyClick: (memberId: string, hour: number) => void;
  onEventClick: (ev: EventRow) => void;
};

// 한 멤버의 이벤트들에 대해 겹침을 레인으로 분리 (side-by-side 배치)
function computeLanes(events: EventRow[]): Record<string, { lane: number; cols: number }> {
  const sorted = [...events].sort(
    (a, b) => a.start_hour - b.start_hour || a.end_hour - b.end_hour,
  );
  const result: Record<string, { lane: number; cols: number }> = {};
  let cluster: EventRow[] = [];
  let clusterEnd = -1;

  const flush = () => {
    if (cluster.length === 0) return;
    const laneEnds: number[] = [];
    const laneOf: Record<string, number> = {};
    for (const ev of cluster) {
      let placed = -1;
      for (let i = 0; i < laneEnds.length; i++) {
        if (laneEnds[i] <= ev.start_hour) {
          placed = i;
          break;
        }
      }
      if (placed === -1) {
        placed = laneEnds.length;
        laneEnds.push(ev.end_hour);
      } else {
        laneEnds[placed] = ev.end_hour;
      }
      laneOf[ev.id] = placed;
    }
    const cols = laneEnds.length;
    for (const ev of cluster) result[ev.id] = { lane: laneOf[ev.id], cols };
    cluster = [];
    clusterEnd = -1;
  };

  for (const ev of sorted) {
    if (cluster.length > 0 && ev.start_hour >= clusterEnd) flush();
    cluster.push(ev);
    clusterEnd = Math.max(clusterEnd, ev.end_hour);
  }
  flush();
  return result;
}

export default function Timetable({
  members,
  events,
  visibleStart,
  visibleEnd,
  locale,
  freeOnly,
  isToday,
  onEmptyClick,
  onEventClick,
}: Props) {
  const t = useTranslations("timetable");

  // 반응형 치수 (마운트 후 창 너비로 결정, SSR은 데스크톱 기준)
  const [vw, setVw] = useState<number | null>(null);
  useEffect(() => {
    const on = () => setVw(window.innerWidth);
    on();
    window.addEventListener("resize", on);
    return () => window.removeEventListener("resize", on);
  }, []);
  const mobile = (vw ?? 1024) < 640;
  const HOUR_HEIGHT = mobile ? 46 : 52;
  const GUTTER = mobile ? 44 : 56;
  const MIN_COL = mobile ? 104 : 140;

  // 현재 시각 인디케이터 (마운트 후에만 → 하이드레이션 안전)
  const [nowH, setNowH] = useState<number | null>(null);
  useEffect(() => {
    const tick = () => {
      const d = new Date();
      setNowH(d.getHours() + d.getMinutes() / 60);
    };
    tick();
    const id = setInterval(tick, 60000);
    return () => clearInterval(id);
  }, []);

  const totalHours = Math.max(1, visibleEnd - visibleStart);
  const hours = Array.from({ length: totalHours }, (_, i) => visibleStart + i);
  const showNow = isToday && nowH !== null && nowH >= visibleStart && nowH <= visibleEnd;

  // 모두 비는 시간
  const freeHours = new Set<number>();
  if (members.length > 0) {
    for (const h of hours) {
      const anyoneBusy = events.some((e) => e.start_hour <= h && h < e.end_hour);
      if (!anyoneBusy) freeHours.add(h);
    }
  }

  if (members.length === 0) {
    return (
      <div
        className="flex h-44 items-center justify-center rounded-xl border border-dashed px-4 text-center text-sm text-[var(--muted)]"
        style={{ borderColor: "var(--line-strong)" }}
      >
        {t("addMemberFirst")}
      </div>
    );
  }

  return (
    <div
      className="overflow-hidden rounded-xl"
      style={{ background: "var(--surface)", border: "1px solid var(--line)" }}
    >
      <div className="flex">
        {/* 고정 시간 눈금 (가로 스크롤 밖) */}
        <div style={{ width: GUTTER }} className="shrink-0" >
          <div style={{ height: HEADER_H, borderBottom: "1px solid var(--line)" }} />
          {hours.map((h) => (
            <div
              key={h}
              style={{ height: HOUR_HEIGHT, borderTop: "1px solid var(--line)" }}
              className="relative"
            >
              <span className="tabular absolute -top-2 right-1.5 text-[11px] text-[var(--muted)]">
                {hourLabel(h)}
              </span>
            </div>
          ))}
        </div>

        {/* 멤버 헤더 + 그리드 (가로 스크롤) */}
        <div
          className="momentum flex-1 overflow-x-auto"
          style={{ borderLeft: "1px solid var(--line)" }}
        >
          <div style={{ minWidth: members.length * MIN_COL }}>
            {/* 멤버 헤더 */}
            <div className="flex" style={{ height: HEADER_H, borderBottom: "1px solid var(--line)" }}>
              {members.map((m) => (
                <div key={m.id} className="flex flex-1 items-center gap-1.5 px-2 text-sm font-medium">
                  <span className="inline-block h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: m.color }} />
                  <span className="truncate">{m.name}</span>
                </div>
              ))}
            </div>

            {/* 그리드 */}
            <div className="relative" style={{ height: totalHours * HOUR_HEIGHT }}>
              {/* 시간 밴드 (배경 · 모두 비는 시간) */}
              <div className="absolute inset-0">
                {hours.map((h) => (
                  <div
                    key={h}
                    style={{
                      height: HOUR_HEIGHT,
                      borderTop: "1px solid var(--line)",
                      background:
                        freeOnly && freeHours.has(h)
                          ? "color-mix(in srgb, var(--free) 13%, transparent)"
                          : "transparent",
                    }}
                  />
                ))}
              </div>

              {/* 멤버 열 (이벤트) */}
              <div className="absolute inset-0 flex">
                {members.map((m) => {
                  const mEvents = events.filter((e) => e.member_id === m.id);
                  const lanes = computeLanes(mEvents);
                  return (
                    <div
                      key={m.id}
                      className="relative flex-1 cursor-pointer transition-colors hover:bg-[var(--surface-2)]"
                      style={{ borderLeft: "1px solid var(--line)" }}
                      onClick={(e) => {
                        const rect = e.currentTarget.getBoundingClientRect();
                        const y = e.clientY - rect.top;
                        const hour = visibleStart + Math.floor(y / HOUR_HEIGHT);
                        onEmptyClick(m.id, Math.min(hour, visibleEnd - 1));
                      }}
                    >
                      {mEvents.map((ev) => {
                        const { lane, cols } = lanes[ev.id] ?? { lane: 0, cols: 1 };
                        const top = (ev.start_hour - visibleStart) * HOUR_HEIGHT;
                        const height = (ev.end_hour - ev.start_hour) * HOUR_HEIGHT;
                        const widthPct = 100 / cols;
                        return (
                          <button
                            key={ev.id}
                            onClick={(e) => {
                              e.stopPropagation();
                              onEventClick(ev);
                            }}
                            className="absolute overflow-hidden rounded-lg px-1.5 py-1 text-left text-white shadow-sm ring-1 ring-black/5 transition hover:-translate-y-px hover:shadow-md"
                            style={{
                              top: top + 2,
                              height: height - 4,
                              left: `calc(${lane * widthPct}% + 3px)`,
                              width: `calc(${widthPct}% - 6px)`,
                              backgroundColor: m.color,
                            }}
                            title={`${hourLabel(ev.start_hour)}–${hourLabel(ev.end_hour)}  ${ev.title}`}
                          >
                            <div className="truncate text-[13px] font-semibold leading-tight">
                              {pickTitle(ev, locale)}
                            </div>
                            <div className="tabular text-[11px] opacity-85">
                              {hourLabel(ev.start_hour)}–{hourLabel(ev.end_hour)}
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  );
                })}
              </div>

              {/* 현재 시각 라인 */}
              {showNow && nowH !== null && (
                <div
                  className="pointer-events-none absolute left-0 right-0 z-10"
                  style={{ top: (nowH - visibleStart) * HOUR_HEIGHT }}
                >
                  <div className="relative">
                    <span className="absolute -left-1 -top-[3px] h-1.5 w-1.5 rounded-full" style={{ background: "#ef4444" }} />
                    <div style={{ borderTop: "1.5px solid #ef4444" }} />
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
