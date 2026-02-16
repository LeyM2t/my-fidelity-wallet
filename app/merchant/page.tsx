"use client";

import { useEffect, useMemo, useState } from "react";
import { QRCodeCanvas } from "qrcode.react";

const DEFAULT_STORE_ID = "get-your-crepe"; // simple, lisible
const DEFAULT_STORE_NAME = "Get Your Crêpe";

type StoreQrPayload = {
  // IMPORTANT : on garde un payload MINIMAL pour rester compatible avec ta V1
  // (si ton /wallet/scan attend juste storeId, ça passera).
  storeId: string;

  // champs bonus (si ton parse est permissif, ça ne gêne pas)
  storeName?: string;
};

export default function MerchantPage() {
  const [storeId, setStoreId] = useState(DEFAULT_STORE_ID);
  const [storeName, setStoreName] = useState(DEFAULT_STORE_NAME);

  // on persiste sur l’appareil commerçant, pratique si tu changes
  useEffect(() => {
    const savedId = typeof window !== "undefined" ? localStorage.getItem("merchant_storeId") : null;
    const savedName = typeof window !== "undefined" ? localStorage.getItem("merchant_storeName") : null;
    if (savedId) setStoreId(savedId);
    if (savedName) setStoreName(savedName);
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    localStorage.setItem("merchant_storeId", storeId);
    localStorage.setItem("merchant_storeName", storeName);
  }, [storeId, storeName]);

  const qrValue = useMemo(() => {
    const payload: StoreQrPayload = {
      storeId: (storeId || "").trim(),
      storeName: (storeName || "").trim() || undefined,
    };
    return JSON.stringify(payload);
  }, [storeId, storeName]);

  const isValid = (storeId || "").trim().length > 0;

  return (
    <main style={{ padding: 24, fontFamily: "Arial", maxWidth: 760, margin: "0 auto" }}>
      <h1 style={{ fontSize: 28, marginBottom: 8 }}>Mode commerçant</h1>
      <p style={{ opacity: 0.8, marginTop: 0 }}>
        Ouvre cette page sur l’ordi du stand. Le client scanne avec{" "}
        <b>/wallet/scan</b> pour ajouter la carte.
      </p>

      <div style={{ display: "grid", gap: 10, marginTop: 16, marginBottom: 16 }}>
        <label style={{ display: "grid", gap: 6 }}>
          <span style={{ fontWeight: 700 }}>Store ID (technique)</span>
          <input
            value={storeId}
            onChange={(e) => setStoreId(e.target.value)}
            placeholder="ex: get-your-crepe"
            style={{ padding: 10, borderRadius: 10, border: "1px solid #ccc" }}
          />
        </label>

        <label style={{ display: "grid", gap: 6 }}>
          <span style={{ fontWeight: 700 }}>Nom affiché (optionnel)</span>
          <input
            value={storeName}
            onChange={(e) => setStoreName(e.target.value)}
            placeholder="ex: Get Your Crêpe"
            style={{ padding: 10, borderRadius: 10, border: "1px solid #ccc" }}
          />
        </label>
      </div>

      <div style={{ border: "1px solid #ddd", borderRadius: 14, padding: 16 }}>
        <div style={{ fontWeight: 800, marginBottom: 10 }}>QR “Store” à faire scanner</div>

        <div style={{ display: "grid", placeItems: "center", gap: 12 }}>
          {isValid ? (
            <QRCodeCanvas value={qrValue} size={300} includeMargin />
          ) : (
            <div style={{ padding: 16, opacity: 0.7 }}>Renseigne un Store ID.</div>
          )}

          <div style={{ fontSize: 12, opacity: 0.7, textAlign: "center", maxWidth: 520 }}>
            Astuce : garde le Store ID stable (ex: <b>get-your-crepe</b>), comme ça les cartes clients
            se regroupent bien.
          </div>

          <details style={{ width: "100%" }}>
            <summary style={{ cursor: "pointer", fontWeight: 700 }}>Voir le payload</summary>
            <pre style={{ whiteSpace: "pre-wrap", marginTop: 10, padding: 12, background: "#f6f6f6", borderRadius: 10 }}>
{qrValue}
            </pre>
          </details>
        </div>
      </div>

      <div style={{ marginTop: 16, display: "grid", gap: 8 }}>
        <div style={{ fontWeight: 700 }}>Liens test (prod)</div>
        <div style={{ fontFamily: "monospace" }}>• Commerçant : /merchant</div>
        <div style={{ fontFamily: "monospace" }}>• Client scan : /wallet/scan</div>
        <div style={{ fontFamily: "monospace" }}>• Wallet : /wallet</div>
      </div>
    </main>
  );
}
