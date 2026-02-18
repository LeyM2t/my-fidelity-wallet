"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";

type FirestoreCard = {
  id: string;
  storeId: string;
  ownerId: string;
  stamps: number;
  goal: number;
  status: "active" | "reward";
  rewardAvailable?: boolean;
};

function getOwnerId(): string {
  const key = "fw_ownerId";
  return localStorage.getItem(key) || "";
}

export default function CardPage() {
  const router = useRouter();
  const params = useParams<{ cardId: string }>();
  const cardId = String(params?.cardId ?? "");

  const [card, setCard] = useState<FirestoreCard | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    async function fetchCard() {
      const ownerId = getOwnerId();
      if (!ownerId) return;

      try {
        const res = await fetch(
          `/api/cards?ownerId=${encodeURIComponent(ownerId)}`,
          { cache: "no-store" }
        );

        const data = await res.json();
        const list = Array.isArray(data) ? data : data?.cards || [];

        const found = list.find((c: any) => c.id === cardId);

        if (!found) {
          setError("Card not found.");
        } else {
          setCard(found);
        }
      } catch (e: any) {
        setError("Error loading card.");
      } finally {
        setLoading(false);
      }
    }

    fetchCard();
  }, [cardId]);

  async function deleteCard() {
    if (!card) return;

    if (!confirm("Delete this card?")) return;

    const ownerId = getOwnerId();

    const res = await fetch("/api/cards/delete", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ cardId: card.id, ownerId }),
    });

    if (res.ok) {
      router.replace("/wallet");
    } else {
      alert("Delete failed.");
    }
  }

  if (loading) return <main style={{ padding: 24 }}>Loading...</main>;
  if (error) return <main style={{ padding: 24 }}>{error}</main>;
  if (!card) return null;

  return (
    <main style={{ padding: 24, maxWidth: 720, margin: "0 auto" }}>
      <button onClick={() => router.push("/wallet")}>← Back</button>

      <h1 style={{ marginTop: 16 }}>Store: {card.storeId}</h1>

      <div style={{ fontSize: 22, marginTop: 12 }}>
        {card.stamps}/{card.goal}
      </div>

      <div style={{ marginTop: 8 }}>
        Status: {card.status}
      </div>

      <div style={{ marginTop: 20 }}>
        <button onClick={deleteCard} style={{ background: "red", color: "white", padding: 8 }}>
          Delete card
        </button>
      </div>
    </main>
  );
}
