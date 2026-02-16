"use client";

import { useEffect, useMemo, useState } from "react";
import { QRCodeSVG } from "qrcode.react";

function slugify(input: string) {
  return input
    .trim()
    .toUpperCase()
    .replace(/\s+/g, "_")
    .replace(/[^A-Z0-9_]/g, "");
}

export default function MerchantQrPage() {
  const [merchantId, setMerchantId] = useState("DEMO123");
  const [merchantName, setMerchantName] = useState("Demo Restaurant");
  const [goal, setGoal] = useState(10);

  // ✅ important: origin uniquement côté client pour éviter l'hydration mismatch
  const [origin, setOrigin] = useState<string>("");

  useEffect(() => {
    setOrigin(window.location.origin);
  }, []);

  const url = useMemo(() => {
    const id = slugify(merchantId || "DEMO123");
    const name = encodeURIComponent(merchantName || "Commerce");
    const g = Number.isFinite(goal) && goal > 0 ? goal : 10;

    // Tant que origin n'est pas prêt, on renvoie une URL relative stable
    if (!origin) return `/r/${id}?name=${name}&goal=${g}`;

    return `${origin}/r/${id}?name=${name}&goal=${g}`;
  }, [merchantId, merchantName, goal, origin]);

  async function copy() {
    try {
      await navigator.clipboard.writeText(url);
      alert("Lien copié ✅");
    } catch {
      alert("Impossible de copier automatiquement. Copie manuelle : " + url);
    }
  }

  return (
    <main style={{ padding: 16, maxWidth: 520 }}>
      <h1 style={{ fontSize: 28, marginBottom: 16 }}>QR code restaurateur</h1>

      <div style={{ display: "grid", gap: 10, marginBottom: 16 }}>
        <label style={{ display: "grid", gap: 6 }}>
          <span>Merchant ID (unique)</span>
          <input
            value={merchantId}
            onChange={(e) => setMerchantId(e.target.value)}
            placeholder="GETYOURCREPE"
            style={{
              padding: 10,
              borderRadius: 8,
              border: "1px solid #333",
              background: "transparent",
              color: "inherit",
            }}
          />
          <small style={{ opacity: 0.75 }}>
            Conseil : lettres/chiffres/underscore. Exemple: GETYOURCREPE
          </small>
        </label>

        <label style={{ display: "grid", gap: 6 }}>
          <span>Nom affiché sur la carte</span>
          <input
            value={merchantName}
            onChange={(e) => setMerchantName(e.target.value)}
            placeholder="Get Your Crepe"
            style={{
              padding: 10,
              borderRadius: 8,
              border: "1px solid #333",
              background: "transparent",
              color: "inherit",
            }}
          />
        </label>

        <label style={{ display: "grid", gap: 6 }}>
          <span>Objectif (tampons)</span>
          <input
            type="number"
            value={goal}
            onChange={(e) => setGoal(parseInt(e.target.value || "10", 10))}
            min={1}
            style={{
              padding: 10,
              borderRadius: 8,
              border: "1px solid #333",
              background: "transparent",
              color: "inherit",
              width: 140,
            }}
          />
        </label>
      </div>

      <div
        style={{
          display: "grid",
          placeItems: "center",
          gap: 12,
          padding: 16,
          border: "1px solid #333",
          borderRadius: 12,
          marginBottom: 12,
        }}
      >
        {/* ✅ On évite de rendre le QR "absolu" tant que origin n'est pas prêt */}
        {!origin ? (
          <div style={{ opacity: 0.8 }}>Chargement du QR…</div>
        ) : (
          <QRCodeSVG value={url} size={260} />
        )}

        <div style={{ fontSize: 12, opacity: 0.8, wordBreak: "break-all" }}>
          {url}
        </div>
      </div>

      <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
        <button
          onClick={copy}
          style={{
            padding: "10px 12px",
            borderRadius: 10,
            border: "1px solid #333",
            background: "transparent",
            color: "inherit",
          }}
        >
          Copier le lien
        </button>

        <a
          href={url}
          style={{
            padding: "10px 12px",
            borderRadius: 10,
            border: "1px solid #333",
            textDecoration: "none",
            color: "inherit",
          }}
        >
          Ouvrir (test)
        </a>
      </div>

      <p style={{ marginTop: 14, opacity: 0.8 }}>
        Note : en local, le QR contiendra ton IP/port (ex: 192.168.x.x:3000).
        En production, ce sera ton domaine.
      </p>
    </main>
  );
}
