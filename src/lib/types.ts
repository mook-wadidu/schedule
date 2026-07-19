// 공유 타입 및 상수

export type Locale = "ko" | "ja" | "en";
export const LOCALES: Locale[] = ["ko", "ja", "en"];
export const DEFAULT_LOCALE: Locale = "ko";

// Intl 포맷용 BCP47 태그
export const BCP47: Record<Locale, string> = {
  ko: "ko-KR",
  ja: "ja-JP",
  en: "en-US",
};

export type Project = {
  id: string;
  name: string;
  visible_start_hour: number;
  visible_end_hour: number;
  created_at: string;
};

export type Member = {
  id: string;
  project_id: string;
  name: string;
  color: string;
  created_at: string;
};

export type Translations = Partial<Record<Locale, string>>;

export type EventRow = {
  id: string;
  project_id: string;
  member_id: string;
  date: string; // YYYY-MM-DD
  start_hour: number;
  end_hour: number;
  title: string;
  source_lang: Locale;
  translations: Translations;
  created_at: string;
  updated_at: string;
};

// 멤버 색 팔레트 (추가 순서대로 배정) — 흰 글씨가 잘 읽히는 600 톤
export const MEMBER_COLORS = [
  "#e11d48", // rose
  "#2563eb", // blue
  "#16a34a", // green
  "#ea580c", // orange
  "#9333ea", // purple
  "#0d9488", // teal
  "#db2777", // pink
  "#ca8a04", // amber
  "#4f46e5", // indigo
  "#475569", // slate
];

// 로케일에 맞는 이벤트 제목 선택 (없으면 원문 fallback)
export function pickTitle(ev: Pick<EventRow, "title" | "translations">, locale: Locale): string {
  return ev.translations?.[locale]?.trim() || ev.title;
}
