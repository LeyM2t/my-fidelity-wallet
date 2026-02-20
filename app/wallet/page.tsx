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

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}

function canvasSizeFromTemplate(tpl?: CardTemplate | null) {
  // ton builder semble travailler sur 420x220 (d’après Firestore)
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

export default function WalletPage() {
  const router = useRouter();

  const [ownerId, setOwnerId] = useState<string>("");
  const [cards, setCards] = useState<FirestoreCard[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>("");

  // cache templates par storeId
  const [templates, setTemplates] = useState<Record<string, CardTemplate | null>>({});

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

      // charger les templates manquants (1 fetch par storeId)
      const uniqueStores = Array.from(new Set(normalized.map((c) => c.storeId).filter(Boolean)));
      const missing = uniqueStores.filter((sid) => !(sid in templates));

      if (missing.length) {
        const fetched: Record<string, CardTemplate | null> = {};
        await Promise.all(
          missing.map(async (storeId) => {
            try {
              const r = await fetch(`/api/stores/${encodeURIComponent(storeId)}`, { cache: "no-store" });
              if (!r.ok) {
                fetched[storeId] = null;
                return;
              }
              const storeData = await r.json();
              const tpl =
                storeData?.cardTemplate ||
                storeData?.store?.cardTemplate ||
                storeData?.data?.cardTemplate ||
                null;

              fetched[storeId] = tpl;
            } catch {
              fetched[storeId] = null;
            }
          })
        );

        setTemplates((prev) => ({ ...prev, ...fetched }));
      }
    } catch (e: any) {
      setError(e?.message ?? "Unknown error");
      setCards([]);
    } finally {
      setLoading(false);
    }
  }, [ownerId, canFetch, templates]);

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
        <div style={{ display: "grid", gap: 12 }}>
          {cards.map((c) => {
            const tpl = templates[c.storeId] ?? null;
            const { w, h } = canvasSizeFromTemplate(tpl);

            const bg = computeBackground(tpl);
            const textColor = tpl?.textColor || "#ffffff";
            const title = tpl?.title || c.storeId;
            const fontFamily = tpl?.font || "system-ui, -apple-system, Segoe UI, Roboto, Arial";

            const bgImageEnabled = tpl?.bgImageEnabled !== false; // default true
            const bgImageUrl = tpl?.bgImageUrl || "";
            const bgImgOpacity = clamp(typeof tpl?.bgImageOpacity === "number" ? tpl!.bgImageOpacity! : 0.75, 0, 1);

            const logoUrl = tpl?.logoUrl || "";
            const logoBox = tpl?.logoBox;

            const logoStyle =
              logoUrl && logoBox
                ? {
                    position: "absolute" as const,
                    left: `${toPct(logoBox.x, w)}%`,
                    top: `${toPct(logoBox.y, h)}%`,
                    width: `${toPct(logoBox.width, w)}%`,
                    height: `${toPct(logoBox.height, h)}%`,
                    borderRadius: 14,
                    overflow: "hidden" as const,
                    background: "rgba(255,255,255,0.18)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }
                : null;

            return (
              <button
                key={c.id}
                onClick={() => router.push(`/wallet/card/${encodeURIComponent(c.id)}`)}
                style={{
                  textAlign: "left",
                  border: "1px solid rgba(255,255,255,0.10)",
                  borderRadius: 22,
                  padding: 0,
                  background: "transparent",
                  cursor: "pointer",
                }}
              >
                {/* mini carte avec ratio proche du builder */}
                <div
                  style={{
                    position: "relative",
                    borderRadius: 22,
                    overflow: "hidden",
                    aspectRatio: `${w} / ${h}`,
                    background: bg,
                    color: textColor,
                    fontFamily,
                    boxShadow: "0 14px 40px rgba(0,0,0,0.25)",
                  }}
                >
                  {/* image de fond */}
                  {bgImageEnabled && bgImageUrl ? (
                    <div
                      style={{
                        position: "absolute",
                        inset: 0,
                        backgroundImage: `url(${bgImageUrl})`,
                        backgroundSize: "cover",
                        backgroundPosition: "center",
                        opacity: bgImgOpacity,
                      }}
                    />
                  ) : null}

                  {/* voile léger pour lisibilité */}
                  <div
                    style={{
                      position: "absolute",
                      inset: 0,
                      background: "rgba(0,0,0,0.18)",
                    }}
                  />

                  {/* logo positionné */}
                  {logoStyle ? (
                    <div style={logoStyle}>
                      <img
                        src={logoUrl}
                        alt="logo"
                        style={{ width: "90%", height: "90%", objectFit: "contain" }}
                      />
                    </div>
                  ) : null}

                  {/* texte */}
                  <div
                    style={{
                      position: "absolute",
                      left: "6%",
                      top: "18%",
                      right: "6%",
                      display: "flex",
                      justifyContent: "space-between",
                      gap: 12,
                      alignItems: "flex-start",
                    }}
                  >
                    <div style={{ minWidth: 0 }}>
                      <div style={{ fontSize: 30, fontWeight: 900, lineHeight: 1.05, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                        {title}
                      </div>
                      <div style={{ marginTop: 8, fontSize: 18, opacity: 0.9 }}>
                        Status: {c.status}
                      </div>
                    </div>

                    <div style={{ textAlign: "right" }}>
                      <div style={{ fontSize: 34, fontWeight: 900, lineHeight: 1 }}>
                        {c.stamps}/{c.goal}
                      </div>
                      <div style={{ marginTop: 8, fontSize: 18, opacity: 0.9 }}>
                        Reward: {c.status === "reward" || c.rewardAvailable ? "READY" : "—"}
                      </div>
                    </div>
                  </div>
                </div>

                {/* petit padding bas (optionnel) */}
                <div style={{ padding: 10, opacity: 0.0 }}>.</div>
              </button>
            );
          })}
        </div>
      )}
    </main>
  );
}