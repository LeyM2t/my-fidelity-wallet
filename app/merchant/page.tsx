"use client";

import { useEffect, useMemo, useState } from "react";
import { QRCodeCanvas } from "qrcode.react";

const STORE_ID = "get-your-crepe";
const STORE_NAME = "Get Your Crêpe";

export default function MerchantPage() {
  const [token, setToken] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string>("");

  async function generateToken() {
    try {
      setErr("");
      setLoading(true);

      const res = await fetch("/api/claims/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ storeId: STORE_ID }),
      });

      const data = await res.json();

      if (!res.ok) {
        setErr(data?.error || "Failed to create token");
        return;
      }

      setToken(data.token);
    } catch (e: any) {
      setErr(e?.message || "Network error");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    generateToken();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const claimUrl = useMemo(() => {
    if (!token) return "";
    if (typeof window === "undefined") return "";
    return `${window.location.origin}/add?token=${encodeURIComponent(token)}`;
  }, [token]);

  return (
    <main style={{ padding: 24, fontFamily: "Arial", maxWidth: 820, margin: "0 auto" }}>
      <h1 style={{ fontSize: 28, marginBottom: 6 }}>Mode commerçant</h1>
      <div style={{ opacity: 0.8, marginBottom: 16 }}>
        <b>{STORE_NAME}</b> — le client scanne ce QR pour ajouter la carte.
      </div>

      <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginBottom: 16 }}>
        <button onClick={generateToken} disabled={loading}>
          {loading ? "Génération..." : "Régénérer un QR"}
        </button>

        <a href="/scan" style={{ alignSelf: "center" }}>
          Aller au scan commerçant (/scan)
        </a>
      </div>

      {err ? <div style={{ marginBottom: 12, color: "crimson" }}>Erreur : {err}</div> : null}

      <div style={{ border: "1px solid #ddd", borderRadius: 14, padding: 16 }}>
        <div style={{ fontWeight: 800, marginBottom: 10 }}>QR à faire scanner au client</div>

        <div style={{ display: "grid", placeItems: "center", gap: 12 }}>
          {claimUrl ? (
            <QRCodeCanvas value={claimUrl} size={320} includeMargin />
          ) : (
            <div style={{ padding: 16, opacity: 0.7 }}>Token en cours…</div>
          )}

          {claimUrl ? (
            <details style={{ width: "100%" }}>
              <summary style={{ cursor: "pointer", fontWeight: 700 }}>Afficher l’URL</summary>
              <pre
                style={{
                  whiteSpace: "pre-wrap",
                  marginTop: 10,
                  padding: 12,
                  background: "#f6f6f6",
                  borderRadius: 10,
                }}
              >
{claimUrl}
              </pre>
            </details>
          ) : null}
        </div>
      </div>
    </main>
  );
}
