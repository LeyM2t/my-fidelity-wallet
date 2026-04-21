"use client";

import { useEffect, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import QrScanner from "qr-scanner";
import { useTranslations } from "next-intl";

QrScanner.WORKER_PATH = "/qr-scanner-worker.min.js";

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

  if (typeof storeId !== "string" || !storeId.trim()) return null;

  return {
    storeId: storeId.trim(),
    cardId: typeof cardId === "string" && cardId.trim() ? cardId.trim() : undefined,
  };
}

function clampAddCount(value: number) {
  if (!Number.isFinite(value)) return 1;
  return Math.max(1, Math.min(50, Math.floor(value)));
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

  const [status, setStatus] = useState("");
  const [busy, setBusy] = useState(false);
  const [scannerReady, setScannerReady] = useState(false);
  const [startingCamera, setStartingCamera] = useState(false);
  const [hasCamera, setHasCamera] = useState<boolean | null>(null);
  const [hasDetectedClient, setHasDetectedClient] = useState(false);
  const [addCount, setAddCount] = useState(1);

  async function stopScanner() {
    const scanner = scannerRef.current;
    if (!scanner) return;

    try {
      await scanner.stop();
    } catch {}

    setScannerReady(false);
  }

  async function startScanner() {
    const video = videoRef.current;
    if (!video) return;

    try {
      setStartingCamera(true);
      setStatus(t("startingCamera"));

      const camAvailable = await QrScanner.hasCamera();
      setHasCamera(camAvailable);

      if (!camAvailable) {
        setScannerReady(false);
        setStatus(t("errors.cameraUnavailable"));
        return;
      }

      if (scannerRef.current) {
        try {
          await scannerRef.current.stop();
        } catch {}
        scannerRef.current.destroy();
        scannerRef.current = null;
      }

      const scanner = new QrScanner(
        video,
        async (result) => {
          const txt = typeof result === "string" ? result : result?.data;
          if (!txt || busy || hasDetectedClient) return;

          const parsed = parseClientPayload(txt);

          if (!parsed) {
            setStatus(t("status.invalid"));
            return;
          }

          setPayload(parsed);
          setCurrentCardId(parsed.cardId || null);
          setHasDetectedClient(true);
          setStatus(t("status.detected"));

          await stopScanner();
        },
        {
          preferredCamera: "environment",
          highlightScanRegion: true,
          highlightCodeOutline: true,
          returnDetailedScanResult: true,
        }
      );

      scannerRef.current = scanner;
      await scanner.start();

      setScannerReady(true);
      setStatus(t("status.pending"));
    } catch (e: any) {
      setScannerReady(false);
      setStatus(e?.message || t("errors.cameraError"));
    } finally {
      setStartingCamera(false);
    }
  }

  useEffect(() => {
    setStatus(t("status.pending"));
  }, [t]);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    startScanner();

    return () => {
      const scanner = scannerRef.current;
      if (!scanner) return;

      try {
        scanner.stop();
      } catch {}

      scanner.destroy();
      scannerRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function doEarn() {
    if (!currentCardId || busy) return;

    const safeAdd = clampAddCount(addCount);

    setBusy(true);
    setStatus(t("status.adding"));

    try {
      const res = await fetch("/api/addStamps", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ cardId: currentCardId, add: safeAdd }),
      });

      const data = await res.json().catch(() => null);

      if (!res.ok) {
        throw new Error(data?.error || t("status.addError"));
      }

      setStatus(t("status.added"));
    } catch (e) {
      const message =
        e instanceof Error && e.message ? e.message : t("status.addError");
      setStatus(message);
    } finally {
      setBusy(false);
    }
  }

  async function doConsume() {
    if (!currentCardId || busy) return;

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

      const data = await res.json().catch(() => null);

      if (!res.ok) {
        throw new Error(data?.error || t("status.rewardError"));
      }

      setStatus(t("status.validated"));
    } catch (e) {
      const message =
        e instanceof Error && e.message ? e.message : t("status.rewardError");
      setStatus(message);
    } finally {
      setBusy(false);
    }
  }

  async function resetScan() {
    setPayload(null);
    setCurrentCardId(null);
    setHasDetectedClient(false);
    setAddCount(1);
    setStatus(t("status.pending"));
    await startScanner();
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
              display: hasCamera === false ? "none" : "block",
            }}
            playsInline
            muted
          />

          {hasCamera !== false ? (
            <div
              style={{
                position: "absolute",
                inset: "20%",
                border: "2px solid white",
                borderRadius: 20,
                boxShadow: "0 0 0 9999px rgba(0,0,0,0.3)",
              }}
            />
          ) : null}

          {startingCamera ? (
            <div
              style={{
                position: "absolute",
                inset: 0,
                display: "grid",
                placeItems: "center",
                background: "rgba(0,0,0,0.35)",
                color: "#fff",
                fontWeight: 800,
                textAlign: "center",
                padding: 20,
              }}
            >
              {t("startingCamera")}
            </div>
          ) : null}

          {hasCamera === false ? (
            <div
              style={{
                position: "absolute",
                inset: 0,
                display: "grid",
                placeItems: "center",
                background: "rgba(0,0,0,0.35)",
                color: "#fff",
                fontWeight: 800,
                textAlign: "center",
                padding: 20,
              }}
            >
              {t("errors.cameraUnavailable")}
            </div>
          ) : null}

          {hasDetectedClient ? (
            <div
              style={{
                position: "absolute",
                inset: 0,
                display: "grid",
                placeItems: "center",
                background: "rgba(0,0,0,0.35)",
                color: "#fff",
                fontWeight: 800,
                textAlign: "center",
                padding: 20,
              }}
            >
              <div>
                <div style={{ fontSize: 18, marginBottom: 8 }}>
                  {t("status.detected")}
                </div>
                <div style={{ fontSize: 13, opacity: 0.9 }}>
                  {t("detectedCard")}
                  {currentCardId ? ` : ${currentCardId}` : ""}
                </div>
                {payload?.storeId ? (
                  <div style={{ fontSize: 12, opacity: 0.8, marginTop: 6 }}>
                    {payload.storeId}
                  </div>
                ) : null}
              </div>
            </div>
          ) : null}
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
            wordBreak: "break-word",
          }}
        >
          {status}
        </section>

        {hasDetectedClient ? (
          <section
            style={{
              borderRadius: 20,
              padding: 14,
              background: "#fff",
              border: "1px solid #e4e4e7",
            }}
          >
            <div
              style={{
                fontSize: 12,
                marginBottom: 8,
                color: "#374151",
                fontWeight: 700,
              }}
            >
              {t("quantity")}
            </div>

            <div
              style={{
                display: "grid",
                gridTemplateColumns: "56px 1fr 56px",
                gap: 10,
                alignItems: "center",
              }}
            >
              <button
                type="button"
                onClick={() => setAddCount((prev) => clampAddCount(prev - 1))}
                disabled={busy}
                style={{
                  height: 48,
                  borderRadius: 14,
                  border: "1px solid #d4d4d8",
                  background: "#fff",
                  color: "#111827",
                  fontSize: 24,
                  fontWeight: 800,
                  cursor: busy ? "default" : "pointer",
                }}
              >
                −
              </button>

              <input
                type="number"
                min={1}
                max={50}
                step={1}
                value={addCount}
                onChange={(e) =>
                  setAddCount(clampAddCount(Number(e.target.value)))
                }
                style={{
                  width: "100%",
                  height: 48,
                  borderRadius: 14,
                  border: "1px solid #d4d4d8",
                  padding: "0 12px",
                  fontSize: 18,
                  fontWeight: 800,
                  color: "#111827",
                  background: "#ffffff",
                  textAlign: "center",
                  boxSizing: "border-box",
                }}
              />

              <button
                type="button"
                onClick={() => setAddCount((prev) => clampAddCount(prev + 1))}
                disabled={busy}
                style={{
                  height: 48,
                  borderRadius: 14,
                  border: "1px solid #d4d4d8",
                  background: "#fff",
                  color: "#111827",
                  fontSize: 24,
                  fontWeight: 800,
                  cursor: busy ? "default" : "pointer",
                }}
              >
                +
              </button>
            </div>
          </section>
        ) : null}

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
            }}
          >
            {hasDetectedClient ? t("addStamps") : t("earn")}
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
            }}
          >
            {t("reward")}
          </button>
        </section>

        {hasDetectedClient ? (
          <section style={{ display: "flex" }}>
            <button
              type="button"
              onClick={resetScan}
              disabled={busy}
              style={{
                width: "100%",
                height: 48,
                borderRadius: 18,
                border: "1px solid #d4d4d8",
                background: "#fff",
                color: "#18181b",
                fontWeight: 800,
                cursor: busy ? "default" : "pointer",
              }}
            >
              {t("scanAnother")}
            </button>
          </section>
        ) : null}

        <section
          style={{
            borderRadius: 18,
            padding: 12,
            background: "#fff",
            border: "1px solid #e5e7eb",
            color: "#6b7280",
            fontSize: 12,
            lineHeight: 1.5,
          }}
        >
          {scannerReady ? t("scannerActive") : t("scannerPaused")}
        </section>
      </div>
    </main>
  );
}