"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import QrScanner from "qr-scanner";

type ClientPayload = {
  storeId: string;
  ownerId: string;
  cardId?: string;
};

function safeJsonParse(raw: string): any | null {
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

function parseClientPayload(raw: string): ClientPayload | null {
  const obj = safeJsonParse(raw);
  if (!obj || typeof obj !== "object") return null;

  const storeId = (obj as any).storeId;
  const ownerId = (obj as any).ownerId ?? (obj as any).customerId;
  const cardId = (obj as any).cardId;

  if (typeof storeId !== "string" || !storeId) return null;
  if (typeof ownerId !== "string" || !ownerId) return null;

  return {
    storeId,
    ownerId,
    cardId: typeof cardId === "string" ? cardId : undefined,
  };
}

function getScanSecret(storeId: string) {
  try {
    return localStorage.getItem(`fw_scanSecret_${storeId}`) || "";
  } catch {
    return "";
  }
}

function setScanSecret(storeId: string, value: string) {
  try {
    localStorage.setItem(`fw_scanSecret_${storeId}`, value);
  } catch {}
}

export default function ScanPage() {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const scannerRef = useRef<QrScanner | null>(null);

  const [raw, setRaw] = useState("");
  const [payload, setPayload] = useState<ClientPayload | null>(null);

  const [currentCardId, setCurrentCardId] = useState<string | null>(null);

  const [scanSecret, setScanSecretState] = useState<string>("");

  const [status, setStatus] = useState<string>("");
  const [busy, setBusy] = useState(false);

  const isDev = process.env.NODE_ENV !== "production";

  async function postJson<T>(url: string, body: any, headersExtra?: Record<string, string>): Promise<T> {
    const headers: Record<string, string> = { "Content-Type": "application/json" };
    if (headersExtra) {
      for (const [k, v] of Object.entries(headersExtra)) headers[k] = v;
    }

    const res = await fetch(url, {
      method: "POST",
      headers,
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

  async function getJson<T>(url: string): Promise<T> {
    const res = await fetch(url);
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

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const scanner = new QrScanner(
      video,
      (result) => {
        const txt = typeof result === "string" ? result : result?.data;
        if (!txt) return;

        setRaw(txt);

        const p = parseClientPayload(txt);
        setPayload(p);

        if (p?.cardId) setCurrentCardId(p.cardId);

        if (p?.storeId) {
          // charger le secret mémorisé pour ce store
          setScanSecretState(getScanSecret(p.storeId));
        }

        setStatus(p ? "✅ QR client reconnu" : "⚠️ QR non reconnu (JSON attendu)");
      },
      { highlightScanRegion: true, highlightCodeOutline: true }
    );

    scannerRef.current = scanner;

    scanner.start().catch((e) => {
      setStatus(`❌ Caméra: ${String(e?.message ?? e)}`);
    });

    return () => {
      scanner.stop();
      scanner.destroy();
      scannerRef.current = null;
    };
  }, []);

  const manualParsed = useMemo(() => parseClientPayload(raw), [raw]);

  useEffect(() => {
    if (!raw) {
      setPayload(null);
      return;
    }
    setPayload(manualParsed);
    if (manualParsed?.cardId) setCurrentCardId(manualParsed.cardId);

    if (manualParsed?.storeId) {
      setScanSecretState(getScanSecret(manualParsed.storeId));
    }
  }, [raw, manualParsed]);

  function buildScanSecretHeader(storeId: string) {
    const v = scanSecret.trim();
    if (!v) return {};
    // header seulement si l'utilisateur l'a renseigné
    return { "x-scan-secret": v };
  }

  async function doEarn(add: number) {
    if (!payload) return setStatus("❌ Pas de payload client (scanne un QR ou colle un JSON).");
    if (!currentCardId) return setStatus("❌ cardId manquant. Fais dev-create-card ou colle un JSON avec cardId.");

    setBusy(true);
    setStatus("⏳ Earn en cours...");
    try {
      const out = await postJson<{
        ok: boolean;
        stamps: number;
        goal: number;
        rewardAvailable: boolean;
        rolledOver?: boolean;
        activeCardId?: string;
        rewardCardId?: string | null;
        surplus?: number;
        createdRewardIds?: string[];
      }>(
        "/api/addStamps",
        {
          storeId: payload.storeId,
          ownerId: payload.ownerId,
          cardId: currentCardId,
          add,
        },
        buildScanSecretHeader(payload.storeId)
      );

      // ✅ si rollover : on switch sur la nouvelle carte active
      if (out.activeCardId && out.activeCardId !== currentCardId) {
        setCurrentCardId(out.activeCardId);
      }

      if (out.rolledOver) {
        setStatus(
          `✅ Earn OK — carte reward créée (id=${out.rewardCardId}) — nouvelle active=${out.activeCardId} — surplus=${out.surplus ?? 0}`
        );
      } else {
        setStatus(
          `✅ Earn OK — stamps=${out.stamps}/${out.goal} — rewardAvailable=${out.rewardAvailable ? "OUI" : "NON"}`
        );
      }
    } catch (e: any) {
      setStatus(`❌ Earn erreur: ${String(e?.message ?? e)}`);
    } finally {
      setBusy(false);
    }
  }

  async function doConsumeReward() {
    if (!payload) return setStatus("❌ Pas de payload client (scanne un QR ou colle un JSON).");
    if (!currentCardId) return setStatus("❌ cardId manquant.");

    setBusy(true);
    setStatus("⏳ Consume reward en cours...");
    try {
      const out = await postJson<{ ok: boolean; deleted?: boolean; alreadyGone?: boolean }>(
        "/api/consumeReward",
        {
          storeId: payload.storeId,
          ownerId: payload.ownerId,
          cardId: currentCardId,
        },
        buildScanSecretHeader(payload.storeId) // optionnel si tu sécurises aussi consumeReward un jour
      );

      setStatus(
        `✅ Consume OK — ${out.deleted ? "supprimée" : out.alreadyGone ? "déjà supprimée" : "ok"}`
      );
    } catch (e: any) {
      setStatus(`❌ Consume erreur: ${String(e?.message ?? e)}`);
    } finally {
      setBusy(false);
    }
  }

  async function doDevCreateCard() {
    if (!payload) return setStatus("❌ Pas de payload client.");

    setBusy(true);
    setStatus("⏳ Création carte test...");
    try {
      const out = await getJson<any>(
        `/api/dev-create-card?ownerId=${encodeURIComponent(payload.ownerId)}&storeId=${encodeURIComponent(
          payload.storeId
        )}`
      );

      const newCardId = out?.cardId;
      if (typeof newCardId === "string" && newCardId) {
        setCurrentCardId(newCardId);
        setStatus(`✅ Carte créée — cardId=${newCardId}`);
      } else {
        setStatus(`⚠️ Créée mais cardId non reçu — ${JSON.stringify(out)}`);
      }
    } catch (e: any) {
      setStatus(`❌ dev-create-card erreur: ${String(e?.message ?? e)}`);
    } finally {
      setBusy(false);
    }
  }

  return (
    <main style={{ padding: 24, fontFamily: "Arial", maxWidth: 820, margin: "0 auto" }}>
      <h1 style={{ fontSize: 28, marginBottom: 10 }}>Scan (commerçant)</h1>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
        <div>
          <div style={{ border: "1px solid #ddd", borderRadius: 12, overflow: "hidden" }}>
            <video ref={videoRef} style={{ width: "100%", height: 360, objectFit: "cover" }} />
          </div>

          <p style={{ marginTop: 10, color: "#444" }}>
            Statut : <b>{status || "—"}</b>
          </p>

          {(payload || currentCardId) && (
            <div style={{ padding: 12, border: "1px solid #eee", borderRadius: 12 }}>
              <div style={{ fontSize: 12, color: "#666", marginBottom: 6 }}>Contexte courant</div>
              <pre style={{ margin: 0, fontSize: 12, whiteSpace: "pre-wrap" }}>
                {JSON.stringify({ payload, currentCardId }, null, 2)}
              </pre>
            </div>
          )}
        </div>

        <div>
          <div style={{ padding: 12, border: "1px solid #eee", borderRadius: 12 }}>
            <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 8 }}>Sécurité (V2)</div>

            <label style={{ display: "block", fontSize: 12, color: "#555" }}>
              Scan secret (stocké sur ce device)
              <input
                value={scanSecret}
                onChange={(e) => {
                  const v = e.target.value;
                  setScanSecretState(v);
                  if (payload?.storeId) setScanSecret(payload.storeId, v);
                }}
                placeholder="ex: GYCrepe-2026-Secret!"
                style={{
                  display: "block",
                  width: "100%",
                  padding: 10,
                  borderRadius: 10,
                  border: "1px solid #ddd",
                  marginTop: 6,
                }}
              />
            </label>

            <p style={{ marginTop: 8, fontSize: 12, color: "#666" }}>
              Mode compat : si <code>stores/{`{storeId}`}.scanSecret</code> n’existe pas, ça passe.  
              Si il existe, il faut que ce champ corresponde au header <code>x-scan-secret</code>.
            </p>

            <hr style={{ margin: "14px 0" }} />

            <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 8 }}>Actions (serveur)</div>

            <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
              <button
                onClick={() => doEarn(1)}
                disabled={busy}
                style={{
                  padding: "10px 14px",
                  borderRadius: 10,
                  border: "1px solid #ddd",
                  cursor: busy ? "not-allowed" : "pointer",
                }}
              >
                +1 tampon (earn)
              </button>

              <button
                onClick={doConsumeReward}
                disabled={busy}
                style={{
                  padding: "10px 14px",
                  borderRadius: 10,
                  border: "1px solid #ddd",
                  cursor: busy ? "not-allowed" : "pointer",
                }}
              >
                Consommer récompense (reward)
              </button>
            </div>

            {isDev && (
              <>
                <hr style={{ margin: "14px 0" }} />
                <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 8 }}>DEV (sans téléphone)</div>

                <textarea
                  value={raw}
                  onChange={(e) => setRaw(e.target.value)}
                  placeholder={`Colle ici un JSON client, ex:
{"storeId":"store_1","ownerId":"client_1","cardId":"..."}`
                  }
                  style={{
                    width: "100%",
                    minHeight: 120,
                    borderRadius: 10,
                    border: "1px solid #ddd",
                    padding: 10,
                    fontFamily: "monospace",
                    fontSize: 12,
                  }}
                />

                <div style={{ display: "flex", gap: 10, marginTop: 10, flexWrap: "wrap" }}>
                  <button
                    onClick={doDevCreateCard}
                    disabled={busy}
                    style={{
                      padding: "10px 14px",
                      borderRadius: 10,
                      border: "1px solid #ddd",
                      cursor: busy ? "not-allowed" : "pointer",
                    }}
                  >
                    dev-create-card (ownerId)
                  </button>

                  <button
                    onClick={() => {
                      setRaw("");
                      setPayload(null);
                      setCurrentCardId(null);
                      setStatus("—");
                    }}
                    disabled={busy}
                    style={{
                      padding: "10px 14px",
                      borderRadius: 10,
                      border: "1px solid #ddd",
                      cursor: busy ? "not-allowed" : "pointer",
                    }}
                  >
                    Reset
                  </button>
                </div>

                <p style={{ marginTop: 10, fontSize: 12, color: "#666" }}>
                  Avec V1 : à l’atteinte du goal, la carte scannée devient <b>reward</b> et le scan passe automatiquement
                  sur la nouvelle carte <b>active</b>.
                </p>
              </>
            )}
          </div>
        </div>
      </div>
    </main>
  );
}