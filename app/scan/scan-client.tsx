"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import QrScanner from "qr-scanner";

// ✅ obligatoire pour qr-scanner (worker)
QrScanner.WORKER_PATH = "/qr-scanner-worker.min.js";

type Payload = {
  storeId: string;
  customerId: string;
};

function safeParsePayload(text: string): { ok: true; payload: Payload } | { ok: false; error: string } {
  try {
    const obj = JSON.parse(text);

    if (!obj || typeof obj !== "object") {
      return { ok: false, error: "QR invalide : JSON non conforme." };
    }

    const storeId = (obj as any).storeId;
    const customerId = (obj as any).customerId;

    if (typeof storeId !== "string" || storeId.trim() === "") {
      return { ok: false, error: "QR invalide : storeId manquant." };
    }
    if (typeof customerId !== "string" || customerId.trim() === "") {
      return { ok: false, error: "QR invalide : customerId manquant." };
    }

    return { ok: true, payload: { storeId, customerId } };
  } catch {
    return { ok: false, error: "QR invalide : le contenu n’est pas du JSON." };
  }
}

export default function ScanClient() {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const scannerRef = useRef<QrScanner | null>(null);

  const [isRunning, setIsRunning] = useState(false);
  const [rawText, setRawText] = useState<string>("");
  const [parsed, setParsed] = useState<Payload | null>(null);
  const [error, setError] = useState<string>("");

  const canStop = useMemo(() => isRunning, [isRunning]);

  useEffect(() => {
    return () => {
      // cleanup à la sortie de page
      if (scannerRef.current) {
        scannerRef.current.stop();
        scannerRef.current.destroy();
        scannerRef.current = null;
      }
    };
  }, []);

  async function start() {
    setError("");
    setParsed(null);
    setRawText("");

    const video = videoRef.current;
    if (!video) {
      setError("Vidéo non prête.");
      return;
    }

    try {
      // Si un scanner existe déjà, on le détruit proprement
      if (scannerRef.current) {
        await scannerRef.current.stop();
        scannerRef.current.destroy();
        scannerRef.current = null;
      }

      const scanner = new QrScanner(
        video,
        (result) => {
          const text = typeof result === "string" ? result : result.data;
          setRawText(text);

          const parsedResult = safeParsePayload(text);
          if (parsedResult.ok) {
            setParsed(parsedResult.payload);
            setError("");
            // ✅ on stop dès qu'on a un QR valide (plus propre en caisse)
            scanner.stop();
            setIsRunning(false);
          } else {
            setParsed(null);
            setError(parsedResult.error);
          }
        },
        {
          // mobile-friendly
          preferredCamera: "environment",
          highlightScanRegion: true,
          highlightCodeOutline: true,
          returnDetailedScanResult: true,
        }
      );

      scannerRef.current = scanner;
      await scanner.start();
      setIsRunning(true);
    } catch (e: any) {
      setIsRunning(false);
      setError(
        e?.message?.includes("Permission")
          ? "Permission caméra refusée. Autorise la caméra puis réessaie."
          : `Impossible de démarrer la caméra. ${e?.message ?? ""}`.trim()
      );
    }
  }

  async function stop() {
    setError("");
    if (!scannerRef.current) return;

    await scannerRef.current.stop();
    setIsRunning(false);
  }

  function reset() {
    setError("");
    setRawText("");
    setParsed(null);
  }

  return (
    <section style={{ display: "grid", gap: 12 }}>
      <div
        style={{
          border: "1px solid rgba(0,0,0,0.15)",
          borderRadius: 12,
          padding: 12,
          background: "rgba(0,0,0,0.02)",
        }}
      >
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 10 }}>
          <button
            onClick={start}
            disabled={isRunning}
            style={{
              padding: "10px 12px",
              borderRadius: 10,
              border: "1px solid rgba(0,0,0,0.2)",
              cursor: isRunning ? "not-allowed" : "pointer",
              fontWeight: 600,
            }}
          >
            Démarrer le scan
          </button>

          <button
            onClick={stop}
            disabled={!canStop}
            style={{
              padding: "10px 12px",
              borderRadius: 10,
              border: "1px solid rgba(0,0,0,0.2)",
              cursor: canStop ? "pointer" : "not-allowed",
              fontWeight: 600,
            }}
          >
            Stop
          </button>

          <button
            onClick={reset}
            style={{
              padding: "10px 12px",
              borderRadius: 10,
              border: "1px solid rgba(0,0,0,0.2)",
              cursor: "pointer",
              fontWeight: 600,
            }}
          >
            Reset
          </button>
        </div>

        <div style={{ borderRadius: 12, overflow: "hidden" }}>
          <video
            ref={videoRef}
            muted
            playsInline
            style={{
              width: "100%",
              height: "auto",
              display: "block",
              background: "#000",
            }}
          />
        </div>

        {error && (
          <div style={{ marginTop: 10, padding: 10, borderRadius: 10, background: "rgba(255,0,0,0.08)" }}>
            <b>Erreur :</b> {error}
          </div>
        )}
      </div>

      <div
        style={{
          border: "1px solid rgba(0,0,0,0.15)",
          borderRadius: 12,
          padding: 12,
        }}
      >
        <h2 style={{ fontSize: 18, fontWeight: 700, marginTop: 0 }}>Résultat</h2>

        {parsed ? (
          <div style={{ display: "grid", gap: 8 }}>
            <div>
              <div style={{ fontSize: 12, opacity: 0.7 }}>storeId</div>
              <div style={{ fontFamily: "monospace", fontSize: 14 }}>{parsed.storeId}</div>
            </div>
            <div>
              <div style={{ fontSize: 12, opacity: 0.7 }}>customerId</div>
              <div style={{ fontFamily: "monospace", fontSize: 14 }}>{parsed.customerId}</div>
            </div>

            <div style={{ marginTop: 6, opacity: 0.75 }}>
              ✅ QR valide. (Aucune incrémentation à cette étape)
            </div>
          </div>
        ) : (
          <div style={{ opacity: 0.8 }}>
            Scanne un QR client pour afficher <code>storeId</code> et <code>customerId</code>.
          </div>
        )}

        {rawText && (
          <details style={{ marginTop: 10 }}>
            <summary style={{ cursor: "pointer" }}>Voir le contenu brut</summary>
            <pre
              style={{
                marginTop: 8,
                padding: 10,
                borderRadius: 10,
                background: "rgba(0,0,0,0.04)",
                overflowX: "auto",
              }}
            >
              {rawText}
            </pre>
          </details>
        )}
      </div>
    </section>
  );
}
