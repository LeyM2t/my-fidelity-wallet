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
  textColor?: string;

  bgColor?: string;
  bgType?: "solid" | "gradient" | string;
  gradient?: { from?: string; to?: string; angle?: number };

  bgImageEnabled?: boolean;
  bgImageUrl?: string;
  bgImageOpacity?: number;

  logoUrl?: string;
  font?: string;
};

function getOwnerId(): string {
  const key = "fw_ownerId";
  try {
    return localStorage.getItem(key) || "";
  } catch {
    return "";
  }
}

function fontToCss(font?: string) {
  const f = (font || "").toLowerCase().trim();
  if (!f) return "system-ui, -apple-system, Segoe UI, Roboto, Arial";
  if (f.includes("inter")) return "Inter, system-ui, -apple-system, Segoe UI, Roboto, Arial";
  if (f.includes("oswald")) return "Oswald, system-ui, -apple-system, Segoe UI, Roboto, Arial";
  if (f.includes("poppins")) return "Poppins, system-ui, -apple-system, Segoe UI, Roboto, Arial";
  return "system-ui, -apple-system, Segoe UI, Roboto, Arial";
}

export default function CardQrPage() {
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
        const res = await fetch(`/api/cards?ownerId=${encodeURIComponent(ownerId)}`, {
          cache: "no-store",
        });
        const data = await res.json();
        const list = Array.isArray(data) ? data : data?.cards || [];
        const found = list.find((c: any) => String(c.id) === cardId);

        if (!found) {
          setError("Card not found.");
          setLoading(false);
          return;
        }

        setCard(found);

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
    return JSON.stringify({
      storeId: card.storeId,
      ownerId: card.ownerId,
      cardId: card.id,
    });
  }, [card]);

  const applied = useMemo(() => {
    const textColor = template?.textColor || "#ffffff";
    const fontFamily = fontToCss(template?.font);

    const bgColor = template?.bgColor || "#111827";
    const bgImageEnabled = Boolean(template?.bgImageEnabled && template?.bgImageUrl);
    const bgImageUrl = bgImageEnabled ? String(template?.bgImageUrl) : "";
    const bgImageOpacity =
      typeof template?.bgImageOpacity === "number" ? template!.bgImageOpacity : 0.6;

    const gradientFrom = template?.gradient?.from;
    const gradientTo = template?.gradient?.to;
    const gradientAngle = typeof template?.gradient?.angle === "number" ? template!.gradient!.angle : 45;
    const gradientCss =
      gradientFrom && gradientTo
        ? `linear-gradient(${gradientAngle}deg, ${gradientFrom}, ${gradientTo})`
        : "";

    const overlayBg =
      template?.bgType === "gradient" && gradientCss ? gradientCss : bgColor;

    const title = template?.title || card?.storeId || "Card";

    return { textColor, fontFamily, bgImageUrl, bgImageOpacity, overlayBg, title };
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
    } catch {
      // pas bloquant
    }
  }

  if (loading) return <main style={{ padding: 24 }}>Loading...</main>;
  if (error) return <main style={{ padding: 24 }}>{error}</main>;
  if (!card) return null;

  return (
    <main style={{ minHeight: "100vh", position: "relative", overflow: "hidden" }}>
      {/* BG image */}
      {applied.bgImageUrl ? (
        <div
          style={{
            position: "absolute",
            inset: 0,
            backgroundImage: `url(${applied.bgImageUrl})`,
            backgroundSize: "cover",
            backgroundPosition: "center",
            transform: "scale(1.03)",
          }}
        />
      ) : null}

      {/* Overlay */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          background: applied.overlayBg,
          opacity: applied.bgImageUrl ? applied.bgImageOpacity : 1,
        }}
      />

      {/* Content */}
      <div
        style={{
          position: "relative",
          minHeight: "100vh",
          padding: 20,
          color: applied.textColor,
          fontFamily: applied.fontFamily,
          display: "flex",
          flexDirection: "column",
          gap: 14,
          maxWidth: 720,
          margin: "0 auto",
        }}
      >
        <button
          onClick={() => router.push("/wallet")}
          style={{ alignSelf: "flex-start" }}
        >
          ← Back
        </button>

        <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "flex-end" }}>
          <div style={{ minWidth: 0 }}>
            <div style={{ fontSize: 14, opacity: 0.9 }}>Your loyalty QR</div>
            <div style={{ fontSize: 26, fontWeight: 900, lineHeight: 1.1, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
              {applied.title}
            </div>
            <div style={{ marginTop: 6, fontSize: 14, opacity: 0.9 }}>
              {card.stamps}/{card.goal} • {card.status}
            </div>
          </div>

          <button
            onClick={deleteCard}
            style={{
              background: "rgba(255,0,0,0.88)",
              color: "white",
              padding: "10px 14px",
              borderRadius: 10,
              border: "0",
              cursor: "pointer",
              flex: "0 0 auto",
            }}
          >
            Delete card
          </button>
        </div>

        {/* QR plein écran (grand) */}
        <div
          style={{
            flex: 1,
            display: "grid",
            placeItems: "center",
          }}
        >
          <div
            style={{
              background: "rgba(255,255,255,0.95)",
              padding: 16,
              borderRadius: 18,
              boxShadow: "0 14px 40px rgba(0,0,0,0.28)",
            }}
            onClick={copyQrPayload}
          >
            <QRCodeCanvas
              value={qrPayload}
              // taille grande mais safe mobile
              size={320}
              includeMargin
            />
          </div>
        </div>

        <div style={{ fontSize: 12, opacity: 0.85, textAlign: "center", paddingBottom: 10 }}>
          Montre ce QR au commerçant pour ajouter des tampons.
        </div>

        <details style={{ opacity: 0.9 }}>
          <summary>Debug</summary>
          <pre style={{ whiteSpace: "pre-wrap", marginTop: 10 }}>
{JSON.stringify({ card, template }, null, 2)}
          </pre>
        </details>
      </div>
    </main>
  );
}