"use client";

import { useEffect, useRef, useState } from "react";
import QrScanner from "qr-scanner";
import { useRouter } from "next/navigation";
import { applyAddStampsToCard } from "@/app/lib/walletStorage";

// ✅ Payload attendu depuis le commerçant
type ValidationPayload = {
  action: "addStamps";
  cardId: string;
  add: number;
  ts: number;
};

function parseValidationPayload(raw: string): ValidationPayload | null {
  try {
    const obj = JSON.parse(raw);
    if (!obj || typeof obj !== "object") return null;

    if (obj.action !== "addStamps") return null;
    if (typeof obj.cardId !== "string") return null;
    if (typeof obj.add !== "number") return null;

    return {
      action: "addStamps",
      cardId: obj.cardId,
      add: Math.floor(obj.add),
      ts: Number(obj.ts) || Date.now(),
    };
  } catch {
    return null;
  }
}

export default function WalletScanPage() {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const scannerRef = useRef<QrScanner | null>(null);
  const router = useRouter();

  const [status, setStatus] = useState("Prêt à scanner un QR de validation.");
  const [isScanning, setIsScanning] = useState(false);
  const [lastError, setLastError] = useState<string>("");

  async function startScan() {
    if (!videoRef.current) return;

    setStatus("Démarrage caméra…");
    setLastError("");

    scannerRef.current?.stop();
    scannerRef.current?.destroy();
    scannerRef.current = null;

    const scanner = new QrScanner(
      videoRef.current,
      (result) => {
        const text = typeof result === "string" ? result : result.data;

        const payload = parseValidationPayload(text);
        if (!payload) {
          setStatus("❌ QR invalide (pas un QR de validation).");
          return;
        }

        // ✅ On applique les tampons
        applyAddStampsToCard(payload.cardId, payload.add);
        setStatus(`✅ ${payload.add} tampon(s) ajouté(s).`);

        stopScan();

        // petit délai UX puis retour au wallet
        setTimeout(() => {
          router.push("/wallet");
        }, 1000);
      },
      {
        returnDetailedScanResult: true,
        highlightScanRegion: true,
        highlightCodeOutline: true,
        preferredCamera: "environment",
        maxScansPerSecond: 5,
        onDecodeError: (err) => {
          const msg = String((err as any)?.message || err || "");
          setLastError(msg);
          setStatus("Scanning… aligne bien le QR.");
        },
      }
    );

    scannerRef.current = scanner;

    try {
      await scanner.start();
      setIsScanning(true);
      setStatus("Scanning… présente le QR de validation.");
    } catch (e: any) {
      setStatus("❌ Impossible d’accéder à la caméra.");
      setLastError(String(e?.message || e || ""));
      setIsScanning(false);
    }
  }

  function stopScan() {
    scannerRef.current?.stop();
    scannerRef.current?.destroy();
    scannerRef.current = null;
    setIsScanning(false);
  }

  function reset() {
    stopScan();
    setStatus("Prêt à scanner un QR de validation.");
    setLastError("");
  }

  useEffect(() => {
    return () => stopScan();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <main style={{ padding: 16, maxWidth: 720, margin: "0 auto", fontFamily: "Arial" }}>
      <h1 style={{ fontSize: 26, fontWeight: 800, marginBottom: 8 }}>
        Client — Scanner validation
      </h1>

      <div style={{ marginBottom: 12, opacity: 0.8 }}>
        Scanne le QR affiché par le commerçant pour ajouter des tampons.
      </div>

      <div
        style={{
          marginBottom: 12,
          padding: 10,
          borderRadius: 12,
          border: "1px solid rgba(0,0,0,0.15)",
        }}
      >
        <div style={{ fontWeight: 700 }}>Statut</div>
        <div style={{ marginTop: 6 }}>{status}</div>
        {lastError ? (
          <div style={{ marginTop: 6, fontSize: 12, opacity: 0.75 }}>
            Dernière erreur : {lastError}
          </div>
        ) : null}
      </div>

      <div style={{ display: "flex", gap: 8, marginBottom: 12 }}>
        {!isScanning ? (
          <button onClick={startScan} style={{ padding: "10px 12px" }}>
            Démarrer le scan
          </button>
        ) : (
          <button onClick={stopScan} style={{ padding: "10px 12px" }}>
            Stop
          </button>
        )}

        <button onClick={reset} style={{ padding: "10px 12px" }}>
          Reset
        </button>
      </div>

      <div style={{ maxWidth: 420 }}>
        <video
          ref={videoRef}
          style={{ width: "100%", borderRadius: 12, background: "#000" }}
          muted
          playsInline
        />
      </div>
    </main>
  );
}
