"use client";

import { useMemo } from "react";
import { useParams, useRouter } from "next/navigation";
import { QRCodeCanvas } from "qrcode.react";
import { getCards, getOrCreateCustomerId } from "../../lib/walletStorage";

export default function WalletStorePage() {
  const params = useParams<{ storeId: string }>();
  const router = useRouter();

  const merchantId = decodeURIComponent(params.storeId || "");

  const { card, customerId, payload } = useMemo(() => {
    const cards = getCards();
    const found = cards.find((c) => c.id === merchantId) ?? null;
    const cid = getOrCreateCustomerId();

    const p = found ? JSON.stringify({ storeId: found.id, customerId: cid }) : "";
    return { card: found, customerId: cid, payload: p };
  }, [merchantId]);

  if (!card) {
    return (
      <main style={{ padding: 16, fontFamily: "Arial" }}>
        <button onClick={() => router.push("/wallet")} style={{ padding: 10, borderRadius: 10 }}>
          ← Retour
        </button>
        <p style={{ marginTop: 16 }}>Carte introuvable.</p>
      </main>
    );
  }

  return (
    <main style={{ padding: 16, maxWidth: 720, margin: "0 auto", fontFamily: "Arial" }}>
      <button onClick={() => router.push("/wallet")} style={{ padding: 10, borderRadius: 10, marginBottom: 16 }}>
        ← Retour
      </button>

      <h1 style={{ fontSize: 24, fontWeight: 800, marginBottom: 6 }}>{card.merchantName}</h1>
      <div style={{ opacity: 0.8, marginBottom: 16 }}>
        {card.stamps}/{card.goal} tampons
      </div>

      <div
        style={{
          display: "grid",
          gap: 12,
          justifyItems: "start",
          border: "1px solid rgba(0,0,0,0.15)",
          borderRadius: 16,
          padding: 16,
        }}
      >
        <div style={{ fontWeight: 700 }}>QR Client (à scanner côté commerçant)</div>

        <div style={{ background: "#fff", padding: 12, borderRadius: 12 }}>
          <QRCodeCanvas value={payload} size={240} />
        </div>

        <details>
          <summary style={{ cursor: "pointer" }}>Voir le JSON</summary>
          <pre style={{ marginTop: 8, whiteSpace: "pre-wrap" }}>{payload}</pre>
        </details>

        <div style={{ fontSize: 12, opacity: 0.7 }}>
          customerId (stable sur ce téléphone) : {customerId}
        </div>
      </div>
    </main>
  );
}
