"use client";

import { useEffect, useMemo, useState } from "react";
import { QRCodeCanvas } from "qrcode.react";
import { getOrCreateCustomerId } from "@/app/lib/customerId";

const STORE_LABELS: Record<string, { name: string; city: string }> = {
  "get-your-crepe": { name: "Get Your Crepe", city: "Wellington" },
  "sushi-kiwi": { name: "Sushi Kiwi", city: "Lower Hutt" },
  "cafe-brewtown": { name: "Cafe Brewtown", city: "Upper Hutt" },
};

export default function QrClient({ storeId }: { storeId: string }) {
  const store = STORE_LABELS[storeId];
  const [customerId, setCustomerId] = useState<string>("");

  useEffect(() => {
    setCustomerId(getOrCreateCustomerId());
  }, []);

  const qrValue = useMemo(() => {
    return JSON.stringify({ storeId, customerId });
  }, [storeId, customerId]);

  return (
    <>
      <h1 style={{ fontSize: 28, fontWeight: 700, marginBottom: 8 }}>Mon QR</h1>

      <div style={{ opacity: 0.75, marginBottom: 16 }}>
        {store ? (
          <>
            <div style={{ fontWeight: 700 }}>{store.name}</div>
            <div>{store.city}</div>
          </>
        ) : (
          <div>Commerce inconnu</div>
        )}
      </div>

      <div
        style={{
          border: "1px solid rgba(255,255,255,0.15)",
          borderRadius: 12,
          padding: 16,
        }}
      >
        <div style={{ marginBottom: 12, opacity: 0.8, fontSize: 14 }}>
          storeId: <b>{storeId}</b>
          <br />
          customerId: <b>{customerId || "..."}</b>
        </div>

        <div
          style={{
            display: "grid",
            placeItems: "center",
            padding: 16,
            borderRadius: 12,
            background: "rgba(255,255,255,0.06)",
          }}
        >
          <QRCodeCanvas value={qrValue} size={260} includeMargin />
        </div>

        <div style={{ marginTop: 12, opacity: 0.6, fontSize: 12 }}>
          payload: {qrValue}
        </div>
      </div>

      <p style={{ opacity: 0.6, marginTop: 16 }}>
        (Étape 3 — QR client, sans backend)
      </p>
    </>
  );
}
