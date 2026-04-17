"use client";

import { useEffect, useMemo, useState } from "react";
import QRCode from "qrcode";

function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).substring(2, 10);
}

export default function QrGeneratorPage() {
  const [merchantId, setMerchantId] = useState<string>("DEMO123");
  const [merchantName, setMerchantName] = useState<string>("Demo Restaurant");
  const [goal, setGoal] = useState<number>(10);

  const [baseUrl, setBaseUrl] = useState<string>(""); // ✅ vide au départ (SSR safe)
  const [qrDataUrl, setQrDataUrl] = useState<string>("");
  const [err, setErr] = useState<string>("");

  // ✅ On récupère l’URL seulement côté navigateur (évite l’hydration error)
  useEffect(() => {
    setBaseUrl(window.location.origin);
  }, []);

  const qrLink = useMemo(() => {
    if (!baseUrl) return ""; // pas prêt tant qu’on n’a pas l’origin
    const safeName = encodeURIComponent(merchantName.trim() || "Commerce");
    const safeGoal = Number.isFinite(goal) && goal > 0 ? goal : 10;
    const safeId = (merchantId.trim() || "DEMO123").replace(/\s+/g, "");
    return `${baseUrl}/r/${safeId}?name=${safeName}&goal=${safeGoal}`;
  }, [baseUrl, merchantId, merchantName, goal]);

  useEffect(() => {
    let cancelled = false;

    async function makeQr() {
      setErr("");
      if (!qrLink) {
        setQrDataUrl("");
        return;
      }
      try {
        const dataUrl = await QRCode.toDataURL(qrLink, {
          margin: 2,
          scale: 8,
          errorCorrectionLevel: "M",
        });
        if (!cancelled) setQrDataUrl(dataUrl);
      } catch (e: any) {
        if (!cancelled) setErr(e?.message ?? "Erreur génération QR");
      }
    }

    makeQr();
    return () => {
      cancelled = true;
    };
  }, [qrLink]);

  function resetMerchantId() {
    setMerchantId(`M_${generateId()}`);
  }

  async function copyToClipboard(text: string) {
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      const ta = document.createElement("textarea");
      ta.value = text;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand("copy");
      document.body.removeChild(ta);
    }
  }

  return (
    <main style={{ padding: 16, maxWidth: 780, margin: "0 auto" }}>
      <h1 style={{ fontSize: 28, fontWeight: 700, marginBottom: 12 }}>
        Générer un QR commerce
      </h1>

      <p style={{ opacity: 0.85, marginBottom: 16 }}>
        Lien généré automatiquement depuis l’adresse actuelle :{" "}
        <code>{baseUrl || "…"}</code>
      </p>

      <div
        style={{
          display: "grid",
          gap: 12,
          padding: 16,
          borderRadius: 12,
          border: "1px solid rgba(255,255,255,0.12)",
        }}
      >
        <div style={{ display: "grid", gridTemplateColumns: "1fr 160px", gap: 12 }}>
          <label style={{ display: "grid", gap: 6 }}>
            <span style={{ fontWeight: 600 }}>merchantId</span>
            <input
              value={merchantId}
              onChange={(e) => setMerchantId(e.target.value)}
              placeholder="GETYOURCREPE"
              style={{
                padding: 10,
                borderRadius: 10,
                border: "1px solid rgba(255,255,255,0.18)",
                background: "rgba(255,255,255,0.06)",
                color: "inherit",
              }}
            />
            <small style={{ opacity: 0.8 }}>
              1 commerce = 1 id stable (ça évite les doublons).
            </small>
          </label>

          <button
            onClick={resetMerchantId}
            style={{
              marginTop: 28,
              padding: "10px 12px",
              borderRadius: 10,
              border: "1px solid rgba(255,255,255,0.18)",
              background: "rgba(255,255,255,0.10)",
              color: "inherit",
              cursor: "pointer",
            }}
          >
            Générer ID
          </button>
        </div>

        <label style={{ display: "grid", gap: 6 }}>
          <span style={{ fontWeight: 600 }}>Nom du commerce</span>
          <input
            value={merchantName}
            onChange={(e) => setMerchantName(e.target.value)}
            placeholder="Get Your Crepe"
            style={{
              padding: 10,
              borderRadius: 10,
              border: "1px solid rgba(255,255,255,0.18)",
              background: "rgba(255,255,255,0.06)",
              color: "inherit",
            }}
          />
        </label>

        <label style={{ display: "grid", gap: 6 }}>
          <span style={{ fontWeight: 600 }}>Objectif (goal)</span>
          <input
            type="number"
            value={goal}
            onChange={(e) => setGoal(parseInt(e.target.value || "10", 10))}
            min={1}
            style={{
              padding: 10,
              borderRadius: 10,
              border: "1px solid rgba(255,255,255,0.18)",
              background: "rgba(255,255,255,0.06)",
              color: "inherit",
              width: 140,
            }}
          />
        </label>

        <div style={{ display: "grid", gap: 8 }}>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <button
              disabled={!qrLink}
              onClick={() => copyToClipboard(qrLink)}
              style={{
                padding: "10px 12px",
                borderRadius: 10,
                border: "1px solid rgba(255,255,255,0.18)",
                background: "rgba(255,255,255,0.10)",
                color: "inherit",
                cursor: qrLink ? "pointer" : "not-allowed",
                opacity: qrLink ? 1 : 0.6,
              }}
            >
              Copier le lien
            </button>

            <a
              href={qrLink || "#"}
              onClick={(e) => {
                if (!qrLink) e.preventDefault();
              }}
              target="_blank"
              rel="noreferrer"
              style={{
                padding: "10px 12px",
                borderRadius: 10,
                border: "1px solid rgba(255,255,255,0.10)",
                background: "transparent",
                color: "inherit",
                textDecoration: "none",
                opacity: qrLink ? 1 : 0.6,
                pointerEvents: qrLink ? "auto" : "none",
              }}
            >
              Ouvrir le lien
            </a>
          </div>

          <code style={{ opacity: 0.9, wordBreak: "break-all" }}>
            {qrLink || "Génération du lien…"}
          </code>

          {err && (
            <div
              style={{
                padding: 12,
                borderRadius: 10,
                border: "1px solid rgba(255,0,0,0.35)",
                background: "rgba(255,0,0,0.08)",
              }}
            >
              Erreur QR : {err}
            </div>
          )}
        </div>
      </div>

      <h2 style={{ marginTop: 18, fontSize: 20, fontWeight: 700 }}>QR Code</h2>

      <div
        style={{
          marginTop: 10,
          padding: 16,
          borderRadius: 12,
          border: "1px solid rgba(255,255,255,0.12)",
          display: "grid",
          placeItems: "center",
          gap: 10,
        }}
      >
        {qrDataUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={qrDataUrl}
            alt="QR commerce"
            style={{
              width: 280,
              height: 280,
              background: "white",
              padding: 10,
              borderRadius: 12,
            }}
          />
        ) : (
          <p>Génération…</p>
        )}

        <small style={{ opacity: 0.8 }}>
          Affiche ce QR sur l’écran du PC et scanne avec le téléphone.
        </small>
      </div>
    </main>
  );
}
