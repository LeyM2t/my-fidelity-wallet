"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

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
  textColor?: string;

  // ton modèle Firestore
  bgColor?: string;
  bgType?: "solid" | "gradient" | string;
  gradient?: { from?: string; to?: string; angle?: number };

  bgImageEnabled?: boolean;
  bgImageUrl?: string;
  bgImageOpacity?: number;

  logoUrl?: string;

  // ton champ "font" (ex: "inter")
  font?: string;
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

function fontToCss(font?: string) {
  const f = (font || "").toLowerCase().trim();
  if (!f) return "system-ui, -apple-system, Segoe UI, Roboto, Arial";
  if (f.includes("inter")) return "Inter, system-ui, -apple-system, Segoe UI, Roboto, Arial";
  if (f.includes("oswald")) return "Oswald, system-ui, -apple-system, Segoe UI, Roboto, Arial";
  if (f.includes("poppins")) return "Poppins, system-ui, -apple-system, Segoe UI, Roboto, Arial";
  return "system-ui, -apple-system, Segoe UI, Roboto, Arial";
}

export default function WalletPage() {
  const router = useRouter();

  const [ownerId, setOwnerId] = useState<string>("");
  const [cards, setCards] = useState<FirestoreCard[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>("");

  // cache templates par storeId
  const [templates, setTemplates] = useState<Record<string, CardTemplate | null | undefined>>({});

  const canFetch = useMemo(() => ownerId.trim().length > 0, [ownerId]);

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
    } catch (e: any) {
      setError(e?.message ?? "Unknown error");
      setCards([]);
    } finally {
      setLoading(false);
    }
  }, [ownerId, canFetch]);

  // fetch templates (quand on a des cartes)
  useEffect(() => {
    const storeIds = Array.from(new Set(cards.map((c) => c.storeId).filter(Boolean)));
    const toFetch = storeIds.filter((id) => !(id in templates));

    if (toFetch.length === 0) return;

    let cancelled = false;

    async function run() {
      for (const storeId of toFetch) {
        try {
          const res = await fetch(`/api/stores/${encodeURIComponent(storeId)}`, { cache: "no-store" });
          if (!res.ok) {
            if (!cancelled) setTemplates((prev) => ({ ...prev, [storeId]: null }));
            continue;
          }
          const data = await res.json();
          const tpl =
            data?.cardTemplate ||
            data?.store?.cardTemplate ||
            data?.data?.cardTemplate ||
            null;

          if (!cancelled) setTemplates((prev) => ({ ...prev, [storeId]: (tpl || null) as CardTemplate | null }));
        } catch {
          if (!cancelled) setTemplates((prev) => ({ ...prev, [storeId]: null }));
        }
      }
    }

    run();

    return () => {
      cancelled = true;
    };
  }, [cards, templates]);

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

  function renderMiniCard(c: FirestoreCard) {
    const tpl = templates[c.storeId] || null;

    const title = tpl?.title || c.storeId;
    const textColor = tpl?.textColor || "#ffffff";
    const fontFamily = fontToCss(tpl?.font);

    const bgColor = tpl?.bgColor || "#111827";
    const bgImageEnabled = Boolean(tpl?.bgImageEnabled && tpl?.bgImageUrl);
    const bgImageUrl = bgImageEnabled ? String(tpl?.bgImageUrl) : "";
    const bgImageOpacity =
      typeof tpl?.bgImageOpacity === "number" ? tpl!.bgImageOpacity : 0.6;

    const logoUrl = tpl?.logoUrl || "";

    // si un jour tu utilises gradient
    const gradientFrom = tpl?.gradient?.from;
    const gradientTo = tpl?.gradient?.to;
    const gradientAngle = typeof tpl?.gradient?.angle === "number" ? tpl!.gradient!.angle : 45;
    const gradientCss =
      gradientFrom && gradientTo
        ? `linear-gradient(${gradientAngle}deg, ${gradientFrom}, ${gradientTo})`
        : "";

    const overlayBg =
      tpl?.bgType === "gradient" && gradientCss ? gradientCss : bgColor;

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
            position: "relative",
            borderRadius: 18,
            overflow: "hidden",
            minHeight: 130,
            boxShadow: "0 10px 26px rgba(0,0,0,0.18)",
          }}
        >
          {/* BG image */}
          {bgImageUrl ? (
            <div
              style={{
                position: "absolute",
                inset: 0,
                backgroundImage: `url(${bgImageUrl})`,
                backgroundSize: "cover",
                backgroundPosition: "center",
                transform: "scale(1.02)",
              }}
            />
          ) : null}

          {/* Overlay */}
          <div
            style={{
              position: "absolute",
              inset: 0,
              background: overlayBg,
              opacity: bgImageUrl ? bgImageOpacity : 1,
            }}
          />

          {/* Content */}
          <div
            style={{
              position: "relative",
              padding: 16,
              color: textColor,
              fontFamily,
              display: "flex",
              gap: 14,
              alignItems: "center",
              justifyContent: "space-between",
            }}
          >
            <div style={{ display: "flex", gap: 12, alignItems: "center", minWidth: 0 }}>
              {logoUrl ? (
                <div
                  style={{
                    width: 56,
                    height: 56,
                    borderRadius: 14,
                    background: "rgba(255,255,255,0.18)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    overflow: "hidden",
                    flex: "0 0 auto",
                  }}
                >
                  <img
                    src={logoUrl}
                    alt="logo"
                    style={{ width: "88%", height: "88%", objectFit: "contain" }}
                  />
                </div>
              ) : null}

              <div style={{ minWidth: 0 }}>
                <div style={{ fontSize: 22, fontWeight: 800, lineHeight: 1.1, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                  {title}
                </div>
                <div style={{ marginTop: 6, fontSize: 13, opacity: 0.9 }}>
                  Status: {c.status}
                </div>
              </div>
            </div>

            <div style={{ textAlign: "right", flex: "0 0 auto" }}>
              <div style={{ fontSize: 22, fontWeight: 900 }}>
                {c.stamps}/{c.goal}
              </div>
              <div style={{ fontSize: 13, opacity: 0.9 }}>
                Reward: {c.status === "reward" || c.rewardAvailable ? "READY" : "—"}
              </div>
            </div>
          </div>
        </div>
      </button>
    );
  }

  return (
    <main style={{ padding: 24, fontFamily: "Arial", maxWidth: 720, margin: "0 auto" }}>
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
          {cards.map((c) => renderMiniCard(c))}
        </div>
      )}
    </main>
  );
}