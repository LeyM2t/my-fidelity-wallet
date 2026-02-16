"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import QRCode from "qrcode";

function buildUrl(token: string) {
  return `http://10.5.0.2:3000/add?token=${encodeURIComponent(token)}`;
}

export default function QrPublicPage() {
  const params = useSearchParams();
  const token = (params.get("token") || "DEMO").toUpperCase();
  const [dataUrl, setDataUrl] = useState<string>("");

  useEffect(() => {
    const url = buildUrl(token);
    QRCode.toDataURL(url, { margin: 2, width: 320 })
      .then(setDataUrl)
      .catch(() => setDataUrl(""));
  }, [token]);

  return (
    <main style={{ padding: 24, fontFamily: "Arial", maxWidth: 500 }}>
      <h1 style={{ fontSize: 24, marginBottom: 8 }}>QR public (démo)</h1>
      <p style={{ marginTop: 0, color: "#666" }}>
        Token : <strong>{token}</strong>
      </p>

      {dataUrl ? (
        <img
          src={dataUrl}
          alt="QR public"
          style={{ marginTop: 16, border: "1px solid #ddd", borderRadius: 12 }}
        />
      ) : (
        <p style={{ marginTop: 16 }}>Erreur génération QR…</p>
      )}

      <p style={{ marginTop: 16 }}>
        Scanne ce QR → ajoute la carte → retour wallet.
      </p>

      <p style={{ marginTop: 8, color: "#666" }}>
        URL : <br />
        <code>{buildUrl(token)}</code>
      </p>

      <hr style={{ margin: "20px 0" }} />

      <p style={{ color: "#666" }}>
        Exemples :<br />
        <code>/qr-public?token=DEMO</code><br />
        <code>/qr-public?token=CREPE</code>
      </p>
    </main>
  );
}
