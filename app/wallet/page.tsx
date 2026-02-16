"use client";

import { useEffect, useMemo, useState } from "react";
import { QRCodeCanvas } from "qrcode.react";

type FirestoreCard = {
  id: string;
  storeId?: string;
  ownerId?: string;
  stamps?: number;
  goal?: number;
  status?: "active" | "reward" | string;
};

type StoreDoc = {
  name: string;
  cardTemplate?: {
    bg?: string;
    fg?: string;
    accent?: string;
  };
};

function isNonEmptyString(v: unknown): v is string {
  return typeof v === "string" && v.trim().length > 0;
}

async function getJson<T>(url: string): Promise<T> {
  const res = await fetch(url, { cache: "no-store" });
  const text = await res.text();
  let json: any = null;
  try {
    json = text ? JSON.parse(text) : null;
  } catch {}
  if (!res.ok) {
    const msg = json?.error || json?.message || text || `HTTP ${res.status}`;
    throw new Error(msg);
  }
  return json as T;
}

async function postJson<T>(url: string, body: any): Promise<T> {
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  const text = await res.text();
  let json: any = null;
  try {
    json = text ? JSON.parse(text) : null;
  } catch {}
  if (!res.ok) {
    const msg = json?.error || json?.message || text || `HTTP ${res.status}`;
    throw new Error(msg);
  }
  return json as T;
}

function shortId(id: string) {
  if (!id) return "—";
  return id.length <= 10 ? id : `${id.slice(0, 6)}…${id.slice(-4)}`;
}

/** Normalize status coming from Firestore/API */
function normalizeStatus(s: unknown): "active" | "reward" | "other" {
  if (typeof s !== "string" || s.trim() === "") return "active"; // default
  const v = s.trim().toLowerCase();
  if (v === "active") return "active";
  if (v === "reward") return "reward";
  return "other";
}

export default function WalletPage() {
  const [ownerId, setOwnerId] = useState<string>("");
  const [cards, setCards] = useState<FirestoreCard[]>([]);
  const [stores, setStores] = useState<Record<string, StoreDoc>>({});
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<string>("");

  const [qrCard, setQrCard] = useState<FirestoreCard | null>(null);

  const [confirmReward, setConfirmReward] = useState<FirestoreCard | null>(null);
  const [consuming, setConsuming] = useState(false);

  const canSync = useMemo(() => isNonEmptyString(ownerId), [ownerId]);

  useEffect(() => {
    const saved = localStorage.getItem("dev_ownerId");
    if (saved) setOwnerId(saved);
  }, []);

  useEffect(() => {
    if (ownerId) localStorage.setItem("dev_ownerId", ownerId);
  }, [ownerId]);

  async function syncFromServer() {
    if (!canSync) {
      setStatus("❌ ownerId manquant");
      return;
    }
    setLoading(true);
    setStatus("⏳ Sync Firestore...");
    try {
      const out = await getJson<{ cards: FirestoreCard[] }>(
        `/api/cards?ownerId=${encodeURIComponent(ownerId)}`
      );
      const list = Array.isArray(out?.cards) ? out.cards : [];
      setCards(list);

      const ids = Array.from(
        new Set(
          list
            .map((c) => c.storeId)
            .filter((x): x is string => typeof x === "string" && x.length > 0)
        )
      );

      if (ids.length === 0) {
        setStores({});
        setStatus(`✅ Sync OK — ${list.length} carte(s)`);
        return;
      }

      const storesMap = await getJson<Record<string, StoreDoc>>(
        `/api/stores?ids=${encodeURIComponent(ids.join(","))}`
      );
      setStores(storesMap || {});

      setStatus(`✅ Sync OK — ${list.length} carte(s)`);
    } catch (e: any) {
      setStatus(`❌ Sync erreur: ${String(e?.message ?? e)}`);
    } finally {
      setLoading(false);
    }
  }

  // Sync initial
  useEffect(() => {
    if (!canSync) return;
    syncFromServer();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [canSync]);

  // ✅ AUTO-REFRESH quand on revient sur l'onglet / la page
  useEffect(() => {
    if (!canSync) return;

    const onFocus = () => {
      syncFromServer();
    };

    const onVisibility = () => {
      if (document.visibilityState === "visible") {
        syncFromServer();
      }
    };

    window.addEventListener("focus", onFocus);
    document.addEventListener("visibilitychange", onVisibility);

    return () => {
      window.removeEventListener("focus", onFocus);
      document.removeEventListener("visibilitychange", onVisibility);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [canSync]);

  const sortedCards = useMemo(() => {
    const visible = [...cards].filter((c) => {
      const st = normalizeStatus(c.status);
      return st === "active" || st === "reward";
    });

    return visible.sort((a, b) => {
      const sa = normalizeStatus(a.status);
      const sb = normalizeStatus(b.status);
      if (sa === "reward" && sb !== "reward") return -1;
      if (sa !== "reward" && sb === "reward") return 1;
      return 0;
    });
  }, [cards]);

  function getQrPayload(card: FirestoreCard) {
    return JSON.stringify({
      storeId: card.storeId,
      ownerId,
      cardId: card.id,
    });
  }

  function onCardClick(card: FirestoreCard) {
    const st = normalizeStatus(card.status);

    if (st === "active") {
      if (!card.storeId) {
        setStatus("❌ Impossible d'afficher le QR : storeId manquant sur la carte active");
        return;
      }
      setQrCard(card);
      return;
    }

    if (st === "reward") {
      setConfirmReward(card);
      return;
    }
  }

  async function consumeConfirmedReward() {
    if (!confirmReward) return;
    if (!confirmReward.storeId) {
      setStatus("❌ Impossible de consommer: storeId manquant");
      setConfirmReward(null);
      return;
    }

    setConsuming(true);
    setStatus("⏳ Consommation récompense...");
    try {
      const out = await postJson<{ ok: boolean; deleted?: boolean; alreadyGone?: boolean }>(
        "/api/consumeReward",
        {
          storeId: confirmReward.storeId,
          ownerId,
          cardId: confirmReward.id,
        }
      );

      setStatus(
        `✅ Récompense ${
          out.deleted ? "consommée (supprimée)" : out.alreadyGone ? "déjà consommée" : "OK"
        }`
      );

      setConfirmReward(null);
      await syncFromServer();
    } catch (e: any) {
      setStatus(`❌ Consume erreur: ${String(e?.message ?? e)}`);
    } finally {
      setConsuming(false);
    }
  }

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") {
        setQrCard(null);
        setConfirmReward(null);
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  return (
    <main style={{ padding: 24, fontFamily: "Arial", maxWidth: 980, margin: "0 auto" }}>
      <h1 style={{ fontSize: 28, marginBottom: 12 }}>Wallet (client)</h1>

      <div style={{ padding: 14, border: "1px solid #eee", borderRadius: 12, marginBottom: 16 }}>
        <div style={{ fontSize: 13, color: "#666", marginBottom: 6 }}>Mode dev : choisis un ownerId</div>

        <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
          <input
            value={ownerId}
            onChange={(e) => setOwnerId(e.target.value)}
            placeholder='ex: "client_1"'
            style={{
              padding: "10px 12px",
              borderRadius: 10,
              border: "1px solid #ddd",
              minWidth: 240,
            }}
          />

          <button
            onClick={syncFromServer}
            disabled={!canSync || loading}
            style={{
              padding: "10px 14px",
              borderRadius: 10,
              border: "1px solid #ddd",
              cursor: !canSync || loading ? "not-allowed" : "pointer",
            }}
          >
            Rafraîchir
          </button>

          <span style={{ fontSize: 13 }}>
            Statut : <b>{status || "—"}</b>
          </span>
        </div>
      </div>

      <h2 style={{ fontSize: 18, marginBottom: 10 }}>Cartes</h2>

      {sortedCards.length === 0 ? (
        <div style={{ padding: 14, border: "1px dashed #ddd", borderRadius: 12 }}>Aucune carte.</div>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          {sortedCards.map((c) => {
            const stamps = typeof c.stamps === "number" ? c.stamps : 0;
            const goal = typeof c.goal === "number" ? c.goal : 10;

            const st = normalizeStatus(c.status);
            const isReward = st === "reward";

            const store = c.storeId ? stores[c.storeId] : undefined;
            const title = store?.name || (c.storeId ? c.storeId : "Commerce");

            const bg = store?.cardTemplate?.bg || (isReward ? "#e8f5e9" : "#fff");
            const fg = store?.cardTemplate?.fg || "#111";
            const accent = store?.cardTemplate?.accent || (isReward ? "#4caf50" : "#999");

            return (
              <button
                key={c.id}
                onClick={() => onCardClick(c)}
                style={{
                  textAlign: "left",
                  padding: 14,
                  borderRadius: 12,
                  border: `2px solid ${accent}`,
                  background: bg,
                  color: fg,
                  cursor: "pointer",
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", gap: 10 }}>
                  <div style={{ fontWeight: 800 }}>{title}</div>
                  <div style={{ fontSize: 12, opacity: 0.85, textAlign: "right" }}>
                    {isReward ? "🎁 Reward" : "🟢 Active"}
                  </div>
                </div>

                <div style={{ marginTop: 10 }}>
                  Tampons : <b>{stamps}</b> / {goal}
                </div>

                <div style={{ fontSize: 12, opacity: 0.85, marginTop: 6 }}>ID : {shortId(c.id)}</div>

                <div style={{ marginTop: 10, fontSize: 12, opacity: 0.85 }}>
                  {isReward ? "Clique pour consommer (confirmation ensuite)" : "Clique pour afficher le QR"}
                </div>

                {c.storeId ? (
                  <div style={{ marginTop: 8, fontSize: 12, opacity: 0.65 }}>storeId: {c.storeId}</div>
                ) : null}
              </button>
            );
          })}
        </div>
      )}

      {/* QR FULLSCREEN (active uniquement) */}
      {qrCard && qrCard.storeId && (
        <div
          onClick={() => setQrCard(null)}
          style={{
            position: "fixed",
            inset: 0,
            background: (() => {
              const s = stores[qrCard.storeId!];
              return s?.cardTemplate?.bg || "rgba(0,0,0,0.85)";
            })(),
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 9999,
            padding: 16,
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              width: "min(560px, 92vw)",
              borderRadius: 18,
              padding: 18,
              border: "1px solid rgba(255,255,255,0.18)",
              background: "rgba(0,0,0,0.18)",
              backdropFilter: "blur(6px)",
              color: (() => {
                const s = stores[qrCard.storeId!];
                return s?.cardTemplate?.fg || "#fff";
              })(),
              textAlign: "center",
            }}
          >
            {(() => {
              const s = stores[qrCard.storeId!];
              const name = s?.name || qrCard.storeId;
              const accent = s?.cardTemplate?.accent || "#60a5fa";
              const fg = s?.cardTemplate?.fg || "#fff";

              return (
                <>
                  <div style={{ fontWeight: 900, fontSize: 18, marginBottom: 6 }}>{name}</div>

                  <div style={{ fontSize: 13, opacity: 0.9, marginBottom: 10 }}>
                    Carte active {qrCard.stamps ?? 0}/{qrCard.goal ?? 10} — {shortId(qrCard.id)}
                  </div>

                  <div
                    style={{
                      height: 3,
                      width: 72,
                      margin: "0 auto 14px",
                      borderRadius: 999,
                      background: accent,
                    }}
                  />

                  <div style={{ display: "flex", justifyContent: "center" }}>
                    <div
                      style={{
                        padding: 14,
                        borderRadius: 16,
                        background: "#fff",
                        border: "1px solid rgba(0,0,0,0.12)",
                      }}
                    >
                      <QRCodeCanvas value={getQrPayload(qrCard)} size={360} />
                    </div>
                  </div>

                  <div
                    style={{
                      marginTop: 14,
                      display: "flex",
                      gap: 10,
                      justifyContent: "center",
                      flexWrap: "wrap",
                    }}
                  >
                    <button
                      onClick={() => setQrCard(null)}
                      style={{
                        padding: "10px 14px",
                        borderRadius: 12,
                        border: `1px solid ${accent}`,
                        background: accent,
                        color: fg,
                        cursor: "pointer",
                        fontWeight: 700,
                      }}
                    >
                      Fermer
                    </button>

                    <div style={{ fontSize: 12, opacity: 0.9, alignSelf: "center" }}>
                      (Clique dehors ou <b>ESC</b>)
                    </div>
                  </div>
                </>
              );
            })()}
          </div>
        </div>
      )}

      {/* CONFIRMATION REWARD */}
      {confirmReward && (
        <div
          onClick={() => (consuming ? null : setConfirmReward(null))}
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.6)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 9999,
            padding: 16,
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              background: "#fff",
              borderRadius: 16,
              padding: 18,
              width: "min(520px, 92vw)",
            }}
          >
            <div style={{ fontWeight: 700, marginBottom: 8 }}>Confirmer la consommation</div>
            <div style={{ fontSize: 13, color: "#444" }}>
              Tu es sur le point de consommer une récompense (elle sera supprimée).
            </div>

            <div style={{ fontSize: 12, color: "#666", marginTop: 10 }}>
              {(() => {
                const store = confirmReward.storeId ? stores[confirmReward.storeId] : undefined;
                const title = store?.name || confirmReward.storeId || "Commerce";
                return (
                  <>
                    commerce: <b>{title}</b> — reward — ID: <b>{shortId(confirmReward.id)}</b>
                  </>
                );
              })()}
            </div>

            <div
              style={{
                marginTop: 14,
                display: "flex",
                gap: 10,
                justifyContent: "flex-end",
                flexWrap: "wrap",
              }}
            >
              <button
                onClick={() => setConfirmReward(null)}
                disabled={consuming}
                style={{
                  padding: "10px 14px",
                  borderRadius: 10,
                  border: "1px solid #ddd",
                  cursor: consuming ? "not-allowed" : "pointer",
                }}
              >
                Annuler
              </button>

              <button
                onClick={consumeConfirmedReward}
                disabled={consuming}
                style={{
                  padding: "10px 14px",
                  borderRadius: 10,
                  border: "1px solid #ddd",
                  cursor: consuming ? "not-allowed" : "pointer",
                }}
              >
                {consuming ? "Consommation..." : "Confirmer"}
              </button>
            </div>

            <div style={{ marginTop: 10, fontSize: 12, color: "#666" }}>
              Astuce : tu peux fermer avec <b>ESC</b>.
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
