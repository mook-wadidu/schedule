import { Locale, LOCALES, Translations } from "@/lib/types";

// 이벤트 제목을 원문 언어 기준으로 한/일/영 3개 언어 번역본으로 만든다.
// M4에서 LibreTranslate 연동으로 채워짐. 지금은 원문만 담아 반환(안전한 기본값).
//
// 설계: 번역 실패/미설정이어도 절대 저장을 막지 않는다. 실패한 언어는 생략되고,
// 읽을 때 pickTitle()이 원문으로 fallback 한다.
export async function translateTitle(
  title: string,
  sourceLang: Locale,
): Promise<Translations> {
  const result: Translations = { [sourceLang]: title };

  const endpoint = process.env.LIBRETRANSLATE_URL;
  if (!endpoint) {
    // 번역 서버 미설정 → 원문만.
    return result;
  }

  const targets = LOCALES.filter((l) => l !== sourceLang);
  await Promise.all(
    targets.map(async (target) => {
      try {
        const translated = await callLibreTranslate(endpoint, title, sourceLang, target);
        if (translated) result[target] = translated;
      } catch (err) {
        // 개별 언어 실패는 무시 (원문 fallback).
        console.warn(`translate ${sourceLang}->${target} failed`, err);
      }
    }),
  );

  return result;
}

async function callLibreTranslate(
  endpoint: string,
  q: string,
  source: Locale,
  target: Locale,
): Promise<string | null> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 4000);
  try {
    const res = await fetch(`${endpoint.replace(/\/$/, "")}/translate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        q,
        source,
        target,
        format: "text",
        ...(process.env.LIBRETRANSLATE_API_KEY
          ? { api_key: process.env.LIBRETRANSLATE_API_KEY }
          : {}),
      }),
      signal: controller.signal,
    });
    if (!res.ok) return null;
    const data = (await res.json()) as { translatedText?: string };
    return data.translatedText?.trim() || null;
  } finally {
    clearTimeout(timeout);
  }
}
