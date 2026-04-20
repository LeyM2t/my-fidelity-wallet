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

  const [scanSecret, setScanSecretState] = useState("");
  const [status, setStatus] = useState(t("status.pending"));
  const [busy, setBusy] = useState(false);
  const [scannerReady, setScannerReady] = useState(false);
  const [hasDetectedClient, setHasDetectedClient] = useState(false);
  const [addCount, setAddCount] = useState(1);

  function uiText(key: "quantity" | "scanAnother" | "addStamps" | "detectedCard") {
    const map = {
      fr: {
        quantity: "Quantité de tampons",
        scanAnother: "Scanner un autre client",
        addStamps: "Ajouter les tampons",
        detectedCard: "Carte détectée",
      },
      en: {
        quantity: "Stamp quantity",
        scanAnother: "Scan another client",
        addStamps: "Add stamps",
        detectedCard: "Detected card",
      },
      es: {
        quantity: "Cantidad de sellos",
        scanAnother: "Escanear otro cliente",
        addStamps: "Añadir sellos",
        detectedCard: "Tarjeta detectada",
      },
    } as const;

    const lang =
      locale === "fr" || locale === "es" || locale === "en" ? locale : "en";

    return map[lang][key];
  }

  async function startScanner() {
    const scanner = scannerRef.current;
    if (!scanner) return;

    try {
      await scanner.start();
      setScannerReady(true);
    } catch {
      setScannerReady(false);
      setStatus(t("status.cameraError"));
    }
  }

  async function stopScanner() {
    const scanner = scannerRef.current;
    if (!scanner) return;

    try {
      await scanner.stop();
    } catch {}
    setScannerReady(false);
  }

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const scanner = new QrScanner(
      video,
      async (result) => {
        const txt = typeof result === "string" ? result : result?.data;
        if (!txt || busy || hasDetectedClient) return;

        const p = parseClientPayload(txt);

        if (!p) {
          setStatus(t("status.invalid"));
          return;
        }

        setPayload(p);
        setCurrentCardId(p.cardId || null);
        setHasDetectedClient(true);

        if (p.storeId) {
          setScanSecretState(getScanSecret(p.storeId));
        }

        setStatus(t("status.detected"));
        await stopScanner();
      },
      {
        highlightScanRegion: true,
        highlightCodeOutline: true,
      }
    );

    scannerRef.current = scanner;
    startScanner();

    return () => {
      try {
        scanner.stop();
      } catch {}
      scanner.destroy();
      scannerRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
    if (!currentCardId || busy) return;

    const safeAdd = clampAddCount(addCount);

    setBusy(true);
    setStatus(t("status.adding"));

    try {
      const res = await fetch("/api/addStamps", {
        method: "POST",
        headers: buildHeaders(),
        body: JSON.stringify({ cardId: currentCardId, add: safeAdd }),
      });

      const data = await res.json().catch(() => null);

      if (!res.ok) {
        throw new Error(data?.error || t("status.addError"));
      }

      setStatus(
        safeAdd === 1
          ? t("status.added")
          : `${safeAdd} ${uiText("addStamps").toLowerCase()}`
      );
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
                  {uiText("detectedCard")}
                  {currentCardId ? ` : ${currentCardId}` : ""}
                </div>
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
                marginBottom: 6,
                color: "#6b7280",
                fontWeight: 700,
              }}
            >
              {uiText("quantity")}
            </div>

            <input
              type="number"
              min={1}
              max={50}
              step={1}
              value={addCount}
              onChange={(e) => setAddCount(clampAddCount(Number(e.target.value)))}
              style={{
                width: "100%",
                height: 44,
                borderRadius: 12,
                border: "1px solid #ddd",
                padding: "0 10px",
                fontSize: 16,
                boxSizing: "border-box",
              }}
            />
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
              opacity: 1,
            }}
          >
            {hasDetectedClient ? uiText("addStamps") : t("earn")}
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
              {uiText("scanAnother")}
            </button>
          </section>
        ) : null}

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
                boxSizing: "border-box",
              }}
            />
          </section>
        )}

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
          {scannerReady
            ? locale === "fr"
              ? "Scanner actif. Une fois le client détecté, la carte reste sélectionnée jusqu’à ce que tu choisisses de scanner un autre client."
              : locale === "es"
                ? "Escáner activo. Una vez detectado el cliente, la tarjeta permanece seleccionada hasta que elijas escanear otro cliente."
                : "Scanner active. Once a client is detected, the card stays selected until you choose to scan another client."
            : locale === "fr"
              ? "Scanner en pause."
              : locale === "es"
                ? "Escáner en pausa."
                : "Scanner paused."}
        </section>
      </div>
    </main>
  );
}