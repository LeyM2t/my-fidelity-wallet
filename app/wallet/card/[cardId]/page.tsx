"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { QRCodeCanvas } from "qrcode.react";

type FirestoreCard = {
  id: string;
  storeId: string;
  ownerId: string;
  stamps: number;
  goal: number;
  status: "active" | "reward";
  rewardAvailable?: boolean;
};

type CardTemplate = {
  bgColor?: string;
  textColor?: string;
  fontFamily?: string; // ex: "Inter", "Oswald", etc.
  logoUrl?: string;
  bgImageUrl?: string;
  // tu peux ajouter d'autres champs si tu en as (accentColor, etc.)
};

function getOwnerId(): string {
  const key = "fw_ownerId";
  try {
    return localStorage.getItem(key) || "";
  } catch {
    return "";
  }
}

export default function CardPage() {
  const router = useRouter();
  const params = useParams<{ cardId: string }>();
  const cardId = String(params?.cardId ?? "");

  const [card, setCard] = useState<FirestoreCard | null>(null);
  const [template, setTemplate] = useState<CardTemplate | null>(null);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    async function fetchCardAndTemplate() {
      const ownerId = getOwnerId();
      if (!ownerId) {
        setError("Missing ownerId (wallet not initialized).");
        setLoading(false);
        return;
      }

      try {
        // 1) Charger la carte (via /api/cards)
        const res = await fetch(
          `/api/cards?ownerId=${encodeURIComponent(ownerId)}`,
          { cache: "no-store" }
        );
        const data = await res.json();
        const list = Array.isArray(data) ? data : data?.cards || [];

        const found = list.find((c: any) => c.id === cardId);

        if (!found) {
          setError("Card not found.");
          setLoading(false);
          return;
        }

        setCard(found);

        // 2) Charger le template du store (via /api/stores/[storeId])
        //    On essaie plusieurs formes de réponse pour être robuste.
        const storeRes = await fetch(`/api/stores/${encodeURIComponent(found.storeId)}`, {
          cache: "no-store",
        });

        if (storeRes.ok) {
          const storeData = await storeRes.json();
          const tpl =
            storeData?.cardTemplate ||
            storeData?.store?.cardTemplate ||
            storeData?.data?.cardTemplate ||
            null;

          setTemplate(tpl);
        } else {
          // Pas bloquant : on affiche la carte sans template
          setTemplate(null);
        }

        setLoading(false);
      } catch (e: any) {
        setError("Error loading card.");
        setLoading(false);
      }
    }

    fetchCardAndTemplate();
  }, [cardId]);

  const qrPayload = useMemo(() => {
    if (!card) return "";
    // payload minimal demandé : storeId, ownerId, cardId
    return JSON.stringify({
      storeId: card.storeId,
      ownerId: card.ownerId,
      cardId: card.id,
    });
  }, [card]);

  const applied = useMemo(() => {
    const bgColor = template?.bgColor || "#111827"; // fallback sombre
    const textColor = template?.textColor || "#ffffff";
    const fontFamily = template?.fontFamily || "system-ui, -apple-system, Segoe UI, Roboto, Arial";
    const bgImageUrl = template?.bgImageUrl || "";
    const logoUrl = template?.logoUrl || "";

    return { bgColor, textColor, fontFamily, bgImageUrl, logoUrl };
  }, [template]);

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

  async function copyQrPayload() {
    if (!qrPayload) return;
    try {
      await navigator.clipboard.writeText(qrPayload);
      alert("QR payload copied.");
    } catch {
      alert("Copy failed.");
    }
  }

  if (loading) return <main style={{ padding: 24 }}>Loading...</main>;
  if (error) return <main style={{ padding: 24 }}>{error}</main>;
  if (!card) return null;

  return (
    <main style={{ padding: 24, maxWidth: 820, margin: "0 auto" }}>
      <button onClick={() => router.push("/wallet")}>← Back</button>

      <h1 style={{ marginTop: 16 }}>Your loyalty card</h1>

      {/* Carte stylée par template */}
      <section
        style={{
          marginTop: 16,
          borderRadius: 16,
          padding: 18,
          color: applied.textColor,
          fontFamily: applied.fontFamily,
          backgroundColor: applied.bgColor,
          backgroundImage: applied.bgImageUrl ? `url(${applied.bgImageUrl})` : undefined,
          backgroundSize: "cover",
          backgroundPosition: "center",
          position: "relative",
          overflow: "hidden",
          boxShadow: "0 10px 30px rgba(0,0,0,0.18)",
        }}
      >
        {/* léger voile si bgImage pour lisibilité */}
        {applied.bgImageUrl ? (
          <div
            style={{
              position: "absolute",
              inset: 0,
              background: "rgba(0,0,0,0.25)",
              pointerEvents: "none",
            }}
          />
        ) : null}

        <div style={{ position: "relative", display: "flex", gap: 16, alignItems: "center" }}>
          {/* Logo */}
          {applied.logoUrl ? (
            <img
              src={applied.logoUrl}
              alt="Store logo"
              style={{
                width: 56,
                height: 56,
                objectFit: "contain",
                borderRadius: 12,
                background: "rgba(255,255,255,0.14)",
                padding: 6,
              }}
            />
          ) : null}

          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 14, opacity: 0.9 }}>Store</div>
            <div style={{ fontSize: 20, fontWeight: 700, lineHeight: 1.2 }}>
              {card.storeId}
            </div>
            <div style={{ marginTop: 10, fontSize: 28, fontWeight: 800 }}>
              {card.stamps}/{card.goal}
            </div>
            <div style={{ marginTop: 6, fontSize: 14, opacity: 0.9 }}>
              Status: {card.status}
              {card.rewardAvailable ? " • Reward available" : ""}
            </div>
          </div>
        </div>

        {/* QR client (pour scan commerçant) */}
        <div
          style={{
            position: "relative",
            marginTop: 18,
            display: "flex",
            gap: 16,
            alignItems: "flex-start",
            flexWrap: "wrap",
          }}
        >
          <div
            style={{
              background: "rgba(255,255,255,0.92)",
              padding: 10,
              borderRadius: 12,
            }}
          >
            <QRCodeCanvas value={qrPayload} size={160} includeMargin />
          </div>

          <div style={{ flex: 1, minWidth: 240 }}>
            <div style={{ fontSize: 14, fontWeight: 700 }}>QR client (à montrer au commerçant)</div>
            <div style={{ marginTop: 8, fontSize: 12, opacity: 0.9, wordBreak: "break-word" }}>
              {qrPayload}
            </div>

            <div style={{ marginTop: 10, display: "flex", gap: 10, flexWrap: "wrap" }}>
              <button onClick={copyQrPayload} style={{ padding: "8px 10px" }}>
                Copy payload
              </button>

              <button
                onClick={deleteCard}
                style={{
                  background: "rgba(255,0,0,0.85)",
                  color: "white",
                  padding: "8px 10px",
                  borderRadius: 8,
                }}
              >
                Delete card
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* Debug léger */}
      <details style={{ marginTop: 16 }}>
        <summary>Debug</summary>
        <pre style={{ whiteSpace: "pre-wrap", marginTop: 10 }}>
{JSON.stringify({ card, template }, null, 2)}
        </pre>
      </details>
    </main>
  );
}