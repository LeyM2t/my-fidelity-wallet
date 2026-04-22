"use client";

import { useEffect, useRef, useState } from "react";
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

function setPreferredLocaleCookie(locale: Locale) {
  document.cookie = `preferredLocale=${locale}; path=/; max-age=${60 * 60 * 24 * 365}; samesite=lax`;
}

function GlobeIcon() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      width="18"
      height="18"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.9"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <circle cx="12" cy="12" r="9" />
      <path d="M3 12h18" />
      <path d="M12 3a14.5 14.5 0 0 1 0 18" />
      <path d="M12 3a14.5 14.5 0 0 0 0 18" />
    </svg>
  );
}

type Props = {
  align?: "left" | "right";
};

export default function LanguageSwitcher({ align = "right" }: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const t = useTranslations("languageMenu");

  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement | null>(null);

  const currentLocale = (pathname?.split("/")[1] as Locale) || "en";

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (!rootRef.current) return;
      if (!rootRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    }

    function handleEscape(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }

    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleEscape);

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleEscape);
    };
  }, []);

  function handleChangeLocale(newLocale: Locale) {
    if (!pathname) return;

    setPreferredLocaleCookie(newLocale);

    const newPathname = replaceLocaleInPath(pathname, newLocale);

    const params = new URLSearchParams(searchParams.toString());
    const next = params.get("next");

    if (next && next.startsWith("/")) {
      params.set("next", replaceLocaleInPath(next, newLocale));
    }

    const queryString = params.toString();
    setOpen(false);
    router.push(queryString ? `${newPathname}?${queryString}` : newPathname);
  }

  return (
    <div
      ref={rootRef}
      style={{
        position: "relative",
        display: "inline-block",
        flexShrink: 0,
      }}
    >
      <button
        type="button"
        aria-label={t("aria")}
        title={t("aria")}
        onClick={() => setOpen((prev) => !prev)}
        style={{
          width: 44,
          height: 44,
          borderRadius: 16,
          border: "1px solid #d4d4d8",
          background: "#ffffff",
          color: "#18181b",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          cursor: "pointer",
          boxShadow: open ? "0 10px 24px rgba(0,0,0,0.08)" : "none",
        }}
      >
        <GlobeIcon />
      </button>

      {open ? (
        <div
          style={{
            position: "absolute",
            top: 52,
            [align]: 0,
            minWidth: 180,
            maxWidth: "min(280px, calc(100vw - 32px))",
            borderRadius: 18,
            border: "1px solid #e4e4e7",
            background: "#ffffff",
            boxShadow: "0 24px 60px rgba(0,0,0,0.16)",
            padding: 8,
            zIndex: 2000,
            boxSizing: "border-box",
          }}
        >
          <div
            style={{
              padding: "8px 10px 6px",
              fontSize: 12,
              fontWeight: 800,
              textTransform: "uppercase",
              letterSpacing: 0.7,
              color: "#71717a",
            }}
          >
            {t("title")}
          </div>

          {LOCALES.map((locale) => {
            const active = locale === currentLocale;

            return (
              <button
                key={locale}
                type="button"
                onClick={() => handleChangeLocale(locale)}
                style={{
                  width: "100%",
                  height: 42,
                  borderRadius: 12,
                  border: "none",
                  background: active ? "#18181b" : "#ffffff",
                  color: active ? "#ffffff" : "#18181b",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  padding: "0 12px",
                  cursor: "pointer",
                  fontSize: 14,
                  fontWeight: 700,
                }}
              >
                <span>{t(locale)}</span>
                {active ? (
                  <span style={{ fontSize: 12, opacity: 0.9 }}>
                    {t("current")}
                  </span>
                ) : null}
              </button>
            );
          })}
        </div>
      ) : null}
    </div>
  );
}