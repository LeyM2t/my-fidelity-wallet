"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { QRCodeCanvas } from "qrcode.react";
import { useTranslations } from "next-intl";

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
  logoUrl?: string;
  bgColor?: string;
  textColor?: string;
  font?: string;
  bgType?: "color" | "gradient";
  gradient?: {
    from?: string;
    to?: string;
    angle?: number;
  };
};

function safeImageUrl(url?: string) {
  const u = (url || "").trim();
  if (!u) return "";
  if (u.startsWith("/")) return u;
  if (/^https?:\/\/[^\s]+$/i.test(u)) return u;
  return "";
}

function templateBackground(template: CardTemplate | null) {
  if (!template) return "#111827";

  if (
    template.bgType === "gradient" &&
    template.gradient?.from &&
    template.gradient?.to
  ) {
    const angle =
      typeof template.gradient.angle === "number"
        ? template.gradient.angle
        : 45;

    return `linear-gradient(${angle}deg, ${template.gradient.from}, ${template.gradient.to})`;
  }

  return template.bgColor || "#111827";
}

export default function CardPage() {
  const router = useRouter();
  const params = useParams<{ locale: string; cardId: string }>();
  const locale = String(params?.locale ?? "en");
  const cardId = String(params?.cardId ?? "");
  const t = useTranslations("card");

  const [card, setCard] = useState<FirestoreCard | null>(null);
  const [template, setTemplate] = useState<CardTemplate | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    async function fetchCardAndTemplate() {
      try {
        setLoading(true);
        setError("");

        const res = await fetch("/api/cards", { cache: "no-store" });

        if (res.status === 401) {
          router.replace(
            `/${locale}/client/login?next=${encodeURIComponent(
              `/${locale}/wallet/card/${cardId}`
            )}`
          );
          return;
        }

        if (!res.ok) {
          throw new Error(t("errors.loadCards"));
        }

        const data = await res.json();
        const list = Array.isArray(data) ? data : data?.cards || [];

        const found = list.find(
          (c: any) => String(c.id ?? c.cardId ?? "") === cardId
        );

        if (!found) {
          setError(t("errors.notFound"));
          setLoading(false);
          return;
        }

        const normalized: FirestoreCard = {
          id: String(found.id ?? found.cardId ?? ""),
          storeId: String(found.storeId ?? ""),
          ownerId: String(found.ownerId ?? ""),
          stamps: Number(found.stamps ?? 0),
          goal: Number(found.goal ?? 10),
          status: found.status === "reward" ? "reward" : "active",
          rewardAvailable: Boolean(
            found.rewardAvailable ?? found.status === "reward"
          ),
        };

        setCard(normalized);

        const storeRes = await fetch(
          `/api/stores/${encodeURIComponent(normalized.storeId)}`,
          { cache: "no-store" }
        );

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
        setError(t("errors.loadCard"));
        setLoading(false);
      }
    }

    if (!cardId) {
      setError(t("errors.invalidId"));
      setLoading(false);
      return;
    }

    fetchCardAndTemplate();
  }, [cardId, locale, router, t]);

  const qrPayload = useMemo(() => {
    if (!card) return "";
    return JSON.stringify({
      storeId: card.storeId,
      cardId: card.id,
    });
  }, [card]);

  if (loading) {
    return (
      <main
        style={{
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: 20,
          background: "#f9fafb",
          fontFamily:
            'Inter, Arial, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
        }}
      >
        <div style={{ textAlign: "center", color: "#111827" }}>
          <div style={{ fontSize: 28, marginBottom: 10 }}>⏳</div>
          <div>{t("loading")}</div>
        </div>
      </main>
    );
  }

  if (error) {
    return (
      <main
        style={{
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: 20,
          background: "#f9fafb",
          fontFamily:
            'Inter, Arial, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
        }}
      >
        <div
          style={{
            width: "100%",
            maxWidth: 420,
            background: "#fff",
            border: "1px solid #fecaca",
            color: "#991b1b",
            borderRadius: 16,
            padding: 20,
            textAlign: "center",
          }}
        >
          {error}
        </div>
      </main>
    );
  }

  if (!card) return null;

  const titleToShow = (template?.title || "").trim() || card.storeId;
  const logoUrl = safeImageUrl(template?.logoUrl);
  const headerBackground = templateBackground(template);
  const headerTextColor = (template?.textColor || "#ffffff").trim() || "#ffffff";

  return (
    <main
      style={{
        minHeight: "100vh",
        background: "#f9fafb",
        padding: 20,
        fontFamily:
          'Inter, Arial, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
      }}
    >
      <div
        style={{
          maxWidth: 520,
          margin: "0 auto",
          display: "grid",
          gap: 18,
        }}
      >
        <button
          onClick={() => router.back()}
          style={{
            justifySelf: "start",
            padding: "8px 12px",
            borderRadius: 10,
            border: "1px solid #d1d5db",
            background: "#fff",
            color: "#111827",
            fontWeight: 600,
            cursor: "pointer",
          }}
        >
          ← {t("back")}
        </button>

        <div
          style={{
            background: "#fff",
            borderRadius: 24,
            padding: 24,
            boxShadow: "0 10px 30px rgba(0,0,0,0.08)",
            textAlign: "center",
          }}
        >
          <div
            style={{
              borderRadius: 22,
              padding: 20,
              marginBottom: 20,
              background: headerBackground,
              color: headerTextColor,
              position: "relative",
              overflow: "hidden",
            }}
          >
            {logoUrl ? (
              <div
                style={{
                  width: 88,
                  height: 88,
                  margin: "0 auto 14px",
                  borderRadius: 18,
                  overflow: "hidden",
                  background: "rgba(255,255,255,0.12)",
                  border: "1px solid rgba(255,255,255,0.15)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  padding: 8,
                }}
              >
                <img
                  src={logoUrl}
                  alt=""
                  aria-hidden="true"
                  style={{
                    width: "100%",
                    height: "100%",
                    objectFit: "contain",
                    display: "block",
                  }}
                />
              </div>
            ) : null}

            <h1
              style={{
                margin: 0,
                fontSize: 28,
                lineHeight: 1.1,
                color: "inherit",
              }}
            >
              {titleToShow}
            </h1>
          </div>

          <div
            style={{
              display: "flex",
              justifyContent: "center",
              marginBottom: 14,
            }}
          >
            <QRCodeCanvas value={qrPayload} size={320} />
          </div>

          <p
            style={{
              margin: 0,
              fontSize: 14,
              color: "#6b7280",
            }}
          >
            {t("showQR")}
          </p>
        </div>
      </div>
    </main>
  );
}