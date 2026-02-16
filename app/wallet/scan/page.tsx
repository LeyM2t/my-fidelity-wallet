"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import QrScanner from "qr-scanner";

export default function WalletScanPage() {
  const router = useRouter();
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const scannerRef = useRef<QrScanner | null>(null);

  const [err, setErr] = useState<string>("");

  useEffect(() => {
    let cancelled = false;

    async function start() {
      try {
        setErr("");

        const video = videoRef.current;
        if (!video) return;

        const hasCam = await QrScanner.hasCamera();
        if (!hasCam) {
          setErr("Aucune caméra détectée.");
          return;
        }

        const scanner = new QrScanner(
          video,
          (result) => {
            if (cancelled) return;
            const raw = typeof result === "string" ? result : result?.data;

            if (!raw) return;

            // ✅ ton QR commerçant contient une URL /add?token=...
            if (raw.startsWith("http://") || raw.startsWith("https://")) {
              window.location.href = raw;
              return;
            }

            // fallback si un jour tu mets un JSON {token:"..."}
            try {
              const obj = JSON.parse(raw);
              if (obj?.token) {
                window.location.href = `/add?token=${encodeURIComponent(obj.token)}`;
                return;
              }
            } catch {}

            setErr("QR non reconnu. Scanne le QR de la page /merchant.");
          },
          {
            // préférable pour mobile
            preferredCamera: "environment",
            highlightScanRegion: true,
            highlightCodeOutline: true,
          }
        );

        scannerRef.current = scanner;
        await scanner.start();
      } catch (e: any) {
        setErr(e?.message || "Erreur caméra / permission.");
      }
    }

    start();

    return () => {
      cancelled = true;
      scannerRef.current?.stop();
      scannerRef.current?.destroy();
      scannerRef.current = null;
    };
  }, []);

  return (
    <main style={{ padding: 24, fontFamily: "Arial", maxWidth: 820, margin: "0 auto" }}>
      <button onClick={() => router.push("/wallet")} style={{ marginBottom: 12 }}>
        ← Retour wallet
      </button>

      <h1 style={{ fontSize: 26, marginBottom: 8 }}>Scanner QR commerçant</h1>
      <p style={{ opacity: 0.8, marginTop: 0 }}>
        Scanne le QR affiché sur la page commerçant <b>/merchant</b>.
      </p>

      {err ? (
        <div style={{ color: "crimson", marginBottom: 12 }}>
          Erreur : {err}
        </div>
      ) : null}

      <div style={{ border: "1px solid #ddd", borderRadius: 14, padding: 12 }}>
        <video
          ref={videoRef}
          style={{ width: "100%", borderRadius: 12 }}
          playsInline
          muted
        />
      </div>
    </main>
  );
}
