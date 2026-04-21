"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter, useSearchParams, useParams } from "next/navigation";
import { useTranslations } from "next-intl";

export default function AddClient() {
  const router = useRouter();
  const sp = useSearchParams();
  const params = useParams();
  const locale = String(params?.locale ?? "en");

  const token = useMemo(() => sp.get("token") ?? "", [sp]);
  const t = useTranslations("addClient");

  const [status, setStatus] = useState<"idle" | "loading" | "ok" | "error">(
    "idle"
  );
  const [message, setMessage] = useState("");

  const startedRef = useRef(false);

  useEffect(() => {
    async function run() {
      if (startedRef.current) return;
      startedRef.current = true;

      if (!token) {
        setStatus("error");
        setMessage(t("errors.missingToken"));
        return;
      }

      setStatus("loading");
      setMessage(t("checkingSession"));

      try {
        const meRes = await fetch("/api/auth/client/me", {
          method: "GET",
          cache: "no-store",
        });

        if (meRes.status === 401 || meRes.status === 403) {
          router.replace(
            `/${locale}/client/login?next=${encodeURIComponent(
              `/${locale}/add?token=${token}`
            )}`
          );
          return;
        }

        if (!meRes.ok) {
          throw new Error(t("errors.sessionCheck"));
        }

        const meData = await meRes.json();

        if (!meData?.authenticated) {
          router.replace(
            `/${locale}/client/login?next=${encodeURIComponent(
              `/${locale}/add?token=${token}`
            )}`
          );
          return;
        }

        setMessage(t("addingCard"));

        const res = await fetch("/api/cards/claim", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ token }),
        });

        const data: any = await res.json().catch(() => ({}));

        if (res.status === 401 || res.status === 403) {
          router.replace(
            `/${locale}/client/login?next=${encodeURIComponent(
              `/${locale}/add?token=${token}`
            )}`
          );
          return;
        }

        if (!res.ok) {
          setStatus("error");
          setMessage(data?.error ?? `${t("errors.http")} ${res.status}`);
          return;
        }

        const cardId = data?.cardId;

        if (!cardId || typeof cardId !== "string") {
          setStatus("error");
          setMessage(t("errors.missingCardId"));
          return;
        }

        setStatus("ok");
        setMessage(t("success"));

        window.setTimeout(() => {
          router.replace(`/${locale}/wallet/card/${encodeURIComponent(cardId)}`);
        }, 900);
      } catch (err: any) {
        setStatus("error");
        setMessage(String(err?.message ?? err ?? t("errors.network")));
      }
    }

    run();
  }, [token, router, t, locale]);

  return (
    <main
      style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 20,
        background:
          "linear-gradient(180deg, #fafaf9 0%, #f4f4f5 45%, #f8fafc 100%)",
        fontFamily:
          'Inter, Arial, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
      }}
    >
      <div
        style={{
          width: "100%",
          maxWidth: 420,
          border: "1px solid #e5e7eb",
          borderRadius: 24,
          padding: 24,
          textAlign: "center",
          background: "#fff",
          boxShadow: "0 10px 30px rgba(0,0,0,0.08)",
        }}
      >
        <h1 style={{ fontSize: 24, margin: 0, marginBottom: 14 }}>
          {t("title")}
        </h1>

        <div style={{ fontSize: 46, marginBottom: 14 }}>
          {status === "loading" && "⏳"}
          {status === "ok" && "✅"}
          {status === "error" && "❌"}
        </div>

        <div
          style={{
            fontSize: 15,
            lineHeight: 1.5,
            marginBottom: 18,
            color: status === "error" ? "#991b1b" : "#111827",
            minHeight: 46,
          }}
        >
          {message}
        </div>

        {status === "loading" ? (
          <div
            style={{
              width: "100%",
              height: 8,
              borderRadius: 999,
              background: "#e5e7eb",
              overflow: "hidden",
              marginBottom: 16,
            }}
          >
            <div
              style={{
                width: "45%",
                height: "100%",
                borderRadius: 999,
                background: "#111827",
                animation: "fw-loading-bar 1.1s ease-in-out infinite",
              }}
            />
            <style>{`
              @keyframes fw-loading-bar {
                0% { transform: translateX(-120%); }
                100% { transform: translateX(320%); }
              }
            `}</style>
          </div>
        ) : null}

        <div style={{ fontSize: 11, opacity: 0.6 }}>
          {t("token")} : <code>{token || t("empty")}</code>
        </div>
      </div>
    </main>
  );
}