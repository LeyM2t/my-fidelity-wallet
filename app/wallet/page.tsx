"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import CardCanvas from "@/components/CardCanvas";

type FirestoreCard = {
  id: string;
  storeId: string;
  ownerId: string;
  stamps: number;
  goal: number;
  status: "active" | "reward";
  rewardAvailable?: boolean;
  rewardsUsed?: number;
  sourceToken?: string;
  createdAt?: any;
  updatedAt?: any;
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
  bgImageBox?: { x: number; y: number; width: number; height: number };
  logoBox?: { x: number; y: number; width: number; height: number };
};

function getOrCreateOwnerId(): string {
  const key = "fw_ownerId";
  try {
    const existing = localStorage.getItem(key);
    if (existing && existing.trim()) return existing.trim();
    const id =
      typeof crypto !== "undefined" && "randomUUID" in crypto
        ? crypto.randomUUID()
        : `owner_${Math.random().toString(16).slice(2)}_${Date.now()}`;
    localStorage.setItem(key, id);
    return id;
  } catch {
    return `owner_${Math.random().toString(16).slice(2)}_${Date.now()}`;
  }
}

function safeCssUrl(url: string): string {
  // Ici on n'accepte que les URLs relatives (ex: /bg.png)
  const u = (url || "").trim();
  if (!u) return "";
  if (u.startsWith("/")) return u;
  return "";
}

function templateToCss(tpl: CardTemplate | undefined | null) {
  const textColor = (tpl?.textColor || "#ffffff").trim();
  const fontFamily = (tpl?.font || "system-ui, -apple-system, Segoe UI, Roboto, Arial").trim();

  const bgColor = (tpl?.bgColor || "#111827").trim();
  const bgType = tpl?.bgType || "color";
  const from = tpl?.gradient?.from || "#111827";
  const to = tpl?.gradient?.to || "#111827";
  const angle = typeof tpl?.gradient?.angle === "number" ? tpl!.gradient!.angle! : 45;

  const baseBackground =
    bgType === "gradient" ? `linear-gradient(${angle}deg, ${from}, ${to})` : bgColor;

  const bgImageEnabled = tpl?.bgImageEnabled !== false; // default true
  const bgImageOpacity =
    typeof tpl?.bgImageOpacity === "number" ? Math.max(0, Math.min(1, tpl.bgImageOpacity)) : 0.7;

  const bgImageUrl = safeCssUrl(tpl?.bgImageUrl || "");
  const logoUrl = safeCssUrl(tpl?.logoUrl || "");
  const title = (tpl?.title || "").trim();

  return {
    title,
    textColor,
    fontFamily,
    baseBackground,
    bgImageEnabled,
    bgImageOpacity,
    bgImageUrl,
    logoUrl,
  };
}

function templateToCardCanvasTemplate(css: ReturnType<typeof templateToCss>) {
  // CardCanvas supporte : bgColor, bgGradient, bgImageUrl, bgImageOpacity, logoUrl, title, scoreText
  // On map le gradient/baseBackground -> bgGradient (si c'est un linear-gradient) sinon bgColor.
  const base = css.baseBackground || "";
  const isGradient = base.includes("linear-gradient(");

  return {
    title: css.title,
    bgColor: isGradient ? undefined : base,
    bgGradient: isGradient ? base : undefined,
    bgImageUrl: css.bgImageEnabled ? css.bgImageUrl : "",
    bgImageOpacity: css.bgImageOpacity,
    logoUrl: css.logoUrl,
  };
}

export default function WalletPage() {
  const router = useRouter();

  const [ownerId, setOwnerId] = useState<string>("");
  const [cards, setCards] = useState<FirestoreCard[]>([]);
  const [templatesByStore, setTemplatesByStore] = useState<Record<string, CardTemplate>>({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>("");

  const canFetch = useMemo(() => ownerId.trim().length > 0, [ownerId]);

  const fetchTemplatesForStores = useCallback(async (storeIds: string[]) => {
    const uniq = Array.from(new Set(storeIds.filter(Boolean)));
    if (uniq.length === 0) return;

    const entries = await Promise.all(
      uniq.map(async (storeId) => {
        try {
          const res = await fetch(`/api/stores/${encodeURIComponent(storeId)}`, { cache: "no-store" });
          if (!res.ok) return [storeId, null] as const;
          const data = await res.json();
          const tpl = data?.cardTemplate || data?.store?.cardTemplate || data?.data?.cardTemplate || null;
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
    if (!canFetch) return;
    setLoading(true);
    setError("");

    try {
      const res = await fetch(`/api/cards?ownerId=${encodeURIComponent(ownerId)}`, {
        method: "GET",
        cache: "no-store",
      });

      if (!res.ok) {
        const txt = await res.text().catch(() => "");
        throw new Error(`GET /api/cards failed (${res.status}) ${txt}`);
      }

      const data = await res.json();
      const list: any[] = Array.isArray(data) ? data : Array.isArray(data?.cards) ? data.cards : [];

      const normalized: FirestoreCard[] = list.map((c) => ({
        id: String(c.id ?? c.cardId ?? ""),
        storeId: String(c.storeId ?? ""),
        ownerId: String(c.ownerId ?? ""),
        stamps: Number(c.stamps ?? 0),
        goal: Number(c.goal ?? 10),
        status: (c.status === "reward" ? "reward" : "active") as "active" | "reward",
        rewardAvailable: Boolean(c.rewardAvailable ?? c.status === "reward"),
        rewardsUsed: typeof c.rewardsUsed === "number" ? c.rewardsUsed : undefined,
        sourceToken: typeof c.sourceToken === "string" ? c.sourceToken : undefined,
        createdAt: c.createdAt,
        updatedAt: c.updatedAt,
      }));

      normalized.sort((a, b) => {
        const sa = a.status === "reward" ? 0 : 1;
        const sb = b.status === "reward" ? 0 : 1;
        if (sa !== sb) return sa - sb;
        return String(b.updatedAt ?? b.createdAt ?? "").localeCompare(String(a.updatedAt ?? a.createdAt ?? ""));
      });

      setCards(normalized);

      // charge templates des stores visibles
      fetchTemplatesForStores(normalized.map((c) => c.storeId));
    } catch (e: any) {
      setError(e?.message ?? "Unknown error");
      setCards([]);
    } finally {
      setLoading(false);
    }
  }, [ownerId, canFetch, fetchTemplatesForStores]);

  useEffect(() => {
    const id = getOrCreateOwnerId();
    setOwnerId(id);
  }, []);

  useEffect(() => {
    if (!canFetch) return;

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
  }, [canFetch, fetchCards]);

  return (
    <main style={{ padding: 24, fontFamily: "Arial", maxWidth: 820, margin: "0 auto" }}>
      <h1 style={{ fontSize: 28, marginBottom: 12 }}>My fidelity wallet</h1>

      <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginBottom: 10 }}>
        <button onClick={() => router.push("/wallet/scan")}>Scan store QR</button>
        <button onClick={fetchCards} disabled={!canFetch || loading}>
          {loading ? "Refreshing..." : "Refresh"}
        </button>
      </div>

      <div style={{ fontSize: 12, opacity: 0.7, marginBottom: 16 }}>
        ownerId: <span style={{ fontFamily: "monospace" }}>{ownerId || "…"}</span>
      </div>

      {error ? (
        <div style={{ border: "1px solid #f2c0c0", background: "#fff5f5", padding: 12, borderRadius: 10 }}>
          <div style={{ fontWeight: 700, marginBottom: 6 }}>Error</div>
          <div style={{ fontFamily: "monospace", whiteSpace: "pre-wrap" }}>{error}</div>
        </div>
      ) : null}

      {!loading && cards.length === 0 ? (
        <p style={{ opacity: 0.7 }}>No cards yet.</p>
      ) : (
        <div style={{ display: "grid", gap: 14 }}>
          {cards.map((c) => {
            const tpl = templatesByStore[c.storeId];
            const css = templateToCss(tpl);

            const canvasTpl = templateToCardCanvasTemplate(css);
            const titleToShow = canvasTpl.title || c.storeId;

            return (
              <button
                key={c.id}
                onClick={() => router.push(`/wallet/card/${encodeURIComponent(c.id)}`)}
                style={{
                  textAlign: "left",
                  border: "0",
                  padding: 0,
                  background: "transparent",
                  cursor: "pointer",
                }}
              >
                <div
                  style={{
                    borderRadius: 22,
                    overflow: "hidden",
                    boxShadow: "0 12px 35px rgba(0,0,0,0.25)",
                    border: "1px solid rgba(255,255,255,0.08)",
                  }}
                >
                  {/* ✅ La mini-card est maintenant un canvas 420x220 scalé automatiquement */}
                  <CardCanvas
                    template={{
                      ...canvasTpl,
                      title: titleToShow,
                      scoreText: `${c.stamps}/${c.goal}`,
                    }}
                  />

                  {/* (optionnel) petite ligne info sous la carte */}
                  <div style={{ padding: "10px 12px", background: "rgba(0,0,0,0.02)" }}>
                    <div style={{ fontSize: 13, opacity: 0.9 }}>Status: {c.status}</div>
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      )}
    </main>
  );
}