"use client";

import { use, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { QRCodeCanvas } from "qrcode.react";
import { getCards, consumeReward, type WalletCard } from "@/app/lib/walletStorage";

export default function WalletCardQrPage({
  params,
}: {
  params: Promise<{ cardId: string }>;
}) {
  const { cardId: rawCardId } = use(params);

  // Décodage safe pour routes encodées
  const cardId = decodeURIComponent(rawCardId);

  const router = useRouter();
  const [card, setCard] = useState<WalletCard | null>(null);

  useEffect(() => {
    const cards = getCards();
    const found = cards.find((c) => c.id === cardId) ?? null;
    setCard(found);
  }, [cardId]);

  if (!card) {
    return (
      <main style={{ padding: 16, fontFamily: "Arial" }}>
        <p>Carte introuvable.</p>
        <pre style={{ marginTop: 12, fontSize: 12, opacity: 0.7 }}>
          cardId recherché : {cardId}
        </pre>
      </main>
    );
  }

  // QR commerçant (simple, sans validation)
  const qrValue = JSON.stringify({
    storeId: card.merchantId,
    cardId: card.id,
    mode: card.rewardAvailable ? "reward" : "earn",
  });

  function handleConsume() {
    consumeReward(card.id);
    router.push("/wallet");
  }

  return (
    <main
      style={{
        padding: 16,
        maxWidth: 720,
        margin: "0 auto",
        fontFamily: "Arial",
      }}
    >
      <button
        onClick={() => router.push("/wallet")}
        style={{
          padding: 10,
          borderRadius: 10,
          marginBottom: 16,
          cursor: "pointer",
        }}
      >
        ← Retour
      </button>

      <h1 style={{ fontSize: 24, fontWeight: 800, marginBottom: 6 }}>
        {card.merchantName}
      </h1>

      {card.rewardAvailable ? (
        <div style={{ marginBottom: 12, fontWeight: 800 }}>
          🎉 Récompense disponible ({card.goal}/{card.goal})
        </div>
      ) : (
        <div style={{ marginBottom: 12, opacity: 0.8 }}>
          Carte en cours ({card.stamps}/{card.goal})
        </div>
      )}

      <div
        style={{
          display: "grid",
          placeItems: "center",
          padding: 16,
          borderRadius: 12,
          background: "rgba(0,0,0,0.05)",
          marginBottom: 16,
        }}
      >
        <QRCodeCanvas value={qrValue} size={260} includeMargin />
      </div>

      {card.rewardAvailable && (
        <button
          onClick={handleConsume}
          style={{
            padding: "12px 16px",
            fontWeight: 800,
            borderRadius: 12,
            cursor: "pointer",
            background: "#22c55e",
            color: "#000",
            width: "100%",
          }}
        >
          ✅ Récompense utilisée
        </button>
      )}
    </main>
  );
}
