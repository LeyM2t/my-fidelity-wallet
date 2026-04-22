"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type TouchEvent,
} from "react";
import { useParams, useRouter } from "next/navigation";
import CardCanvas from "@/components/CardCanvas";
import WalletMoveModal from "@/components/WalletMoveModal";
import { useTranslations } from "next-intl";
import {
  DEFAULT_CUSTOM_WALLET_COLOR,
  DEFAULT_MAIN_WALLET_COLOR,
  DEFAULT_WALLET_ID,
  getCardsForWallet,
  getWalletDisplayColor,
  getWalletDisplayName,
  loadLocalWallets,
  moveCardToWallet,
  type LocalWallet,
} from "@/lib/walletLocal";

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

const MAX_VISIBLE_DISTANCE = 3;
const SWIPE_THRESHOLD = 42;

function safeCssUrl(url: string): string {
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

function buildWalletBackground(color: string, isDefault: boolean) {
  const base =
    color || (isDefault ? DEFAULT_MAIN_WALLET_COLOR : DEFAULT_CUSTOM_WALLET_COLOR);

  return isDefault
    ? `linear-gradient(135deg, ${base} 0%, #18181b 100%)`
    : `linear-gradient(135deg, ${base} 0%, #854d0e 100%)`;
}

function getMoveTexts(locale: string) {
  if (locale === "fr") {
    return {
      moveButton: "Déplacer la carte",
      moveBackButton: "Remettre dans le wallet principal",
      movedInfo: "Carte déplacée.",
      noActiveCard: "Aucune carte active.",
      noWallets: "Aucun wallet personnalisé disponible.",
      modalTitle: "Déplacer la carte",
      modalSubtitle: "Choisis le wallet de destination.",
      modalConfirm: "Déplacer",
      modalCancel: "Annuler",
    };
  }

  if (locale === "es") {
    return {
      moveButton: "Mover la tarjeta",
      moveBackButton: "Volver al wallet principal",
      movedInfo: "Tarjeta movida.",
      noActiveCard: "No hay tarjeta activa.",
      noWallets: "No hay wallets personalizados disponibles.",
      modalTitle: "Mover la tarjeta",
      modalSubtitle: "Elige el wallet de destino.",
      modalConfirm: "Mover",
      modalCancel: "Cancelar",
    };
  }

  return {
    moveButton: "Move card",
    moveBackButton: "Move back to main wallet",
    movedInfo: "Card moved.",
    noActiveCard: "No active card.",
    noWallets: "No custom wallets available.",
    modalTitle: "Move card",
    modalSubtitle: "Choose the destination wallet.",
    modalConfirm: "Move",
    modalCancel: "Cancel",
  };
}

function normalizeSearchValue(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toLowerCase();
}

function getCardDisplayTitle(card: FirestoreCard, tpl?: CardTemplate | null) {
  const css = templateToCss(tpl);
  return css.title || card.storeId;
}

export default function WalletDetailPage() {
  const router = useRouter();
  const params = useParams<{ locale: string; walletId: string }>();

  const locale = String(params?.locale ?? "en");
  const walletId = String(params?.walletId || "");
  const t = useTranslations("walletDetail");
  const moveTexts = useMemo(() => getMoveTexts(locale), [locale]);

  const [cards, setCards] = useState<FirestoreCard[]>([]);
  const [templatesByStore, setTemplatesByStore] =
    useState<Record<string, CardTemplate>>({});
  const [customWallets, setCustomWallets] = useState<LocalWallet[]>([]);
  const [activeIndex, setActiveIndex] = useState(0);
  const [loading, setLoading] = useState(false);
  const [moving, setMoving] = useState(false);
  const [error, setError] = useState("");
  const [info, setInfo] = useState("");
  const [isCompact, setIsCompact] = useState(false);
  const [moveModalOpen, setMoveModalOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");

  const touchStartXRef = useRef<number | null>(null);
  const touchDeltaXRef = useRef(0);

  const fetchTemplatesForStores = useCallback(async (storeIds: string[]) => {
    const uniq = Array.from(new Set(storeIds.filter(Boolean)));
    if (uniq.length === 0) return;

    const entries = await Promise.all(
      uniq.map(async (storeId) => {
        try {
          const res = await fetch(`/api/stores/${encodeURIComponent(storeId)}`, {
            cache: "no-store",
          });
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

  const refreshWallets = useCallback(() => {
    setCustomWallets(loadLocalWallets());
  }, []);

  const fetchCards = useCallback(async () => {
    setLoading(true);
    setError("");
    setInfo("");

    try {
      const res = await fetch("/api/cards", {
        method: "GET",
        cache: "no-store",
      });

      if (res.status === 401 || res.status === 403) {
        router.replace(
          `/${locale}/client/login?next=${encodeURIComponent(
            `/${locale}/wallet/${walletId}`
          )}`
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
    refreshWallets();
  }, [refreshWallets]);

  useEffect(() => {
    const updateViewportMode = () => {
      if (typeof window === "undefined") return;
      setIsCompact(window.innerWidth < 700);
    };

    updateViewportMode();
    window.addEventListener("resize", updateViewportMode);
    return () => window.removeEventListener("resize", updateViewportMode);
  }, []);

  useEffect(() => {
    fetchCards();

    const onFocus = () => {
      refreshWallets();
      fetchCards();
    };

    const onVisibility = () => {
      if (document.visibilityState === "visible") {
        refreshWallets();
        fetchCards();
      }
    };

    window.addEventListener("focus", onFocus);
    document.addEventListener("visibilitychange", onVisibility);

    return () => {
      window.removeEventListener("focus", onFocus);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [fetchCards, refreshWallets]);

  const walletName = useMemo(() => {
    return getWalletDisplayName(walletId, t("mainWallet"), t("fallbackWallet"));
  }, [walletId, t]);

  const walletColor = useMemo(() => {
    return getWalletDisplayColor(
      walletId,
      DEFAULT_MAIN_WALLET_COLOR,
      DEFAULT_CUSTOM_WALLET_COLOR
    );
  }, [walletId]);

  const visibleCards = useMemo(() => {
    return getCardsForWallet(cards, walletId);
  }, [cards, walletId]);

  const normalizedSearch = useMemo(
    () => normalizeSearchValue(searchTerm),
    [searchTerm]
  );

  const filteredVisibleCards = useMemo(() => {
    if (!normalizedSearch) return visibleCards;

    return visibleCards.filter((card) => {
      const tpl = templatesByStore[card.storeId];
      const title = getCardDisplayTitle(card, tpl);
      return normalizeSearchValue(title).includes(normalizedSearch);
    });
  }, [normalizedSearch, templatesByStore, visibleCards]);

  const moveWalletOptions = useMemo(
    () =>
      customWallets.map((wallet) => ({
        id: wallet.id,
        name: wallet.name,
        color: wallet.color || DEFAULT_CUSTOM_WALLET_COLOR,
      })),
    [customWallets]
  );

  useEffect(() => {
    setActiveIndex(0);
  }, [walletId, filteredVisibleCards.length, normalizedSearch]);

  useEffect(() => {
    setActiveIndex((prev) =>
      Math.max(0, Math.min(prev, Math.max(filteredVisibleCards.length - 1, 0)))
    );
  }, [filteredVisibleCards.length]);

  const activeCard =
    filteredVisibleCards.length > 0
      ? filteredVisibleCards[
          Math.max(0, Math.min(activeIndex, filteredVisibleCards.length - 1))
        ]
      : null;

  const goPrev = useCallback(() => {
    setActiveIndex((prev) => Math.max(prev - 1, 0));
  }, []);

  const goNext = useCallback(() => {
    setActiveIndex((prev) =>
      Math.min(prev + 1, filteredVisibleCards.length - 1)
    );
  }, [filteredVisibleCards.length]);

  const handleTouchStart = useCallback((e: TouchEvent<HTMLDivElement>) => {
    touchStartXRef.current = e.touches[0]?.clientX ?? null;
    touchDeltaXRef.current = 0;
  }, []);

  const handleTouchMove = useCallback((e: TouchEvent<HTMLDivElement>) => {
    const startX = touchStartXRef.current;
    if (startX == null) return;
    const currentX = e.touches[0]?.clientX ?? startX;
    touchDeltaXRef.current = currentX - startX;
  }, []);

  const handleTouchEnd = useCallback(() => {
    const deltaX = touchDeltaXRef.current;

    if (Math.abs(deltaX) >= SWIPE_THRESHOLD) {
      if (deltaX < 0) {
        goNext();
      } else {
        goPrev();
      }
    }

    touchStartXRef.current = null;
    touchDeltaXRef.current = 0;
  }, [goNext, goPrev]);

  function handleOpenMoveModal() {
    if (!activeCard) {
      setError(moveTexts.noActiveCard);
      return;
    }

    if (customWallets.length === 0) {
      setError(moveTexts.noWallets);
      return;
    }

    setError("");
    setInfo("");
    setMoveModalOpen(true);
  }

  function handleConfirmMove(targetWalletId: string) {
    if (!activeCard) {
      setError(moveTexts.noActiveCard);
      return;
    }

    setMoving(true);
    setError("");
    setInfo("");

    try {
      moveCardToWallet(activeCard.id, targetWalletId);
      setInfo(moveTexts.movedInfo);
      setMoveModalOpen(false);
      refreshWallets();
      fetchCards().finally(() => setMoving(false));
    } catch (e: any) {
      setError(e?.message ?? moveTexts.noWallets);
      setMoving(false);
    }
  }

  function handleMoveBackToMain() {
    if (!activeCard) {
      setError(moveTexts.noActiveCard);
      return;
    }

    setMoving(true);
    setError("");
    setInfo("");

    moveCardToWallet(activeCard.id, DEFAULT_WALLET_ID);
    setInfo(moveTexts.movedInfo);
    refreshWallets();
    fetchCards().finally(() => setMoving(false));
  }

  return (
    <>
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
            maxWidth: 900,
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
              background: buildWalletBackground(
                walletColor,
                walletId === DEFAULT_WALLET_ID
              ),
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
              {visibleCards.length === 1
                ? t("realCards_one")
                : t("realCards_other", { count: visibleCards.length })}
            </p>
          </section>

          <section
            style={{
              borderRadius: 22,
              border: "1px solid #e4e4e7",
              background: "#ffffff",
              padding: 16,
            }}
          >
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder={t("searchPlaceholder")}
              style={{
                width: "100%",
                height: 48,
                borderRadius: 16,
                border: "1px solid #d4d4d8",
                background: "#fafafa",
                color: "#18181b",
                padding: "0 16px",
                fontSize: 14,
                outline: "none",
                boxSizing: "border-box",
              }}
            />
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

          {info ? (
            <section
              style={{
                border: "1px solid #bbf7d0",
                background: "#f0fdf4",
                color: "#166534",
                padding: 14,
                borderRadius: 18,
              }}
            >
              <div style={{ fontWeight: 800 }}>{info}</div>
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
          ) : !loading && filteredVisibleCards.length === 0 ? (
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
                {t("searchNoResultTitle")}
              </div>

              <div
                style={{
                  color: "#71717a",
                  fontSize: 14,
                  lineHeight: 1.5,
                }}
              >
                {t("searchNoResultDescription")}
              </div>
            </section>
          ) : (
            <>
              <section
                onTouchStart={handleTouchStart}
                onTouchMove={handleTouchMove}
                onTouchEnd={handleTouchEnd}
                style={{
                  position: "relative",
                  height: isCompact ? 360 : 430,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  overflow: "hidden",
                  touchAction: "pan-y",
                  userSelect: "none",
                }}
              >
                {filteredVisibleCards.map((card, index) => {
                  const offset = index - activeIndex;

                  if (Math.abs(offset) > MAX_VISIBLE_DISTANCE) {
                    return null;
                  }

                  const tpl = templatesByStore[card.storeId];
                  const css = templateToCss(tpl);
                  const canvasTpl = templateToCardCanvasTemplate(css);
                  const titleToShow = canvasTpl.title || card.storeId;
                  const isActive = offset === 0;

                  const absOffset = Math.abs(offset);
                  const translateX = offset * (isCompact ? 78 : 108);
                  const translateY = absOffset * (isCompact ? 22 : 18);
                  const scale = isActive
                    ? 1
                    : absOffset === 1
                      ? 0.92
                      : absOffset === 2
                        ? 0.86
                        : 0.8;
                  const opacity = isActive
                    ? 1
                    : absOffset === 1
                      ? 0.72
                      : absOffset === 2
                        ? 0.44
                        : 0.22;

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
                        width: isCompact ? "min(88vw, 320px)" : "min(100%, 360px)",
                        cursor: "pointer",
                        transform: `translateX(${translateX}px) translateY(${translateY}px) scale(${scale})`,
                        opacity,
                        zIndex: 100 - absOffset,
                        transition:
                          "transform 260ms ease, opacity 260ms ease, box-shadow 260ms ease",
                        boxShadow: isActive
                          ? "0 22px 42px rgba(0,0,0,0.22)"
                          : "0 10px 22px rgba(0,0,0,0.10)",
                        borderRadius: 24,
                        overflow: "hidden",
                        pointerEvents: opacity < 0.08 ? "none" : "auto",
                        filter:
                          !isActive && absOffset >= 2
                            ? "saturate(0.9)"
                            : "none",
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
                  alignItems: "center",
                }}
              >
                <button
                  onClick={goPrev}
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
                  ←
                </button>

                <div
                  style={{
                    minWidth: 90,
                    textAlign: "center",
                    fontSize: 13,
                    fontWeight: 700,
                    color: "#52525b",
                  }}
                >
                  {filteredVisibleCards.length > 0
                    ? `${activeIndex + 1} / ${filteredVisibleCards.length}`
                    : "0 / 0"}
                </div>

                <button
                  onClick={goNext}
                  disabled={activeIndex >= filteredVisibleCards.length - 1}
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
                      activeIndex >= filteredVisibleCards.length - 1
                        ? "default"
                        : "pointer",
                    opacity:
                      activeIndex >= filteredVisibleCards.length - 1 ? 0.5 : 1,
                  }}
                >
                  →
                </button>
              </section>

              {activeCard ? (
                <section style={{ display: "grid", gap: 10 }}>
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

                  <button
                    onClick={handleOpenMoveModal}
                    disabled={moving || customWallets.length === 0}
                    style={{
                      width: "100%",
                      height: 50,
                      borderRadius: 18,
                      border: "1px solid #d4d4d8",
                      background: "#ffffff",
                      color: "#18181b",
                      fontSize: 14,
                      fontWeight: 800,
                      cursor:
                        moving || customWallets.length === 0
                          ? "default"
                          : "pointer",
                      opacity: moving || customWallets.length === 0 ? 0.5 : 1,
                    }}
                  >
                    {moveTexts.moveButton}
                  </button>

                  {walletId !== DEFAULT_WALLET_ID ? (
                    <button
                      onClick={handleMoveBackToMain}
                      disabled={moving}
                      style={{
                        width: "100%",
                        height: 50,
                        borderRadius: 18,
                        border: "1px solid #d4d4d8",
                        background: "#ffffff",
                        color: "#18181b",
                        fontSize: 14,
                        fontWeight: 800,
                        cursor: moving ? "default" : "pointer",
                        opacity: moving ? 0.5 : 1,
                      }}
                    >
                      {moveTexts.moveBackButton}
                    </button>
                  ) : null}
                </section>
              ) : null}
            </>
          )}
        </div>
      </main>

      <WalletMoveModal
        open={moveModalOpen}
        title={moveTexts.modalTitle}
        subtitle={moveTexts.modalSubtitle}
        confirmLabel={moveTexts.modalConfirm}
        cancelLabel={moveTexts.modalCancel}
        wallets={moveWalletOptions}
        loading={moving}
        onClose={() => setMoveModalOpen(false)}
        onConfirm={handleConfirmMove}
      />
    </>
  );
}