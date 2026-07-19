import { getRequestConfig } from "next-intl/server";
import { cookies } from "next/headers";
import { DEFAULT_LOCALE, LOCALES, Locale } from "@/lib/types";

export const LOCALE_COOKIE = "NEXT_LOCALE";

export default getRequestConfig(async () => {
  const store = await cookies();
  const cookieLocale = store.get(LOCALE_COOKIE)?.value as Locale | undefined;
  const locale: Locale =
    cookieLocale && LOCALES.includes(cookieLocale) ? cookieLocale : DEFAULT_LOCALE;

  const messages = (await import(`../../messages/${locale}.json`)).default;
  return { locale, messages };
});
