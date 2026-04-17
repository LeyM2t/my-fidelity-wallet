"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter, useSearchParams, useParams } from "next/navigation";
import { useTranslations } from "next-intl";

export default function AddClient() {
  const router = useRouter();
  const sp = useSearchParams();
  const params = useParams();
  const locale = params?.locale as string;

  const token = useMemo(() => sp.get("token") ?? "", [sp]);
  const t = useTranslations("addClient");

  const [status, setStatus] = useState<"idle" | "loading" | "ok" | "error">("idle");
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

        if (meRes.status === 401) {
          router.replace(`/${locale}/client/login?next=${encodeURIComponent(`/${locale}/add?token=${token}`)}`);
          return;
        }

        if (!meRes.ok) {
          throw new Error(t("errors.sessionCheck"));
        }

        const meData = await meRes.json();

        if (!meData?.authenticated) {
          router.replace(`/${locale}/client/login?next=${encodeURIComponent(`/${locale}/add?token=${token}`)}`);
          return;
        }

        setMessage(t("addingCard"));

        const res = await fetch("/api/cards/claim", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ token }),
        });

        const data: any = await res.json().catch(() => ({}));

        if (res.status === 401) {
          router.replace(`/${locale}/client/login?next=${encodeURIComponent(`/${locale}/add?token=${token}`)}`);
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

        setTimeout(() => {
          router.replace(`/${locale}/wallet/card/${encodeURIComponent(cardId)}`);
        }, 800);
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
        fontFamily: "Arial",
      }}
    >
      <div
        style={{
          width: "100%",
          maxWidth: 420,
          border: "1px solid #e5e7eb",
          borderRadius: 20,
          padding: 24,
          textAlign: "center",
          background: "#fff",
          boxShadow: "0 10px 30px rgba(0,0,0,0.08)",
        }}
      >
        <h1 style={{ fontSize: 22, marginBottom: 12 }}>
          {t("title")}
        </h1>

        {/* 🔥 STATUS ICON */}
        <div style={{ fontSize: 42, marginBottom: 12 }}>
          {status === "loading" && "⏳"}
          {status === "ok" && "✅"}
          {status === "error" && "❌"}
        </div>

        {/* 🔥 MESSAGE */}
        <div style={{ fontSize: 14, marginBottom: 16 }}>
          {message}
        </div>

        {/* 🔥 TOKEN (petit) */}
        <div style={{ fontSize: 11, opacity: 0.6 }}>
          {t("token")} : <code>{token || t("empty")}</code>
        </div>
      </div>
    </main>
  );
}