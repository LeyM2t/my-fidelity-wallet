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

function getOrCreateOwnerId(): string {
  // On garde un identifiant client stable (non-auth) côté navigateur.
  // C’est nécessaire tant qu’on n’a pas de système de récupération / login client.
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
    // Si localStorage indispo (rare), on génère un id en mémoire (non persistant).
    return `owner_${Math.random().toString(16).slice(2)}_${Date.now()}`;
  }
}

export default function WalletPage() {
  const router = useRouter();

  const [ownerId, setOwnerId] = useState<string>("");
  const [cards, setCards] = useState<FirestoreCard[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>("");

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

      // On tolère plusieurs formats de réponse pour éviter de casser si ton API renvoie {cards:[...]}
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

      // tri simple: rewards d’abord puis actives, puis plus récentes (si possible)
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

  useEffect(() => {
    // init ownerId côté client
    const id = getOrCreateOwnerId();
    setOwnerId(id);
  }, []);

  useEffect(() => {
    if (!canFetch) return;

    // 1) initial
    fetchCards();

    // 2) refresh quand l’app revient au premier plan (PWA/mobile)
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
          {cards.map((c) => (
            <div
              key={c.id}
              style={{
                border: "1px solid #ddd",
                borderRadius: 12,
                padding: 12,
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", gap: 12 }}>
                <div>
                  <div style={{ fontWeight: 700 }}>Store: {c.storeId}</div>
                  <div style={{ opacity: 0.8, fontSize: 13 }}>Status: {c.status}</div>
                </div>

                <div style={{ textAlign: "right" }}>
                  <div style={{ fontSize: 20, fontWeight: 800 }}>
                    {c.stamps}/{c.goal}
                  </div>
                  <div style={{ fontSize: 13, opacity: 0.8 }}>
                    Reward: {c.status === "reward" || c.rewardAvailable ? "READY" : "—"}
                  </div>
                </div>
              </div>

              <div style={{ marginTop: 10, display: "flex", gap: 10, flexWrap: "wrap" }}>
                <button onClick={() => router.push(`/wallet/card?id=${encodeURIComponent(c.id)}`)}>Open</button>
              </div>
            </div>
          ))}
        </div>
      )}
    </main>
  );
}
