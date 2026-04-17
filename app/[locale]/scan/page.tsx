"use client";

import { useEffect, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import QrScanner from "qr-scanner";
import { useTranslations } from "next-intl";

type ClientPayload = {
  storeId: string;
  cardId?: string;
};

function safeJsonParse(raw: string): any | null {
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

function parseClientPayload(raw: string): ClientPayload | null {
  const obj = safeJsonParse(raw);
  if (!obj || typeof obj !== "object") return null;

  const storeId = (obj as any).storeId;
  const cardId = (obj as any).cardId;

  if (typeof storeId !== "string" || !storeId) return null;

  return {
    storeId,
    cardId: typeof cardId === "string" ? cardId : undefined,
  };
}

function getScanSecret(storeId: string) {
  try {
    return localStorage.getItem(`fw_scanSecret_${storeId}`) || "";
  } catch {
    return "";
  }
}

function setScanSecret(storeId: string, value: string) {
  try {
    localStorage.setItem(`fw_scanSecret_${storeId}`, value);
  } catch {}
}

export default function ScanPage() {
  const router = useRouter();
  const params = useParams<{ locale: string }>();
  const locale = String(params?.locale ?? "en");
  const t = useTranslations("scan");

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const scannerRef = useRef<QrScanner | null>(null);

  const [payload, setPayload] = useState<ClientPayload | null>(null);
  const [currentCardId, setCurrentCardId] = useState<string | null>(null);

  const [scanSecret, setScanSecretState] = useState("");
  const [status, setStatus] = useState(t("status.pending"));
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const scanner = new QrScanner(
      video,
      (result) => {
        const txt = typeof result === "string" ? result : result?.data;
        if (!txt) return;

        const p = parseClientPayload(txt);

        if (!p) {
          setStatus(t("status.invalid"));
          return;
        }

        setPayload(p);
        setCurrentCardId(p.cardId || null);

        if (p.storeId) {
          setScanSecretState(getScanSecret(p.storeId));
        }

        setStatus(t("status.detected"));
      },
      {
        highlightScanRegion: true,
        highlightCodeOutline: true,
      }
    );

    scannerRef.current = scanner;

    scanner.start().catch(() => {
      setStatus(t("status.cameraError"));
    });

    return () => {
      scanner.stop();
      scanner.destroy();
    };
  }, [t]);

  function buildHeaders(): HeadersInit {
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
    };

    if (scanSecret.trim()) {
      headers["x-scan-secret"] = scanSecret.trim();
    }

    return headers;
  }

  async function doEarn() {
    if (!currentCardId) return;

    setBusy(true);
    setStatus(t("status.adding"));

    try {
      const res = await fetch("/api/addStamps", {
        method: "POST",
        headers: buildHeaders(),
        body: JSON.stringify({ cardId: currentCardId, add: 1 }),
      });

      if (!res.ok) {
        throw new Error();
      }

      setStatus(t("status.added"));
    } catch {
      setStatus(t("status.addError"));
    } finally {
      setBusy(false);
    }
  }

  async function doConsume() {
    if (!currentCardId) return;

    setBusy(true);
    setStatus(t("status.validating"));

    try {
      const res = await fetch("/api/consumeReward", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ cardId: currentCardId }),
      });

      if (!res.ok) {
        throw new Error();
      }

      setStatus(t("status.validated"));
    } catch {
      setStatus(t("status.rewardError"));
    } finally {
      setBusy(false);
    }
  }

  return (
    <main
      style={{
        minHeight: "100dvh",
        background:
          "linear-gradient(180deg, #fafaf9 0%, #f4f4f5 45%, #f8fafc 100%)",
        padding: 18,
        fontFamily:
          'Inter, Arial, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
      }}
    >
      <div
        style={{
          maxWidth: 720,
          margin: "0 auto",
          display: "grid",
          gap: 18,
        }}
      >
        <section style={{ display: "flex", justifyContent: "space-between" }}>
          <button
            onClick={() => router.push(`/${locale}/merchant`)}
            style={{
              height: 44,
              borderRadius: 16,
              border: "none",
              background: "#18181b",
              color: "#fff",
              padding: "0 16px",
              fontWeight: 700,
              cursor: "pointer",
            }}
          >
            ← {t("back")}
          </button>
        </section>

        <section
          style={{
            borderRadius: 28,
            padding: 22,
            background: "linear-gradient(135deg, #3f3f46 0%, #18181b 100%)",
            color: "#fff",
          }}
        >
          <h1 style={{ margin: 0, fontSize: 28 }}>{t("title")}</h1>
          <p style={{ marginTop: 8, opacity: 0.9 }}>{t("description")}</p>
        </section>

        <section
          style={{
            borderRadius: 28,
            overflow: "hidden",
            background: "#18181b",
            aspectRatio: "3 / 4",
            position: "relative",
          }}
        >
          <video
            ref={videoRef}
            style={{
              width: "100%",
              height: "100%",
              objectFit: "cover",
            }}
            playsInline
            muted
          />

          <div
            style={{
              position: "absolute",
              inset: "20%",
              border: "2px solid white",
              borderRadius: 20,
              boxShadow: "0 0 0 9999px rgba(0,0,0,0.3)",
            }}
          />
        </section>

        <section
          style={{
            borderRadius: 20,
            padding: 14,
            background: "#fff",
            border: "1px solid #e4e4e7",
            textAlign: "center",
            fontWeight: 700,
            color: "#374151",
          }}
        >
          {status}
        </section>

        <section
          style={{
            display: "flex",
            gap: 12,
          }}
        >
          <button
            onClick={doEarn}
            disabled={!currentCardId || busy}
            style={{
              flex: 1,
              height: 52,
              borderRadius: 18,
              border: "none",
              background: !currentCardId || busy ? "#9ca3af" : "#18181b",
              color: "#fff",
              fontWeight: 800,
              cursor: !currentCardId || busy ? "default" : "pointer",
              opacity: 1,
            }}
          >
            {t("earn")}
          </button>

          <button
            onClick={doConsume}
            disabled={!currentCardId || busy}
            style={{
              flex: 1,
              height: 52,
              borderRadius: 18,
              border: "1px solid #d4d4d8",
              background: !currentCardId || busy ? "#e5e7eb" : "#18181b",
              color: !currentCardId || busy ? "#6b7280" : "#fff",
              fontWeight: 800,
              cursor: !currentCardId || busy ? "default" : "pointer",
              opacity: 1,
            }}
          >
            {t("reward")}
          </button>
        </section>

        {payload?.storeId && (
          <section
            style={{
              borderRadius: 20,
              padding: 14,
              background: "#fff",
              border: "1px solid #e4e4e7",
            }}
          >
            <div style={{ fontSize: 12, marginBottom: 6 }}>
              {t("scanSecret")}
            </div>

            <input
              value={scanSecret}
              onChange={(e) => {
                const v = e.target.value;
                setScanSecretState(v);
                setScanSecret(payload.storeId, v);
              }}
              style={{
                width: "100%",
                height: 44,
                borderRadius: 12,
                border: "1px solid #ddd",
                padding: "0 10px",
              }}
            />
          </section>
        )}
      </div>
    </main>
  );
}