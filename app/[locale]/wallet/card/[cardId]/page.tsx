"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { QRCodeCanvas } from "qrcode.react";
import { useTranslations } from "next-intl";
import CardCanvas from "@/components/CardCanvas";

type FirestoreCard = {
  id: string;
  storeId: string;
  ownerId: string;
  stamps: number;
  goal: number;
  status: "active" | "reward";
  rewardAvailable?: boolean;
};

type Box = {
  x?: number;
  y?: number;
  width?: number;
  height?: number;
};

type CardTemplate = {
  title?: string;
  logoUrl?: string;
  logoBox?: Box;
  bgColor?: string;
  textColor?: string;
  font?: string;
  bgType?: "color" | "gradient";
  gradient?: {
    from?: string;
    to?: string;
    angle?: number;
  };
  bgImageUrl?: string;
  bgImageEnabled?: boolean;
  bgImageOpacity?: number;
  bgImageBox?: Box;
};

function safeImageUrl(url?: string) {
  const u = (url || "").trim();
  if (!u) return "";
  if (u.startsWith("/")) return u;
  if (/^https?:\/\/[^\s]+$/i.test(u)) return u;
  return "";
}

function normalizeBox(
  box: Box | undefined,
  fallback: Required<Box>
): Required<Box> {
  const x =
    typeof box?.x === "number" && Number.isFinite(box.x) ? box.x : fallback.x;
  const y =
    typeof box?.y === "number" && Number.isFinite(box.y) ? box.y : fallback.y;
  const width =
    typeof box?.width === "number" && Number.isFinite(box.width)
      ? box.width
      : fallback.width;
  const height =
    typeof box?.height === "number" && Number.isFinite(box.height)
      ? box.height
      : fallback.height;

  return { x, y, width, height };
}

function templateToCardCanvasTemplate(
  template: CardTemplate | null,
  storeId: string
) {
  const title = (template?.title || "").trim() || storeId;
  const bgType = template?.bgType || "color";

  const gradient =
    bgType === "gradient" &&
    template?.gradient?.from &&
    template?.gradient?.to
      ? `linear-gradient(${
          typeof template.gradient.angle === "number"
            ? template.gradient.angle
            : 45
        }deg, ${template.gradient.from}, ${template.gradient.to})`
      : undefined;

  return {
    title,
    scoreText: "",
    textColor: (template?.textColor || "#ffffff").trim() || "#ffffff",
    font: (template?.font || "inter").trim() || "inter",
    bgColor: gradient ? undefined : template?.bgColor || "#111827",
    bgGradient: gradient,
    bgImageUrl: safeImageUrl(template?.bgImageUrl),
    bgImageEnabled:
      typeof template?.bgImageEnabled === "boolean"
        ? template.bgImageEnabled
        : true,
    bgImageOpacity:
      typeof template?.bgImageOpacity === "number"
        ? Math.max(0, Math.min(1, template.bgImageOpacity))
        : 0.7,
    bgImageBox: normalizeBox(template?.bgImageBox, {
      x: 0,
      y: 0,
      width: 420,
      height: 220,
    }),
    logoUrl: safeImageUrl(template?.logoUrl),
    logoBox: normalizeBox(template?.logoBox, {
      x: 18,
      y: 18,
      width: 56,
      height: 56,
    }),
  };
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
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    async function fetchCardAndTemplate() {
      try {
        setLoading(true);
        setError("");

        const res = await fetch("/api/cards", { cache: "no-store" });

        if (res.status === 401 || res.status === 403) {
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

  async function handleDelete() {
    if (!card || deleting) return;

    const confirmed = window.confirm(t("confirmDelete"));
    if (!confirmed) return;

    try {
      setDeleting(true);
      setError("");

      const res = await fetch("/api/cards/delete", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ cardId: card.id }),
      });

      const data = await res.json().catch(() => null);

      if (res.status === 401 || res.status === 403) {
        router.replace(
          `/${locale}/client/login?next=${encodeURIComponent(
            `/${locale}/wallet/card/${cardId}`
          )}`
        );
        return;
      }

      if (!res.ok) {
        throw new Error(data?.error || t("errors.deleteFailed"));
      }

      router.replace(`/${locale}/wallet`);
      router.refresh();
    } catch (e) {
      const message =
        e instanceof Error && e.message ? e.message : t("errors.deleteFailed");
      setError(message);
      setDeleting(false);
    }
  }

  const qrPayload = useMemo(() => {
    if (!card) return "";
    return JSON.stringify({
      storeId: card.storeId,
      cardId: card.id,
    });
  }, [card]);

  const canvasTemplate = useMemo(() => {
    if (!card) return null;
    return templateToCardCanvasTemplate(template, card.storeId);
  }, [template, card]);

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

  if (error && !card) {
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

  if (!card || !canvasTemplate) return null;

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

        {error ? (
          <div
            style={{
              background: "#fee2e2",
              color: "#991b1b",
              padding: "14px 16px",
              borderRadius: 14,
              fontSize: 14,
              lineHeight: 1.4,
              textAlign: "center",
            }}
          >
            ❌ {error}
          </div>
        ) : null}

        <div
          style={{
            background: "#fff",
            borderRadius: 24,
            padding: 24,
            boxShadow: "0 10px 30px rgba(0,0,0,0.08)",
            textAlign: "center",
          }}
        >
          <div style={{ marginBottom: 20 }}>
            <CardCanvas
              template={{
                ...canvasTemplate,
                scoreText: `${card.stamps}/${card.goal}`,
              }}
            />
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
              marginBottom: 18,
              fontSize: 14,
              color: "#6b7280",
            }}
          >
            {t("showQR")}
          </p>

          <button
            type="button"
            onClick={handleDelete}
            disabled={deleting}
            style={{
              width: "100%",
              padding: "14px 16px",
              borderRadius: 14,
              border: "none",
              background: "#b91c1c",
              color: "#ffffff",
              fontSize: 15,
              fontWeight: 800,
              cursor: deleting ? "default" : "pointer",
            }}
          >
            {deleting ? `⏳ ${t("deleting")}` : t("delete")}
          </button>
        </div>
      </div>
    </main>
  );
}