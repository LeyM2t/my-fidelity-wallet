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

type Box = { x: number; y: number; width: number; height: number };

type CardTemplate = {
  title?: string;
  textColor?: string;
  font?: string;

  bgColor?: string;

  bgType?: "solid" | "gradient";
  gradient?: { angle?: number; from?: string; to?: string };

  bgImageEnabled?: boolean;
  bgImageOpacity?: number;
  bgImageUrl?: string;
  bgImageBox?: Box;

  logoUrl?: string;
  logoBox?: Box;
};

function getOwnerId(): string {
  const key = "fw_ownerId";
  try {
    return localStorage.getItem(key) || "";
  } catch {
    return "";
  }
}

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}

function canvasSizeFromTemplate(tpl?: CardTemplate | null) {
  const w = tpl?.bgImageBox?.width;
  const h = tpl?.bgImageBox?.height;
  return {
    w: typeof w === "number" && w > 0 ? w : 420,
    h: typeof h === "number" && h > 0 ? h : 220,
  };
}

function toPct(n: number, base: number) {
  if (!Number.isFinite(n) || !Number.isFinite(base) || base <= 0) return 0;
  return (n / base) * 100;
}

function computeBackground(tpl?: CardTemplate | null) {
  const bgColor = tpl?.bgColor || "#111827";
  const bgType = tpl?.bgType || "solid";

  if (bgType === "gradient") {
    const angle = tpl?.gradient?.angle ?? 45;
    const from = tpl?.gradient?.from || "#111827";
    const to = tpl?.gradient?.to || "#0b1220";
    return `linear-gradient(${angle}deg, ${from}, ${to})`;
  }

  return bgColor;
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
        const res = await fetch(`/api/cards?ownerId=${encodeURIComponent(ownerId)}`, { cache: "no-store" });
        const data = await res.json();
        const list = Array.isArray(data) ? data : data?.cards || [];
        const found = list.find((c: any) => String(c.id) === cardId);

        if (!found) {
          setError("Card not found.");
          setLoading(false);
          return;
        }

        setCard(found);

        const storeRes = await fetch(`/api/stores/${encodeURIComponent(found.storeId)}`, { cache: "no-store" });
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

  const applied = useMemo(() => {
    const bg = computeBackground(template);
    const textColor = template?.textColor || "#ffffff";
    const fontFamily = template?.font || "system-ui, -apple-system, Segoe UI, Roboto, Arial";
    const title = template?.title || (card?.storeId ?? "");

    const bgImageEnabled = template?.bgImageEnabled !== false;
    const bgImageUrl = template?.bgImageUrl || "";
    const bgImgOpacity = clamp(typeof template?.bgImageOpacity === "number" ? template!.bgImageOpacity! : 0.75, 0, 1);

    const logoUrl = template?.logoUrl || "";
    const logoBox = template?.logoBox;

    const { w, h } = canvasSizeFromTemplate(template);

    return {
      bg,
      textColor,
      fontFamily,
      title,
      bgImageEnabled,
      bgImageUrl,
      bgImgOpacity,
      logoUrl,
      logoBox,
      w,
      h,
    };
  }, [template, card]);

  async function deleteCard() {
    if (!card) return;
    if (!confirm("Delete this card?")) return;

    const ownerId = getOwnerId();
    const res = await fetch("/api/cards/delete", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ cardId: card.id, ownerId }),
    });

    if (res.ok) router.replace("/wallet");
    else alert("Delete failed.");
  }

  if (loading) return <main style={{ padding: 24 }}>Loading...</main>;
  if (error) return <main style={{ padding: 24 }}>{error}</main>;
  if (!card) return null;

  const logoStyle =
    applied.logoUrl && applied.logoBox
      ? {
          position: "absolute" as const,
          left: `${toPct(applied.logoBox.x, applied.w)}%`,
          top: `${toPct(applied.logoBox.y, applied.h)}%`,
          width: `${toPct(applied.logoBox.width, applied.w)}%`,
          height: `${toPct(applied.logoBox.height, applied.h)}%`,
          borderRadius: 18,
          overflow: "hidden" as const,
          background: "rgba(255,255,255,0.18)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }
      : null;

  return (
    <main style={{ minHeight: "100dvh", margin: 0 }}>
      {/* fond plein écran = même template */}
      <div
        style={{
          minHeight: "100dvh",
          padding: 18,
          color: applied.textColor,
          fontFamily: applied.fontFamily,
          background: applied.bg,
          position: "relative",
          overflow: "hidden",
        }}
      >
        {applied.bgImageEnabled && applied.bgImageUrl ? (
          <div
            style={{
              position: "absolute",
              inset: 0,
              backgroundImage: `url(${applied.bgImageUrl})`,
              backgroundSize: "cover",
              backgroundPosition: "center",
              opacity: applied.bgImgOpacity,
            }}
          />
        ) : null}

        <div
          style={{
            position: "absolute",
            inset: 0,
            background: "rgba(0,0,0,0.18)",
          }}
        />

        {/* header */}
        <div style={{ position: "relative", display: "flex", alignItems: "center", gap: 12 }}>
          <button onClick={() => router.push("/wallet")} style={{ padding: "10px 12px" }}>
            ← Back
          </button>

          <div style={{ marginLeft: "auto" }}>
            <button
              onClick={deleteCard}
              style={{
                background: "rgba(255,0,0,0.90)",
                color: "white",
                padding: "12px 14px",
                borderRadius: 14,
                fontWeight: 800,
                border: "none",
              }}
            >
              Delete card
            </button>
          </div>
        </div>

        {/* titre */}
        <div style={{ position: "relative", marginTop: 18 }}>
          <div style={{ fontSize: 18, opacity: 0.92 }}>Your loyalty QR</div>
          <div style={{ fontSize: 44, fontWeight: 900, lineHeight: 1.05 }}>{applied.title}</div>
          <div style={{ marginTop: 10, fontSize: 18, opacity: 0.92 }}>
            {card.stamps}/{card.goal} • {card.status}
          </div>
        </div>

        {/* “carte” invisible juste pour placer logo comme le preview */}
        <div
          style={{
            position: "relative",
            marginTop: 18,
            width: "100%",
            maxWidth: 820,
            aspectRatio: `${applied.w} / ${applied.h}`,
            opacity: 0.001,
          }}
        >
          {logoStyle ? (
            <div style={logoStyle}>
              <img src={applied.logoUrl} alt="logo" style={{ width: "90%", height: "90%", objectFit: "contain" }} />
            </div>
          ) : null}
        </div>

        {/* QR énorme */}
        <div
          style={{
            position: "relative",
            marginTop: 18,
            display: "flex",
            justifyContent: "center",
          }}
        >
          <div
            style={{
              background: "rgba(255,255,255,0.95)",
              padding: 16,
              borderRadius: 22,
              width: "min(86vw, 420px)",
            }}
          >
            <QRCodeCanvas value={qrPayload} size={999} style={{ width: "100%", height: "auto" }} includeMargin />
          </div>
        </div>

        <div style={{ position: "relative", marginTop: 18, textAlign: "center", fontSize: 14, opacity: 0.9 }}>
          Montre ce QR au commerçant pour ajouter des tampons.
        </div>
      </div>
    </main>
  );
}