"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  addTestCard,
  clearCards,
  getCards,
  type WalletCard,
} from "../lib/walletStorage";

export default function WalletPage() {
  const [cards, setCards] = useState<WalletCard[]>([]);
  const router = useRouter();

  const refreshCards = useCallback(() => {
    setCards(getCards());
  }, []);

  useEffect(() => {
    // 1) initial
    refreshCards();

    // 2) refresh quand une écriture wallet arrive (scan/addStamps/etc.)
    const onWalletUpdated = () => refreshCards();
    window.addEventListener("wallet_updated", onWalletUpdated);

    // 3) refresh quand l’app revient au premier plan (PWA/mobile)
    const onFocus = () => refreshCards();
    const onVisibility = () => {
      if (document.visibilityState === "visible") refreshCards();
    };

    window.addEventListener("focus", onFocus);
    document.addEventListener("visibilitychange", onVisibility);

    return () => {
      window.removeEventListener("wallet_updated", onWalletUpdated);
      window.removeEventListener("focus", onFocus);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [refreshCards]);

  return (
    <main style={{ padding: 24, fontFamily: "Arial", maxWidth: 720, margin: "0 auto" }}>
      <h1 style={{ fontSize: 28, marginBottom: 12 }}>My fidelity wallet</h1>

      <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginBottom: 16 }}>
        <button
          onClick={() => {
            addTestCard();
            // pas obligatoire (event le fera), mais ça rend instant si jamais
            refreshCards();
          }}
        >
          + Add test card
        </button>

        <button
          onClick={() => {
            clearCards();
            refreshCards();
          }}
        >
          Clear
        </button>

        <button onClick={() => router.push("/wallet/scan")}>Scan store QR</button>
      </div>

      {cards.length === 0 ? (
        <p style={{ opacity: 0.7 }}>No cards yet.</p>
      ) : (
        <div style={{ display: "grid", gap: 12 }}>
          {cards.map((c) => (
            <div
              key={c.id}
              style={{
                border: "1px solid #ddd",
                borderRadius: 12,
                padding: 12,
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", gap: 12 }}>
                <div>
                  <div style={{ fontWeight: 700 }}>Store: {c.storeId}</div>
                  <div style={{ opacity: 0.8, fontSize: 13 }}>Customer: {c.customerId}</div>
                </div>

                <div style={{ textAlign: "right" }}>
                  <div style={{ fontSize: 20, fontWeight: 800 }}>
                    {c.stamps}/{c.target}
                  </div>
                  <div style={{ fontSize: 13, opacity: 0.8 }}>
                    Reward: {c.rewardReady ? "READY" : "—"}
                  </div>
                </div>
              </div>

              <div style={{ marginTop: 10, display: "flex", gap: 10, flexWrap: "wrap" }}>
                <button onClick={() => router.push(`/wallet/card?id=${encodeURIComponent(c.id)}`)}>
                  Open
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </main>
  );
}
