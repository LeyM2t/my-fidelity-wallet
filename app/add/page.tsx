"use client";

import { useEffect, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { getCards, saveCards, type WalletCard } from "../lib/walletStorage";

type PublicCardInfo = {
  merchantName: string;
  goal: number;
};

// Simulation: plus tard ça viendra de Supabase via API.
// Pour l’instant : on mappe quelques tokens de démo.
function lookupToken(token: string): PublicCardInfo | null {
  const t = token.trim().toUpperCase();

  const map: Record<string, PublicCardInfo> = {
    DEMO: { merchantName: "Demo Restaurant", goal: 10 },
    CAFE: { merchantName: "Cafe Bonjour", goal: 8 },
    CREPE: { merchantName: "Get Your Crêpe", goal: 10 },
  };

  return map[t] ?? null;
}

export default function AddPage() {
  const params = useSearchParams();
  const router = useRouter();
  const [message, setMessage] = useState("Ajout en cours...");

  useEffect(() => {
    const token = params.get("token");

    if (!token) {
      setMessage("Token manquant. (ex: /add?token=DEMO)");
      return;
    }

    const info = lookupToken(token);
    if (!info) {
      setMessage("Token inconnu. Essaie: DEMO, CAFE, CREPE");
      return;
    }

    // On évite les doublons: une carte par merchantName pour la démo.
    const cards = getCards();
    const exists = cards.some(
      (c) => c.merchantName.toLowerCase() === info.merchantName.toLowerCase()
    );

    if (exists) {
      setMessage("Carte déjà présente. Retour au wallet...");
      setTimeout(() => router.replace("/wallet"), 700);
      return;
    }

    const newCard: WalletCard = {
      id: crypto.randomUUID(),
      merchantName: info.merchantName,
      stamps: 0,
      goal: info.goal,
    };

    saveCards([newCard, ...cards]);

    setMessage("Carte ajoutée ✅ Retour au wallet...");
    setTimeout(() => router.replace("/wallet"), 700);
  }, [params, router]);

  return (
    <main style={{ padding: 24, fontFamily: "Arial" }}>
      <h1 style={{ fontSize: 24 }}>Ajout de carte</h1>
      <p style={{ marginTop: 12 }}>{message}</p>

      <p style={{ marginTop: 16, color: "#666" }}>
        Test rapide : /add?token=DEMO
      </p>
    </main>
  );
}
