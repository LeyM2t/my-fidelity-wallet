"use client";

import { useEffect, useMemo, useState } from "react";
import { QRCodeSVG } from "qrcode.react";
import { useTranslations } from "next-intl";

function slugify(input: string) {
  return input
    .trim()
    .toUpperCase()
    .replace(/\s+/g, "_")
    .replace(/[^A-Z0-9_]/g, "");
}

export default function MerchantQrPage() {
  const t = useTranslations("merchantQr");

  const [merchantId, setMerchantId] = useState("DEMO123");
  const [merchantName, setMerchantName] = useState("Demo Restaurant");
  const [goal, setGoal] = useState(10);

  const [origin, setOrigin] = useState<string>("");

  useEffect(() => {
    setOrigin(window.location.origin);
  }, []);

  const url = useMemo(() => {
    const id = slugify(merchantId || "DEMO123");
    const name = encodeURIComponent(merchantName || t("defaultName"));
    const g = Number.isFinite(goal) && goal > 0 ? goal : 10;

    if (!origin) return `/r/${id}?name=${name}&goal=${g}`;
    return `${origin}/r/${id}?name=${name}&goal=${g}`;
  }, [merchantId, merchantName, goal, origin, t]);

  async function copy() {
    try {
      await navigator.clipboard.writeText(url);
      alert(t("copySuccess"));
    } catch {
      alert(t("copyFail") + url);
    }
  }

  return (
    <main
      style={{
        minHeight: "100vh",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        padding: 20,
        textAlign: "center",
      }}
    >
      {/* 🔥 TITLE */}
      <h1 style={{ fontSize: 28, marginBottom: 8 }}>
        {merchantName}
      </h1>

      <p style={{ marginBottom: 20, opacity: 0.8 }}>
        {t("title")}
      </p>

      {/* 🔥 QR BLOCK */}
      <div
        style={{
          padding: 24,
          borderRadius: 20,
          background: "#fff",
          boxShadow: "0 10px 30px rgba(0,0,0,0.1)",
          marginBottom: 20,
        }}
      >
        {!origin ? (
          <div>{t("loadingQR")}</div>
        ) : (
          <QRCodeSVG value={url} size={320} />
        )}
      </div>

      {/* 🔥 CTA */}
      <div style={{ fontSize: 16, marginBottom: 20 }}>
        👉 Scannez pour ajouter votre carte
      </div>

      {/* 🔥 ACTIONS */}
      <div style={{ display: "flex", gap: 10, flexWrap: "wrap", justifyContent: "center" }}>
        <button
          onClick={copy}
          style={{
            padding: "10px 14px",
            borderRadius: 12,
            border: "1px solid #ddd",
            background: "#111",
            color: "#fff",
            fontWeight: 600,
            cursor: "pointer",
          }}
        >
          {t("copy")}
        </button>

        <a
          href={url}
          style={{
            padding: "10px 14px",
            borderRadius: 12,
            border: "1px solid #ddd",
            textDecoration: "none",
            color: "#111",
          }}
        >
          {t("open")}
        </a>
      </div>

      {/* 🔥 DEV SETTINGS (OPTIONNEL) */}
      <details style={{ marginTop: 30, maxWidth: 400, width: "100%" }}>
        <summary style={{ cursor: "pointer", opacity: 0.7 }}>
          ⚙️ Config
        </summary>

        <div style={{ display: "grid", gap: 10, marginTop: 10 }}>
          <input
            value={merchantId}
            onChange={(e) => setMerchantId(e.target.value)}
            placeholder="MERCHANT_ID"
            style={{ padding: 10 }}
          />

          <input
            value={merchantName}
            onChange={(e) => setMerchantName(e.target.value)}
            placeholder="Merchant name"
            style={{ padding: 10 }}
          />

          <input
            type="number"
            value={goal}
            onChange={(e) => setGoal(parseInt(e.target.value || "10", 10))}
            style={{ padding: 10 }}
          />
        </div>
      </details>
    </main>
  );
}