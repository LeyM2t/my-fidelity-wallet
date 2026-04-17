"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";

const LOCALES = ["fr", "en", "es"] as const;
type Locale = (typeof LOCALES)[number];

function replaceLocaleInPath(path: string, newLocale: Locale) {
  const segments = path.split("/");

  if (segments.length > 1 && LOCALES.includes(segments[1] as Locale)) {
    segments[1] = newLocale;
    return segments.join("/");
  }

  return `/${newLocale}${path.startsWith("/") ? path : `/${path}`}`;
}

export default function LanguageSwitcher() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const t = useTranslations("language");

  const currentLocale = pathname?.split("/")[1] as Locale;

  function handleChangeLocale(newLocale: Locale) {
    if (!pathname) return;

    const newPathname = replaceLocaleInPath(pathname, newLocale);

    const params = new URLSearchParams(searchParams.toString());
    const next = params.get("next");

    if (next && next.startsWith("/")) {
      params.set("next", replaceLocaleInPath(next, newLocale));
    }

    const queryString = params.toString();
    router.push(queryString ? `${newPathname}?${queryString}` : newPathname);
  }

  return (
    <div
      style={{
        display: "flex",
        gap: 10,
        justifyContent: "center",
        alignItems: "center",
      }}
    >
      {LOCALES.map((locale) => {
        const active = locale === currentLocale;

        return (
          <button
            key={locale}
            type="button"
            onClick={() => handleChangeLocale(locale)}
            style={{
              padding: "8px 14px",
              borderRadius: 999,
              border: active ? "1px solid #111827" : "1px solid #d1d5db",
              background: active ? "#111827" : "#ffffff",
              color: active ? "#ffffff" : "#111827",
              fontSize: 14,
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            {t(locale)}
          </button>
        );
      })}
    </div>
  );
}