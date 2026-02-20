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
  title?: string;
  bgColor?: string;
  textColor?: string;
  font?: string;
  bgType?: "color" | "gradient";
  gradient?: { from?: string; to?: string; angle?: number };
  bgImageEnabled?: boolean;
  bgImageOpacity?: number;
  bgImageUrl?: string;
  logoUrl?: string;
};

function getOwnerId(): string {
  const key = "fw_ownerId";
  try {
    return localStorage.getItem(key) || "";
  } catch {
    return "";
  }
}

function safeCssUrl(url: string): string {
  const u = (url || "").trim();
  if (!u) return "";
  if (u.startsWith("/")) return u;
  return "";
}

function templateToCss(tpl: CardTemplate | null) {
  const textColor = (tpl?.textColor || "#ffffff").trim();
  const fontFamily = (tpl?.font || "system-ui, -apple-system, Segoe UI, Roboto, Arial").trim();

  const bgColor = (tpl?.bgColor || "#111827").trim();
  const bgType = tpl?.bgType || "color";
  const from = tpl?.gradient?.from || bgColor;
  const to = tpl?.gradient?.to || bgColor;
  const angle = typeof tpl?.gradient?.angle === "number" ? tpl!.gradient!.angle! : 45;

  const baseBackground =
    bgType === "gradient" ? `linear-gradient(${angle}deg, ${from}, ${to})` : bgColor;

  const bgImageEnabled = tpl?.bgImageEnabled !== false;
  const bgImageOpacity =
    typeof tpl?.bgImageOpacity === "number" ? Math.max(0, Math.min(1, tpl.bgImageOpacity)) : 0.7;

  const bgImageUrl = safeCssUrl(tpl?.bgImageUrl || "");
  const title = (tpl?.title || "").trim();

  return { textColor, fontFamily, baseBackground, bgImageEnabled, bgImageOpacity, bgImageUrl, title };
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
        // 1) carte
        const res = await fetch(`/api/cards?ownerId=${encodeURIComponent(ownerId)}`, { cache: "no-store" });
        const data = await res.json();
        const list = Array.isArray(data) ? data : data?.cards || [];
        const found = list.find((c: any) => String(c.id ?? c.cardId ?? "") === cardId);

        if (!found) {
          setError("Card not found.");
          setLoading(false);
          return;
        }

        const normalized: FirestoreCard = {
          id: String(found.id ?? found.cardId ?? ""),
          storeId: String(found.storeId ?? ""),
          ownerId: String(found.ownerId ?? ""),
          stamps: Number(found.stamps ?? 0),
          goal: Number(found.goal ?? 10),
          status: (found.status === "reward" ? "reward" : "active") as "active" | "reward",
          rewardAvailable: Boolean(found.rewardAvailable ?? found.status === "reward"),
        };

        setCard(normalized);

        // 2) template store
        const storeRes = await fetch(`/api/stores/${encodeURIComponent(normalized.storeId)}`, { cache: "no-store" });
        if (storeRes.ok) {
          const storeData = await storeRes.json();
          const tpl =
            storeData?.cardTemplate ||
            storeData?.store?.cardTemplate ||
            storeData?.data?.cardTemplate ||
            null;
          setTemplate(tpl);
        } else {
          setTemplate(null);
        }

        setLoading(false);
      } catch {
        setError("Error loading card.");
        setLoading(false);
      }
    }

    fetchCardAndTemplate();
  }, [cardId]);

  const qrPayload = useMemo(() => {
    if (!card) return "";
    return JSON.stringify({ storeId: card.storeId, ownerId: card.ownerId, cardId: card.id });
  }, [card]);

  const css = useMemo(() => templateToCss(template), [template]);

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

  // QR : on force un rendu sans scroll (max selon viewport)
  const qrSize = 320; // taille “cible”, limitée en CSS

  return (
    <main
      style={{
        minHeight: "100dvh",
        display: "flex",
        flexDirection: "column",
        background: css.baseBackground,
        color: css.textColor,
        fontFamily: css.fontFamily,
        position: "relative",
        overflow: "hidden",
      }}
    >
      {css.bgImageEnabled && css.bgImageUrl ? (
        <img
          src={css.bgImageUrl}
          alt=""
          aria-hidden="true"
          style={{
            position: "absolute",
            inset: 0,
            width: "100%",
            height: "100%",
            objectFit: "cover",
            opacity: css.bgImageOpacity,
            transform: "scale(1.02)",
          }}
        />
      ) : null}

      <div
        aria-hidden="true"
        style={{
          position: "absolute",
          inset: 0,
          background: "rgba(0,0,0,0.18)",
        }}
      />

      {/* Header */}
      <div style={{ position: "relative", padding: 18, display: "flex", alignItems: "center", gap: 12 }}>
        <button onClick={() => router.push("/wallet")} style={{ padding: "10px 12px" }}>
          ← Back
        </button>

        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 14, opacity: 0.9 }}>Your loyalty QR</div>
          <div style={{ fontSize: 42, fontWeight: 900, lineHeight: 1.05, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
            {css.title || card.storeId}
          </div>
          <div style={{ marginTop: 6, fontSize: 18, opacity: 0.9 }}>
            {card.stamps}/{card.goal} • {card.status}
          </div>
        </div>

        <button
          onClick={deleteCard}
          style={{
            padding: "14px 18px",
            borderRadius: 18,
            background: "rgba(255,0,0,0.85)",
            color: "white",
            border: "0",
            fontWeight: 800,
            whiteSpace: "nowrap",
          }}
        >
          Delete card
        </button>
      </div>

      {/* QR (centre, sans scroll) */}
      <div
        style={{
          position: "relative",
          flex: 1,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: 18,
        }}
      >
        <div
          style={{
            width: "min(92vw, 420px)",
            maxWidth: "420px",
            background: "rgba(255,255,255,0.95)",
            borderRadius: 24,
            padding: 14,
            boxShadow: "0 18px 45px rgba(0,0,0,0.30)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <div style={{ width: "100%", aspectRatio: "1 / 1", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <QRCodeCanvas
              value={qrPayload}
              size={qrSize}
              includeMargin
              style={{
                width: "100%",
                height: "auto",
                maxWidth: "360px",
              }}
            />
          </div>
        </div>
      </div>

      {/* Footer texte */}
      <div style={{ position: "relative", padding: "0 18px 18px 18px", textAlign: "center", opacity: 0.9 }}>
        Montre ce QR au commerçant pour ajouter des tampons.
      </div>
    </main>
  );
}