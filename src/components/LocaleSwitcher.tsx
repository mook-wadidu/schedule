"use client";

import { useLocale, useTranslations } from "next-intl";
import { LOCALES } from "@/lib/types";

export default function LocaleSwitcher() {
  const locale = useLocale();
  const t = useTranslations("lang");

  function change(l: string) {
    document.cookie = `NEXT_LOCALE=${l}; path=/; max-age=${60 * 60 * 24 * 365}`;
    window.location.reload();
  }

  return (
    <select
      value={locale}
      onChange={(e) => change(e.target.value)}
      aria-label="Language"
      className="field w-auto cursor-pointer py-1.5 pr-7 text-sm"
    >
      {LOCALES.map((l) => (
        <option key={l} value={l}>
          {t(l)}
        </option>
      ))}
    </select>
  );
}
