"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import CardCanvas from "@/components/CardCanvas";
import { useTranslations } from "next-intl";

type FirestoreCard = {
  id: string;
  storeId: string;
  stamps: number;
  goal: number;
  status: "active" | "reward";
  rewardAvailable?: boolean;
  rewardsUsed?: number;
  sourceToken?: string;
  createdAt?: any;
  updatedAt?: any;
};

type Box = {
  x?: number;
  y?: number;
  width?: number;
  height?: number;
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
  bgImageBox?: Box;
  logoUrl?: string;
  logoBox?: Box;
};

type LocalWallet = {
  id: string;
  name: string;
  createdAt: number;
};

const LOCAL_WALLETS_KEY = "fw_custom_wallets_v1";
const DEFAULT_WALLET_ID = "__all_cards__";

function safeCssUrl(url: string): string {
  const u = (url || "").trim();
  if (!u) return "";
  if (u.startsWith("/")) return u;
  if (/^https?:\/\/[^\s]+$/i.test(u)) return u;
  return "";
}

function normalizeBox(box: Box | undefined, fallback: Required<Box>): Required<Box> {
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

function templateToCss(tpl: CardTemplate | undefined | null) {
  const bgColor = tpl?.bgColor || "#111827";
  const bgType = tpl?.bgType || "color";
  const from = tpl?.gradient?.from || "#111827";
  const to = tpl?.gradient?.to || "#111827";
  const angle =
    typeof tpl?.gradient?.angle === "number" ? tpl.gradient.angle : 45;

  const baseBackground =
    bgType === "gradient"
      ? `linear-gradient(${angle}deg, ${from}, ${to})`
      : bgColor;

  return {
    title: (tpl?.title || "").trim(),
    textColor: (tpl?.textColor || "#ffffff").trim(),
    font: (tpl?.font || "inter").trim(),
    baseBackground,
    bgImageEnabled: tpl?.bgImageEnabled !== false,
    bgImageOpacity:
      typeof tpl?.bgImageOpacity === "number"
        ? Math.max(0, Math.min(1, tpl.bgImageOpacity))
        : 0.7,
    bgImageUrl: safeCssUrl(tpl?.bgImageUrl || ""),
    bgImageBox: normalizeBox(tpl?.bgImageBox, {
      x: 0,
      y: 0,
      width: 420,
      height: 220,
    }),
    logoUrl: safeCssUrl(tpl?.logoUrl || ""),
    logoBox: normalizeBox(tpl?.logoBox, {
      x: 18,
      y: 18,
      width: 56,
      height: 56,
    }),
  };
}

function templateToCardCanvasTemplate(css: ReturnType<typeof templateToCss>) {
  const base = css.baseBackground || "";
  const isGradient = base.includes("linear-gradient(");

  return {
    title: css.title,
    textColor: css.textColor,
    font: css.font,
    bgColor: isGradient ? undefined : base,
    bgGradient: isGradient ? base : undefined,
    bgImageUrl: css.bgImageEnabled ? css.bgImageUrl : "",
    bgImageOpacity: css.bgImageOpacity,
    bgImageBox: css.bgImageBox,
    logoUrl: css.logoUrl,
    logoBox: css.logoBox,
  };
}

function loadLocalWallets(): LocalWallet[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(LOCAL_WALLETS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];

    return parsed
      .map((item) => ({
        id: String(item?.id || ""),
        name: String(item?.name || "").trim(),
        createdAt: Number(item?.createdAt || Date.now()),
      }))
      .filter((item) => item.id && item.name);
  } catch {
    return [];
  }
}

export default function WalletDetailPage() {
  const router = useRouter();
  const params = useParams<{ locale: string; walletId: string }>();

  const locale = String(params?.locale ?? "en");
  const walletId = String(params?.walletId || "");
  const t = useTranslations("walletDetail");

  const [cards, setCards] = useState<FirestoreCard[]>([]);
  const [templatesByStore, setTemplatesByStore] =
    useState<Record<string, CardTemplate>>({});
  const [customWallets, setCustomWallets] = useState<LocalWallet[]>([]);
  const [activeIndex, setActiveIndex] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const fetchTemplatesForStores = useCallback(async (storeIds: string[]) => {
    const uniq = Array.from(new Set(storeIds.filter(Boolean)));
    if (uniq.length === 0) return;

    const entries = await Promise.all(
      uniq.map(async (storeId) => {
        try {
          const res = await fetch(
            `/api/stores/${encodeURIComponent(storeId)}`,
            { cache: "no-store" }
          );
          if (!res.ok) return [storeId, null] as const;
          const data = await res.json();
          const tpl =
            data?.cardTemplate ||
            data?.store?.cardTemplate ||
            data?.data?.cardTemplate ||
            null;
          return [storeId, tpl as CardTemplate | null] as const;
        } catch {
          return [storeId, null] as const;
        }
      })
    );

    setTemplatesByStore((prev) => {
      const next = { ...prev };
      for (const [storeId, tpl] of entries) {
        if (tpl) next[storeId] = tpl;
      }
      return next;
    });
  }, []);

  const fetchCards = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const res = await fetch("/api/cards", {
        method: "GET",
        cache: "no-store",
      });

      if (res.status === 401) {
        router.replace(
          `/${locale}/client/login?next=${encodeURIComponent(`/${locale}/wallet/${walletId}`)}`
        );
        return;
      }

      if (!res.ok) {
        const txt = await res.text().catch(() => "");
        throw new Error(`GET /api/cards failed (${res.status}) ${txt}`);
      }

      const data = await res.json();
      const list: any[] = Array.isArray(data)
        ? data
        : Array.isArray(data?.cards)
          ? data.cards
          : [];

      const normalized: FirestoreCard[] = list.map((c) => ({
        id: String(c.id ?? ""),
        storeId: String(c.storeId ?? ""),
        stamps: Number(c.stamps ?? 0),
        goal: Number(c.goal ?? 10),
        status: c.status === "reward" ? "reward" : "active",
        rewardAvailable: Boolean(c.rewardAvailable ?? c.status === "reward"),
        rewardsUsed:
          typeof c.rewardsUsed === "number" ? c.rewardsUsed : undefined,
        sourceToken:
          typeof c.sourceToken === "string" ? c.sourceToken : undefined,
        createdAt: c.createdAt,
        updatedAt: c.updatedAt,
      }));

      normalized.sort((a, b) => {
        const sa = a.status === "reward" ? 0 : 1;
        const sb = b.status === "reward" ? 0 : 1;
        if (sa !== sb) return sa - sb;
        return String(b.updatedAt ?? b.createdAt ?? "").localeCompare(
          String(a.updatedAt ?? a.createdAt ?? "")
        );
      });

      setCards(normalized);
      fetchTemplatesForStores(normalized.map((c) => c.storeId));
    } catch (e: any) {
      setError(e?.message ?? t("errors.unknown"));
      setCards([]);
    } finally {
      setLoading(false);
    }
  }, [fetchTemplatesForStores, locale, router, walletId, t]);

  useEffect(() => {
    setCustomWallets(loadLocalWallets());
  }, []);

  useEffect(() => {
    fetchCards();

    const onFocus = () => fetchCards();
    const onVisibility = () => {
      if (document.visibilityState === "visible") fetchCards();
    };

    window.addEventListener("focus", onFocus);
    document.addEventListener("visibilitychange", onVisibility);

    return () => {
      window.removeEventListener("focus", onFocus);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [fetchCards]);

  const walletName = useMemo(() => {
    if (walletId === DEFAULT_WALLET_ID) return t("mainWallet");
    const found = customWallets.find((w) => w.id === walletId);
    return found?.name || t("fallbackWallet");
  }, [customWallets, walletId, t]);

  const visibleCards = useMemo(() => {
    if (walletId === DEFAULT_WALLET_ID) return cards;
    return [];
  }, [cards, walletId]);

  useEffect(() => {
    setActiveIndex(0);
  }, [walletId, visibleCards.length]);

  const activeCard =
    visibleCards.length > 0
      ? visibleCards[Math.max(0, Math.min(activeIndex, visibleCards.length - 1))]
      : null;

  return (
    <main
      style={{
        minHeight: "100vh",
        background:
          "linear-gradient(180deg, #fafaf9 0%, #f4f4f5 45%, #f8fafc 100%)",
        padding: 20,
        fontFamily:
          'Inter, Arial, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
      }}
    >
      <div
        style={{
          maxWidth: 720,
          margin: "0 auto",
          display: "grid",
          gap: 18,
        }}
      >
        <section
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 12,
          }}
        >
          <button
            onClick={() => router.push(`/${locale}/wallet`)}
            style={{
              height: 42,
              borderRadius: 14,
              border: "none",
              background: "#18181b",
              color: "#ffffff",
              padding: "0 14px",
              fontSize: 14,
              fontWeight: 700,
              cursor: "pointer",
            }}
          >
            ← {t("back")}
          </button>

          <button
            onClick={fetchCards}
            disabled={loading}
            style={{
              height: 42,
              borderRadius: 14,
              border: "1px solid #d4d4d8",
              background: "#f4f4f5",
              color: "#18181b",
              padding: "0 14px",
              fontSize: 14,
              fontWeight: 700,
              cursor: loading ? "default" : "pointer",
            }}
          >
            {loading ? t("refreshing") : t("refresh")}
          </button>
        </section>

        <section
          style={{
            borderRadius: 28,
            padding: 22,
            background: "linear-gradient(135deg, #3f3f46 0%, #18181b 100%)",
            color: "#fff",
            boxShadow: "0 18px 40px rgba(24,24,27,0.28)",
          }}
        >
          <div
            style={{
              fontSize: 12,
              opacity: 0.82,
              letterSpacing: 1.2,
              textTransform: "uppercase",
              marginBottom: 10,
            }}
          >
            {t("headerLabel")}
          </div>

          <h1
            style={{
              margin: 0,
              fontSize: 30,
              lineHeight: 1,
              fontWeight: 800,
              marginBottom: 10,
            }}
          >
            {walletName}
          </h1>

          <p
            style={{
              margin: 0,
              fontSize: 14,
              opacity: 0.88,
            }}
          >
            {walletId === DEFAULT_WALLET_ID
              ? visibleCards.length === 1
                ? t("realCards_one")
                : t("realCards_other", { count: visibleCards.length })
              : t("customWalletReady")}
          </p>
        </section>

        {error ? (
          <section
            style={{
              border: "1px solid #fecaca",
              background: "#fff1f2",
              color: "#881337",
              padding: 14,
              borderRadius: 18,
            }}
          >
            <div style={{ fontWeight: 800, marginBottom: 6 }}>
              {t("errorTitle")}
            </div>
            <div style={{ whiteSpace: "pre-wrap", fontFamily: "monospace" }}>
              {error}
            </div>
          </section>
        ) : null}

        {!loading && visibleCards.length === 0 ? (
          <section
            style={{
              borderRadius: 24,
              border: "1px dashed #d4d4d8",
              background: "#fff",
              padding: 28,
              textAlign: "center",
            }}
          >
            <div
              style={{
                fontSize: 20,
                fontWeight: 800,
                color: "#18181b",
                marginBottom: 8,
              }}
            >
              {t("empty.title")}
            </div>

            <div
              style={{
                color: "#71717a",
                fontSize: 14,
                lineHeight: 1.5,
              }}
            >
              {t("empty.description")}
            </div>
          </section>
        ) : (
          <>
            <section
              style={{
                position: "relative",
                height: 430,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              {visibleCards.map((card, index) => {
                const offset = index - activeIndex;
                const tpl = templatesByStore[card.storeId];
                const css = templateToCss(tpl);
                const canvasTpl = templateToCardCanvasTemplate(css);
                const titleToShow = canvasTpl.title || card.storeId;
                const isActive = offset === 0;

                return (
                  <div
                    key={card.id}
                    onClick={() => {
                      if (isActive) {
                        router.push(
                          `/${locale}/wallet/card/${encodeURIComponent(card.id)}`
                        );
                      } else {
                        setActiveIndex(index);
                      }
                    }}
                    style={{
                      position: "absolute",
                      width: "min(100%, 320px)",
                      cursor: "pointer",
                      transform: `translateY(${offset * 126}px) scale(${isActive ? 1 : 0.92}) rotate(${offset * 4}deg)`,
                      opacity: isActive ? 1 : 0.58,
                      zIndex: 100 - Math.abs(offset),
                      transition:
                        "transform 260ms ease, opacity 260ms ease, box-shadow 260ms ease",
                      boxShadow: isActive
                        ? "0 22px 42px rgba(0,0,0,0.22)"
                        : "0 10px 22px rgba(0,0,0,0.10)",
                      borderRadius: 24,
                      overflow: "hidden",
                    }}
                  >
                    <CardCanvas
                      template={{
                        ...canvasTpl,
                        title: titleToShow,
                        scoreText: `${card.stamps}/${card.goal}`,
                      }}
                    />

                    <div
                      style={{
                        padding: "12px 14px",
                        background: "rgba(255,255,255,0.96)",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        gap: 12,
                      }}
                    >
                      <div>
                        <div
                          style={{
                            fontSize: 14,
                            fontWeight: 700,
                            color: "#18181b",
                            marginBottom: 2,
                          }}
                        >
                          {titleToShow}
                        </div>
                        <div
                          style={{
                            fontSize: 12,
                            color: "#71717a",
                          }}
                        >
                          {card.stamps}/{card.goal}
                        </div>
                      </div>

                      <div
                        style={{
                          fontSize: 12,
                          fontWeight: 700,
                          color:
                            card.status === "reward" ? "#166534" : "#18181b",
                          background:
                            card.status === "reward" ? "#dcfce7" : "#f4f4f5",
                          borderRadius: 999,
                          padding: "8px 10px",
                          whiteSpace: "nowrap",
                        }}
                      >
                        {card.status === "reward"
                          ? t("rewardReady")
                          : t("active")}
                      </div>
                    </div>
                  </div>
                );
              })}
            </section>

            <section
              style={{
                display: "flex",
                justifyContent: "center",
                gap: 12,
                flexWrap: "wrap",
              }}
            >
              <button
                onClick={() =>
                  setActiveIndex((prev) => Math.max(prev - 1, 0))
                }
                disabled={activeIndex <= 0}
                style={{
                  height: 46,
                  minWidth: 64,
                  borderRadius: 16,
                  border: "1px solid #d4d4d8",
                  background: "#ffffff",
                  color: "#18181b",
                  padding: "0 16px",
                  fontSize: 18,
                  fontWeight: 700,
                  cursor: activeIndex <= 0 ? "default" : "pointer",
                  opacity: activeIndex <= 0 ? 0.5 : 1,
                }}
              >
                ↑
              </button>

              <button
                onClick={() =>
                  setActiveIndex((prev) =>
                    Math.min(prev + 1, visibleCards.length - 1)
                  )
                }
                disabled={activeIndex >= visibleCards.length - 1}
                style={{
                  height: 46,
                  minWidth: 64,
                  borderRadius: 16,
                  border: "1px solid #d4d4d8",
                  background: "#ffffff",
                  color: "#18181b",
                  padding: "0 16px",
                  fontSize: 18,
                  fontWeight: 700,
                  cursor:
                    activeIndex >= visibleCards.length - 1
                      ? "default"
                      : "pointer",
                  opacity: activeIndex >= visibleCards.length - 1 ? 0.5 : 1,
                }}
              >
                ↓
              </button>
            </section>

            {activeCard ? (
              <section>
                <button
                  onClick={() =>
                    router.push(
                      `/${locale}/wallet/card/${encodeURIComponent(activeCard.id)}`
                    )
                  }
                  style={{
                    width: "100%",
                    height: 54,
                    borderRadius: 20,
                    border: "none",
                    background: "#18181b",
                    color: "#fff",
                    fontSize: 15,
                    fontWeight: 800,
                    cursor: "pointer",
                    boxShadow: "0 12px 28px rgba(24,24,27,0.22)",
                  }}
                >
                  {t("openCard")}
                </button>
              </section>
            ) : null}
          </>
        )}
      </div>
    </main>
  );
}


envoi le code complet a jour si besoin de modification