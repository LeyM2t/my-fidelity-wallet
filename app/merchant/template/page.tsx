"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Inter,
  Poppins,
  Playfair_Display,
  Montserrat,
  Roboto,
  Lora,
  Oswald,
  Nunito,
} from "next/font/google";

const STORE_ID = "get-your-crepe";

type CardTemplate = {
  title: string;
  bgColor: string; // hex
  textColor: string; // hex
  font: string; // on garde string (compat) mais on n’envoie que nos clés
  logoUrl?: string;
  bgImageUrl?: string;
};

const inter = Inter({ subsets: ["latin"], weight: ["400", "600", "800"] });
const poppins = Poppins({ subsets: ["latin"], weight: ["400", "600", "800"] });
const playfair = Playfair_Display({ subsets: ["latin"], weight: ["400", "600", "800"] });
const montserrat = Montserrat({ subsets: ["latin"], weight: ["400", "600", "800"] });
const roboto = Roboto({ subsets: ["latin"], weight: ["400", "700", "900"] });
const lora = Lora({ subsets: ["latin"], weight: ["400", "600", "700"] });
const oswald = Oswald({ subsets: ["latin"], weight: ["400", "600", "700"] });
const nunito = Nunito({ subsets: ["latin"], weight: ["400", "600", "800"] });

const FONT_OPTIONS = [
  { key: "inter", label: "Inter (moderne)", family: inter.style.fontFamily },
  { key: "poppins", label: "Poppins (rond)", family: poppins.style.fontFamily },
  { key: "montserrat", label: "Montserrat (pro)", family: montserrat.style.fontFamily },
  { key: "nunito", label: "Nunito (friendly)", family: nunito.style.fontFamily },
  { key: "roboto", label: "Roboto (classique)", family: roboto.style.fontFamily },
  { key: "lora", label: "Lora (lecture)", family: lora.style.fontFamily },
  { key: "playfair", label: "Playfair (élégant)", family: playfair.style.fontFamily },
  { key: "oswald", label: "Oswald (impact)", family: oswald.style.fontFamily },
] as const;

const DEFAULT: CardTemplate = {
  title: "Get Your Crêpe",
  bgColor: "#111827",
  textColor: "#ffffff",
  font: "inter",
  logoUrl: "/logo.png",
  bgImageUrl: "",
};

// palettes type “Word”
const THEME_PRESETS = [
  { name: "Noir & Blanc", bg: "#111827", text: "#ffffff", font: "inter" },
  { name: "Rouge punchy", bg: "#ff0000", text: "#ffffff", font: "oswald" },
  { name: "Bleu pro", bg: "#1d4ed8", text: "#ffffff", font: "montserrat" },
  { name: "Orange chaud", bg: "#f97316", text: "#111827", font: "poppins" },
  { name: "Vert nature", bg: "#16a34a", text: "#ffffff", font: "nunito" },
  { name: "Violet fun", bg: "#7c3aed", text: "#ffffff", font: "poppins" },
  { name: "Sable doux", bg: "#f5f5f4", text: "#111827", font: "lora" },
  { name: "Marine gold", bg: "#0b132b", text: "#facc15", font: "playfair" },
] as const;

const SWATCHES = [
  "#111827",
  "#000000",
  "#ffffff",
  "#f5f5f4",
  "#ff0000",
  "#f97316",
  "#facc15",
  "#16a34a",
  "#3b82f6",
  "#1d4ed8",
  "#7c3aed",
  "#ec4899",
] as const;

function getFontFamily(fontKey: string) {
  const found = FONT_OPTIONS.find((f) => f.key === fontKey);
  return found?.family || inter.style.fontFamily;
}

function clampHex(v: string) {
  const s = (v || "").trim();
  if (/^#[0-9a-fA-F]{6}$/.test(s)) return s.toLowerCase();
  return "";
}

export default function MerchantTemplatePage() {
  const [adminKey, setAdminKey] = useState("");
  const [tpl, setTpl] = useState<CardTemplate>(DEFAULT);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState("");
  const [err, setErr] = useState("");

  // UI helpers (sans changer le modèle)
  const [activeTab, setActiveTab] = useState<"themes" | "colors" | "fonts" | "images">("themes");

  const previewStyle = useMemo(() => {
    const fontFamily = getFontFamily(tpl.font);
    const hasBgImg = !!(tpl.bgImageUrl && tpl.bgImageUrl.trim());
    return {
      backgroundColor: tpl.bgColor,
      color: tpl.textColor,
      backgroundImage: hasBgImg ? `url(${tpl.bgImageUrl})` : undefined,
      backgroundSize: "cover",
      backgroundPosition: "center",
      fontFamily,
    } as React.CSSProperties;
  }, [tpl]);

  async function load() {
    setLoading(true);
    setErr("");
    setMsg("");
    try {
      const res = await fetch(`/api/stores/${STORE_ID}`, { cache: "no-store" });
      const data = await res.json();

      if (!res.ok) {
        setErr(data?.error || "Erreur chargement template");
        setTpl(DEFAULT);
        return;
      }

      const merged = { ...DEFAULT, ...(data?.cardTemplate || {}) };

      // garde-fous : si font inconnue, on repasse sur inter
      if (!FONT_OPTIONS.some((f) => f.key === merged.font)) merged.font = "inter";
      if (!clampHex(merged.bgColor)) merged.bgColor = DEFAULT.bgColor;
      if (!clampHex(merged.textColor)) merged.textColor = DEFAULT.textColor;

      setTpl(merged);
    } catch (e: any) {
      setErr(e?.message || "Erreur réseau");
      setTpl(DEFAULT);
    } finally {
      setLoading(false);
    }
  }

  async function save() {
    setSaving(true);
    setErr("");
    setMsg("");
    try {
      const payload: CardTemplate = {
        title: (tpl.title || "").slice(0, 40),
        bgColor: clampHex(tpl.bgColor) || DEFAULT.bgColor,
        textColor: clampHex(tpl.textColor) || DEFAULT.textColor,
        font: FONT_OPTIONS.some((f) => f.key === tpl.font) ? tpl.font : "inter",
        logoUrl: (tpl.logoUrl || "").slice(0, 500),
        bgImageUrl: (tpl.bgImageUrl || "").slice(0, 500),
      };

      const res = await fetch(`/api/stores/${STORE_ID}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          "x-merchant-admin-key": adminKey,
        },
        body: JSON.stringify({ cardTemplate: payload }),
      });

      const data = await res.json();
      if (!res.ok) {
        setErr(data?.error || "Erreur sauvegarde");
        return;
      }

      setTpl(payload); // pour être sûr d’avoir exactement ce qui est envoyé
      setMsg("Template sauvegardé ✅");
    } catch (e: any) {
      setErr(e?.message || "Erreur réseau");
    } finally {
      setSaving(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  const cardOverlayNeeded = !!(tpl.bgImageUrl && tpl.bgImageUrl.trim());

  return (
    <main style={{ padding: 24, maxWidth: 1100, margin: "0 auto", fontFamily: "Arial" }}>
      <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
        <div>
          <h1 style={{ fontSize: 28, marginBottom: 6 }}>Template carte — V2.5</h1>
          <div style={{ opacity: 0.8 }}>
            StoreId: <b>{STORE_ID}</b>
          </div>
        </div>

        <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
          <a href="/merchant" style={{ alignSelf: "center" }}>
            ← Retour merchant (QR)
          </a>
          <button onClick={load} disabled={loading} style={{ padding: "10px 14px", borderRadius: 10 }}>
            {loading ? "Chargement..." : "Reload"}
          </button>
          <button
            onClick={save}
            disabled={saving}
            style={{
              padding: "10px 14px",
              borderRadius: 10,
              background: "white",
              color: "black",
              fontWeight: 800,
              border: "1px solid #444",
            }}
          >
            {saving ? "Saving..." : "Save"}
          </button>
        </div>
      </div>

      {err ? (
        <div style={{ marginTop: 12, marginBottom: 12, color: "crimson", fontWeight: 700 }}>Erreur : {err}</div>
      ) : null}
      {msg ? (
        <div style={{ marginTop: 12, marginBottom: 12, color: "#22c55e", fontWeight: 800 }}>{msg}</div>
      ) : null}

      <div style={{ display: "grid", gridTemplateColumns: "420px 1fr", gap: 16, marginTop: 14 }}>
        {/* LEFT: Controls */}
        <div style={{ border: "1px solid #2a2a2a", borderRadius: 16, padding: 16, background: "rgba(255,255,255,0.03)" }}>
          <div style={{ fontWeight: 900, marginBottom: 10 }}>Clé admin (temporaire)</div>
          <input
            value={adminKey}
            onChange={(e) => setAdminKey(e.target.value)}
            placeholder="Même valeur que MERCHANT_ADMIN_KEY"
            style={{
              width: "100%",
              padding: 10,
              borderRadius: 12,
              border: "1px solid #444",
              background: "rgba(0,0,0,0.35)",
              color: "white",
            }}
          />
          <div style={{ fontSize: 12, opacity: 0.7, marginTop: 8 }}>
            Sans la clé, Save renverra 401. (Tu ne partages jamais cette clé.)
          </div>

          <div style={{ height: 16 }} />

          <div style={{ fontWeight: 900, marginBottom: 10 }}>Titre</div>
          <input
            value={tpl.title}
            onChange={(e) => setTpl({ ...tpl, title: e.target.value })}
            maxLength={40}
            style={{
              width: "100%",
              padding: 10,
              borderRadius: 12,
              border: "1px solid #444",
              background: "rgba(0,0,0,0.35)",
              color: "white",
            }}
          />

          <div style={{ height: 16 }} />

          {/* Tabs */}
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            {[
              { k: "themes", label: "Themes" },
              { k: "colors", label: "Couleurs" },
              { k: "fonts", label: "Polices" },
              { k: "images", label: "Images" },
            ].map((t) => {
              const active = activeTab === (t.k as any);
              return (
                <button
                  key={t.k}
                  onClick={() => setActiveTab(t.k as any)}
                  style={{
                    padding: "8px 10px",
                    borderRadius: 999,
                    border: "1px solid #444",
                    background: active ? "white" : "rgba(0,0,0,0.25)",
                    color: active ? "black" : "white",
                    fontWeight: 800,
                    cursor: "pointer",
                  }}
                >
                  {t.label}
                </button>
              );
            })}
          </div>

          <div style={{ height: 14 }} />

          {/* TAB CONTENT */}
          {activeTab === "themes" ? (
            <div>
              <div style={{ fontWeight: 900, marginBottom: 10 }}>Presets (1 clic)</div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                {THEME_PRESETS.map((p) => (
                  <button
                    key={p.name}
                    onClick={() =>
                      setTpl((prev) => ({
                        ...prev,
                        bgColor: p.bg,
                        textColor: p.text,
                        font: p.font,
                      }))
                    }
                    style={{
                      textAlign: "left",
                      padding: 10,
                      borderRadius: 14,
                      border: "1px solid #333",
                      background: "rgba(0,0,0,0.25)",
                      color: "white",
                      cursor: "pointer",
                    }}
                  >
                    <div style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 6 }}>
                      <span
                        style={{
                          width: 18,
                          height: 18,
                          borderRadius: 6,
                          background: p.bg,
                          border: "1px solid rgba(255,255,255,0.25)",
                          display: "inline-block",
                        }}
                      />
                      <span
                        style={{
                          width: 18,
                          height: 18,
                          borderRadius: 6,
                          background: p.text,
                          border: "1px solid rgba(255,255,255,0.25)",
                          display: "inline-block",
                        }}
                      />
                      <span style={{ fontSize: 12, opacity: 0.9 }}>{p.name}</span>
                    </div>

                    <div style={{ fontFamily: getFontFamily(p.font), fontWeight: 900, fontSize: 14 }}>
                      {FONT_OPTIONS.find((f) => f.key === p.font)?.label.split(" ")[0] || "Font"}
                    </div>
                  </button>
                ))}
              </div>
            </div>
          ) : null}

          {activeTab === "colors" ? (
            <div>
              <div style={{ fontWeight: 900, marginBottom: 10 }}>Palette (clic)</div>

              <div style={{ display: "grid", gridTemplateColumns: "repeat(6, 1fr)", gap: 8 }}>
                {SWATCHES.map((c) => (
                  <button
                    key={c}
                    onClick={() => setTpl({ ...tpl, bgColor: c })}
                    title={`Fond ${c}`}
                    style={{
                      height: 28,
                      borderRadius: 10,
                      border: tpl.bgColor === c ? "2px solid white" : "1px solid #444",
                      background: c,
                      cursor: "pointer",
                    }}
                  />
                ))}
              </div>

              <div style={{ height: 12 }} />

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                <div>
                  <div style={{ fontWeight: 900, marginBottom: 6 }}>Couleur fond</div>
                  <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                    <input
                      type="color"
                      value={clampHex(tpl.bgColor) || "#111827"}
                      onChange={(e) => setTpl({ ...tpl, bgColor: e.target.value })}
                      style={{ width: 46, height: 40, border: "0", background: "transparent" }}
                      title="Choisir une couleur"
                    />
                    <input
                      value={tpl.bgColor}
                      onChange={(e) => setTpl({ ...tpl, bgColor: e.target.value })}
                      placeholder="#111827"
                      style={{
                        flex: 1,
                        padding: 10,
                        borderRadius: 12,
                        border: "1px solid #444",
                        background: "rgba(0,0,0,0.35)",
                        color: "white",
                      }}
                    />
                  </div>
                </div>

                <div>
                  <div style={{ fontWeight: 900, marginBottom: 6 }}>Couleur texte</div>
                  <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                    <input
                      type="color"
                      value={clampHex(tpl.textColor) || "#ffffff"}
                      onChange={(e) => setTpl({ ...tpl, textColor: e.target.value })}
                      style={{ width: 46, height: 40, border: "0", background: "transparent" }}
                      title="Choisir une couleur"
                    />
                    <input
                      value={tpl.textColor}
                      onChange={(e) => setTpl({ ...tpl, textColor: e.target.value })}
                      placeholder="#ffffff"
                      style={{
                        flex: 1,
                        padding: 10,
                        borderRadius: 12,
                        border: "1px solid #444",
                        background: "rgba(0,0,0,0.35)",
                        color: "white",
                      }}
                    />
                  </div>
                </div>
              </div>

              <div style={{ height: 10 }} />

              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                <button
                  onClick={() => setTpl({ ...tpl, textColor: "#ffffff" })}
                  style={{ padding: "8px 10px", borderRadius: 999, border: "1px solid #444", background: "rgba(0,0,0,0.25)", color: "white" }}
                >
                  Texte blanc
                </button>
                <button
                  onClick={() => setTpl({ ...tpl, textColor: "#111827" })}
                  style={{ padding: "8px 10px", borderRadius: 999, border: "1px solid #444", background: "rgba(0,0,0,0.25)", color: "white" }}
                >
                  Texte noir
                </button>
                <button
                  onClick={() => setTpl({ ...tpl, bgColor: "#111827", textColor: "#ffffff" })}
                  style={{ padding: "8px 10px", borderRadius: 999, border: "1px solid #444", background: "rgba(0,0,0,0.25)", color: "white" }}
                >
                  Reset classique
                </button>
              </div>
            </div>
          ) : null}

          {activeTab === "fonts" ? (
            <div>
              <div style={{ fontWeight: 900, marginBottom: 10 }}>Polices (preview)</div>

              <div style={{ display: "grid", gap: 10 }}>
                {FONT_OPTIONS.map((f) => {
                  const active = tpl.font === f.key;
                  return (
                    <button
                      key={f.key}
                      onClick={() => setTpl({ ...tpl, font: f.key })}
                      style={{
                        textAlign: "left",
                        padding: 12,
                        borderRadius: 14,
                        border: active ? "2px solid white" : "1px solid #444",
                        background: "rgba(0,0,0,0.25)",
                        color: "white",
                        cursor: "pointer",
                      }}
                    >
                      <div style={{ fontSize: 12, opacity: 0.8, marginBottom: 6 }}>{f.label}</div>
                      <div style={{ fontFamily: f.family, fontWeight: 900, fontSize: 18 }}>
                        Get Your Crêpe
                      </div>
                      <div style={{ fontFamily: f.family, opacity: 0.85, marginTop: 4, fontSize: 12 }}>
                        8/10 • fidélité • rewards
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          ) : null}

          {activeTab === "images" ? (
            <div>
              <div style={{ fontWeight: 900, marginBottom: 10 }}>Images</div>

              <div style={{ fontWeight: 800, marginBottom: 6 }}>Logo URL</div>
              <input
                value={tpl.logoUrl || ""}
                onChange={(e) => setTpl({ ...tpl, logoUrl: e.target.value })}
                placeholder="/logo.png ou https://..."
                style={{
                  width: "100%",
                  padding: 10,
                  borderRadius: 12,
                  border: "1px solid #444",
                  background: "rgba(0,0,0,0.35)",
                  color: "white",
                }}
              />

              <div style={{ height: 10 }} />

              <div style={{ fontWeight: 800, marginBottom: 6 }}>Background image URL (optionnel)</div>
              <input
                value={tpl.bgImageUrl || ""}
                onChange={(e) => setTpl({ ...tpl, bgImageUrl: e.target.value })}
                placeholder="https://... (image de fond)"
                style={{
                  width: "100%",
                  padding: 10,
                  borderRadius: 12,
                  border: "1px solid #444",
                  background: "rgba(0,0,0,0.35)",
                  color: "white",
                }}
              />

              <div style={{ fontSize: 12, opacity: 0.7, marginTop: 8 }}>
                Astuce : ton logo dans <code>/public</code> ⇒ mets <code>/logo.png</code>.
              </div>
            </div>
          ) : null}
        </div>

        {/* RIGHT: Preview */}
        <div style={{ border: "1px solid #2a2a2a", borderRadius: 16, padding: 16, background: "rgba(255,255,255,0.03)" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 10 }}>
            <div style={{ fontWeight: 900, fontSize: 18 }}>Preview</div>
            <div style={{ opacity: 0.7, fontSize: 12 }}>
              {loading ? "Chargement…" : "Live"} • {STORE_ID}
            </div>
          </div>

          <div
            style={{
              ...previewStyle,
              height: 220,
              borderRadius: 22,
              overflow: "hidden",
              position: "relative",
              padding: 18,
              boxShadow: "0 14px 35px rgba(0,0,0,0.25)",
              border: "1px solid rgba(255,255,255,0.10)",
            }}
          >
            {cardOverlayNeeded ? (
              <div
                style={{
                  position: "absolute",
                  inset: 0,
                  background: "rgba(0,0,0,0.35)",
                }}
              />
            ) : null}

            <div style={{ position: "relative", display: "flex", justifyContent: "space-between", gap: 12 }}>
              <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
                {tpl.logoUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={tpl.logoUrl}
                    alt="logo"
                    style={{
                      height: 46,
                      width: 46,
                      borderRadius: 14,
                      objectFit: "cover",
                      background: "rgba(255,255,255,0.12)",
                      border: "1px solid rgba(255,255,255,0.15)",
                    }}
                  />
                ) : (
                  <div
                    style={{
                      height: 46,
                      width: 46,
                      borderRadius: 14,
                      background: "rgba(255,255,255,0.12)",
                      border: "1px solid rgba(255,255,255,0.15)",
                    }}
                  />
                )}

                <div style={{ display: "grid", gap: 2 }}>
                  <div style={{ fontSize: 26, fontWeight: 900, lineHeight: 1.05 }}>
                    {tpl.title || "Loyalty Card"}
                  </div>
                  <div style={{ opacity: 0.9, fontSize: 12 }}>
                    Programme fidélité • {FONT_OPTIONS.find((f) => f.key === tpl.font)?.label || "Inter"}
                  </div>
                </div>
              </div>

              <div style={{ fontWeight: 900, fontSize: 18, opacity: 0.95 }}>8/10</div>
            </div>

            <div style={{ position: "relative", marginTop: 90, fontSize: 13, opacity: 0.9 }}>
              ownerId (temp) • fw_ownerId
            </div>
          </div>

          <div style={{ marginTop: 12, opacity: 0.75, fontSize: 12, lineHeight: 1.35 }}>
            Prochaine étape : appliquer ce template sur <code>/wallet/card/[cardId]</code> (affichage carte réelle).
          </div>
        </div>
      </div>
    </main>
  );
}
