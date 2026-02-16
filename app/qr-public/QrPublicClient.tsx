"use client";

import { useMemo } from "react";
import { useSearchParams } from "next/navigation";
import { QRCodeCanvas } from "qrcode.react";

export default function QrPublicClient() {
  const searchParams = useSearchParams();
  const token = searchParams.get("token") ?? "";

  const url = useMemo(() => {
    const baseUrl = window.location.origin;
    return `${baseUrl}/add?token=${encodeURIComponent(token)}`;
  }, [token]);

  return (
    <main style={{ padding: 24, fontFamily: "Arial", maxWidth: 720, margin: "0 auto" }}>
      <h1 style={{ fontSize: 22, marginBottom: 8 }}>QR Public</h1>

      <div style={{ fontSize: 13, color: "#666", marginBottom: 12 }}>
        URL : <code>{url}</code>
      </div>

      <div
        style={{
          padding: 16,
          border: "1px solid #ddd",
          borderRadius: 16,
          display: "inline-block",
          background: "white",
        }}
      >
        <QRCodeCanvas value={url} size={420} />
      </div>

      {!token ? (
        <p style={{ marginTop: 12, color: "#b91c1c" }}>
          ⚠️ token manquant dans l’URL (ex: /qr-public?token=XXXX)
        </p>
      ) : null}
    </main>
  );
}
