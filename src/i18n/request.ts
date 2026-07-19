import { getRequestConfig } from "next-intl/server";
import { cookies, headers } from "next/headers";
import { LOCALES, Locale } from "@/lib/types";

export const LOCALE_COOKIE = "NEXT_LOCALE";

// 기기(브라우저) 언어에서 한/일/영 감지. 셋 다 아니면 영어.
function detectFromAcceptLanguage(accept: string | null): Locale {
  if (!accept) return "en";
  const tags = accept.split(",").map((s) => s.trim().split(";")[0].toLowerCase());
  for (const tag of tags) {
    if (tag.startsWith("ko")) return "ko";
    if (tag.startsWith("ja")) return "ja";
    if (tag.startsWith("en")) return "en";
  }
  return "en";
}

export default getRequestConfig(async () => {
  const store = await cookies();
  const cookieLocale = store.get(LOCALE_COOKIE)?.value as Locale | undefined;

  let locale: Locale;
  if (cookieLocale && LOCALES.includes(cookieLocale)) {
    // 사용자가 스위처로 고른 언어 우선
    locale = cookieLocale;
  } else {
    // 첫 방문: 기기 언어로 자동 설정
    const h = await headers();
    locale = detectFromAcceptLanguage(h.get("accept-language"));
  }

  const messages = (await import(`../../messages/${locale}.json`)).default;
  return { locale, messages };
});
