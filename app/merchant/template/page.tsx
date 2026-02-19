"use client";

import React, { useEffect, useMemo, useState } from "react";
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

import { Rnd } from "react-rnd";
import { HexColorPicker } from "react-colorful";

const STORE_ID = "get-your-crepe";

type BgType = "color" | "gradient" | "image";

type Gradient = {
  from: string;
  to: string;
  angle: number;
};

type Box = {
  x: number;
  y: number;
  width: number;
  height: number;
};

type CardTemplate = {
  title: string;
  textColor: string;
  font: string;

  // background base
  bgType: BgType;
  bgColor: string;
  gradient: Gradient;

  // images
  logoUrl?: string;
  bgImageUrl?: string;

  // NEW: allow combine base + image
  bgImageEnabled: boolean;
  bgImageOpacity: number; // 0..1

  // editable layout
  logoBox: Box;
  bgImageBox: Box;
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
  textColor: "#ffffff",
  font: "inter",

  bgType: "color",
  bgColor: "#111827",
  gradient: { from: "#ff0000", to: "#111827", angle: 45 },

  logoUrl: "/logo.png",
  bgImageUrl: "",

  bgImageEnabled: false,
  bgImageOpacity: 0.85,

  logoBox: { x: 18, y: 18, width: 56, height: 56 },
  // IMPORTANT: taille proche de la carte pour voir/attraper les handles
  bgImageBox: { x: 0, y: 0, width: 420, height: 220 },
};

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

const GRADIENT_PRESETS: Gradient[] = [
  { from: "#ff0000", to: "#111827", angle: 45 },
  { from: "#f97316", to: "#111827", angle: 45 },
  { from: "#1d4ed8", to: "#111827", angle: 45 },
  { from: "#16a34a", to: "#111827", angle: 45 },
  { from: "#7c3aed", to: "#111827", angle: 45 },
  { from: "#0b132b", to: "#facc15", angle: 45 },
  { from: "#111827", to: "#ffffff", angle: 90 },
  { from: "#ec4899", to: "#1d4ed8", angle: 45 },
];

function getFontFamily(fontKey: string) {
  const found = FONT_OPTIONS.find((f) => f.key === fontKey);
  return found?.family || inter.style.fontFamily;
}

function clampHex(v: string) {
  const s = (v || "").trim();
  if (/^#[0-9a-fA-F]{6}$/.test(s)) return s.toLowerCase();
  return "";
}

function clampNumber(n: any, min: number, max: number, fallback: number) {
  const v = typeof n === "number" && Number.isFinite(n) ? n : fallback;
  return Math.min(max, Math.max(min, v));
}

function normalizeBox(b: any, fallback: Box): Box {
  return {
    x: clampNumber(b?.x, -999, 999, fallback.x),
    y: clampNumber(b?.y, -999, 999, fallback.y),
    width: clampNumber(b?.width, 10, 9999, fallback.width),
    height: clampNumber(b?.height, 10, 9999, fallback.height),
  };
}

const HANDLE_STYLE: React.CSSProperties = {
  width: 12,
  height: 12,
  borderRadius: 4,
  background: "rgba(255,255,255,0.95)",
  border: "1px solid rgba(0,0,0,0.35)",
  boxShadow: "0 2px 10px rgba(0,0,0,0.35)",
};

export default function MerchantTemplatePage() {
  const [adminKey, setAdminKey] = useState("");
  const [tpl, setTpl] = useState<CardTemplate>(DEFAULT);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState("");
  const [err, setErr] = useState("");

  const [activeTab, setActiveTab] = useState<"themes" | "colors" | "fonts" | "images">("themes");
  const [colorSubTab, setColorSubTab] = useState<"color" | "gradient" | "image">("color");

  const [editLogo, setEditLogo] = useState(true);
  const [editBg, setEditBg] = useState(true);

  const fontFamily = useMemo(() => getFontFamily(tpl.font), [tpl.font]);

  const hasBgImg = !!(tpl.bgImageUrl && tpl.bgImageUrl.trim());
  const showBgImg = tpl.bgImageEnabled && hasBgImg;

  const baseBackground = useMemo(() => {
    if (tpl.bgType === "gradient") {
      return `linear-gradient(${tpl.gradient.angle}deg, ${tpl.gradient.from}, ${tpl.gradient.to})`;
    }
    // color & (legacy image) => base = bgColor
    return tpl.bgColor;
  }, [tpl.bgType, tpl.bgColor, tpl.gradient]);

  const cardBaseStyle = useMemo(() => {
    return {
      color: tpl.textColor,
      fontFamily,
      background: baseBackground,
    } as React.CSSProperties;
  }, [tpl.textColor, fontFamily, baseBackground]);

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

      const raw = (data?.cardTemplate || {}) as Partial<CardTemplate> & any;

      // compat ancienne version : si bgType=image => on active l’image
      const compatBgImageEnabled =
        typeof raw?.bgImageEnabled === "boolean"
          ? raw.bgImageEnabled
          : raw?.bgType === "image" || !!(raw?.bgImageUrl && String(raw.bgImageUrl).trim());

      const merged: CardTemplate = {
        ...DEFAULT,
        ...raw,

        bgType:
          raw.bgType === "color" || raw.bgType === "gradient" || raw.bgType === "image"
            ? raw.bgType
            : "color",

        gradient: {
          from: clampHex(raw?.gradient?.from) || DEFAULT.gradient.from,
          to: clampHex(raw?.gradient?.to) || DEFAULT.gradient.to,
          angle: clampNumber(raw?.gradient?.angle, 0, 360, DEFAULT.gradient.angle),
        },

        logoBox: normalizeBox(raw?.logoBox, DEFAULT.logoBox),
        bgImageBox: normalizeBox(raw?.bgImageBox, DEFAULT.bgImageBox),

        bgImageEnabled: compatBgImageEnabled,
        bgImageOpacity: clampNumber(raw?.bgImageOpacity, 0, 1, DEFAULT.bgImageOpacity),
      };

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
        textColor: clampHex(tpl.textColor) || DEFAULT.textColor,
        font: FONT_OPTIONS.some((f) => f.key === tpl.font) ? tpl.font : "inter",

        bgType: tpl.bgType,
        bgColor: clampHex(tpl.bgColor) || DEFAULT.bgColor,
        gradient: {
          from: clampHex(tpl.gradient.from) || DEFAULT.gradient.from,
          to: clampHex(tpl.gradient.to) || DEFAULT.gradient.to,
          angle: clampNumber(tpl.gradient.angle, 0, 360, DEFAULT.gradient.angle),
        },

        logoUrl: (tpl.logoUrl || "").slice(0, 500),
        bgImageUrl: (tpl.bgImageUrl || "").slice(0, 500),

        bgImageEnabled: !!tpl.bgImageEnabled,
        bgImageOpacity: clampNumber(tpl.bgImageOpacity, 0, 1, DEFAULT.bgImageOpacity),

        logoBox: normalizeBox(tpl.logoBox, DEFAULT.logoBox),
        bgImageBox: normalizeBox(tpl.bgImageBox, DEFAULT.bgImageBox),
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

      setTpl(payload);
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

  return (
    <main style={{ padding: 24, maxWidth: 1100, margin: "0 auto", fontFamily: "Arial" }}>
      <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
        <div>
          <h1 style={{ fontSize: 28, marginBottom: 6 }}>Template carte — Builder avancé</h1>
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
        <div style={{ marginTop: 12, marginBottom: 12, color: "crimson", fontWeight: 700 }}>
          Erreur : {err}
        </div>
      ) : null}
      {msg ? (
        <div style={{ marginTop: 12, marginBottom: 12, color: "#22c55e", fontWeight: 800 }}>
          {msg}
        </div>
      ) : null}

      <div style={{ display: "grid", gridTemplateColumns: "420px 1fr", gap: 16, marginTop: 14 }}>
        {/* LEFT */}
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
                        bgType: "color",
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
                      <span style={{ width: 18, height: 18, borderRadius: 6, background: p.bg, border: "1px solid rgba(255,255,255,0.25)" }} />
                      <span style={{ width: 18, height: 18, borderRadius: 6, background: p.text, border: "1px solid rgba(255,255,255,0.25)" }} />
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
              <div style={{ fontWeight: 900, marginBottom: 10 }}>Fond : base</div>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                {[
                  { k: "color", label: "Couleur" },
                  { k: "gradient", label: "Dégradé" },
                ].map((t) => {
                  const active = colorSubTab === (t.k as any);
                  return (
                    <button
                      key={t.k}
                      onClick={() => {
                        setColorSubTab(t.k as any);
                        setTpl((prev) => ({ ...prev, bgType: t.k as BgType }));
                      }}
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

              <div style={{ height: 12 }} />

              <div style={{ fontWeight: 900, marginBottom: 6 }}>Couleur texte</div>
              <div style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 12 }}>
                <input
                  type="color"
                  value={clampHex(tpl.textColor) || "#ffffff"}
                  onChange={(e) => setTpl({ ...tpl, textColor: e.target.value })}
                  style={{ width: 46, height: 40, border: "0", background: "transparent" }}
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

              {colorSubTab === "color" ? (
                <div>
                  <div style={{ fontWeight: 900, marginBottom: 10 }}>Palette</div>
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(6, 1fr)", gap: 8 }}>
                    {SWATCHES.map((c) => (
                      <button
                        key={c}
                        onClick={() => setTpl({ ...tpl, bgType: "color", bgColor: c })}
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
                </div>
              ) : null}

              {colorSubTab === "gradient" ? (
                <div>
                  <div style={{ fontWeight: 900, marginBottom: 10 }}>Dégradés (presets)</div>
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 10, marginBottom: 12 }}>
                    {GRADIENT_PRESETS.map((g, idx) => (
                      <button
                        key={idx}
                        onClick={() => setTpl((prev) => ({ ...prev, bgType: "gradient", gradient: g }))}
                        style={{
                          height: 42,
                          borderRadius: 14,
                          border: "1px solid rgba(255,255,255,0.18)",
                          background: `linear-gradient(${g.angle}deg, ${g.from}, ${g.to})`,
                          cursor: "pointer",
                        }}
                      />
                    ))}
                  </div>

                  <div style={{ fontWeight: 900, marginBottom: 6 }}>Personnalisé</div>

                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                    <div style={{ border: "1px solid #333", borderRadius: 14, padding: 10, background: "rgba(0,0,0,0.25)" }}>
                      <div style={{ fontWeight: 800, marginBottom: 8 }}>Couleur 1</div>
                      <HexColorPicker
                        color={clampHex(tpl.gradient.from) || DEFAULT.gradient.from}
                        onChange={(v) => setTpl((p) => ({ ...p, bgType: "gradient", gradient: { ...p.gradient, from: v } }))}
                      />
                    </div>

                    <div style={{ border: "1px solid #333", borderRadius: 14, padding: 10, background: "rgba(0,0,0,0.25)" }}>
                      <div style={{ fontWeight: 800, marginBottom: 8 }}>Couleur 2</div>
                      <HexColorPicker
                        color={clampHex(tpl.gradient.to) || DEFAULT.gradient.to}
                        onChange={(v) => setTpl((p) => ({ ...p, bgType: "gradient", gradient: { ...p.gradient, to: v } }))}
                      />
                    </div>
                  </div>

                  <div style={{ height: 10 }} />
                  <div style={{ fontWeight: 900, marginBottom: 6 }}>Angle : {Math.round(tpl.gradient.angle)}°</div>
                  <input
                    type="range"
                    min={0}
                    max={360}
                    value={tpl.gradient.angle}
                    onChange={(e) => setTpl((p) => ({ ...p, bgType: "gradient", gradient: { ...p.gradient, angle: Number(e.target.value) } }))}
                    style={{ width: "100%" }}
                  />
                </div>
              ) : null}
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

              <div style={{ fontWeight: 800, marginBottom: 6 }}>Background image URL</div>
              <input
                value={tpl.bgImageUrl || ""}
                onChange={(e) => setTpl({ ...tpl, bgImageUrl: e.target.value, bgImageEnabled: true })}
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

              <div style={{ height: 10 }} />

              <label style={{ display: "flex", gap: 10, alignItems: "center", fontWeight: 900 }}>
                <input
                  type="checkbox"
                  checked={tpl.bgImageEnabled}
                  onChange={(e) => setTpl({ ...tpl, bgImageEnabled: e.target.checked })}
                />
                Afficher image de fond
              </label>

              <div style={{ height: 10 }} />

              <div style={{ fontWeight: 900, marginBottom: 6 }}>
                Opacité image : {Math.round(tpl.bgImageOpacity * 100)}%
              </div>
              <input
                type="range"
                min={0}
                max={100}
                value={Math.round(tpl.bgImageOpacity * 100)}
                onChange={(e) => setTpl({ ...tpl, bgImageOpacity: Number(e.target.value) / 100 })}
                style={{ width: "100%" }}
              />

              <div style={{ fontSize: 12, opacity: 0.75, marginTop: 8 }}>
                Tu peux maintenant faire : **dégradé + image** (via opacité).
              </div>
            </div>
          ) : null}

          {activeTab === "fonts" ? (
            <div>
              <div style={{ fontWeight: 900, marginBottom: 10 }}>Polices</div>
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
                    </button>
                  );
                })}
              </div>
            </div>
          ) : null}
        </div>

        {/* RIGHT: Preview */}
        <div style={{ border: "1px solid #2a2a2a", borderRadius: 16, padding: 16, background: "rgba(255,255,255,0.03)" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 10 }}>
            <div style={{ fontWeight: 900, fontSize: 18 }}>Preview</div>

            <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
              <label style={{ display: "flex", gap: 6, alignItems: "center", fontSize: 12, opacity: 0.9 }}>
                <input type="checkbox" checked={editLogo} onChange={(e) => setEditLogo(e.target.checked)} />
                Edit Logo
              </label>
              <label style={{ display: "flex", gap: 6, alignItems: "center", fontSize: 12, opacity: 0.9 }}>
                <input type="checkbox" checked={editBg} onChange={(e) => setEditBg(e.target.checked)} />
                Edit BG
              </label>

              <div style={{ opacity: 0.7, fontSize: 12 }}>
                {loading ? "Chargement…" : "Live"} • {STORE_ID}
              </div>
            </div>
          </div>

          {/* wrapper without overflow hidden so handles are clickable */}
          <div style={{ position: "relative" }}>
            <div
              style={{
                ...cardBaseStyle,
                height: 220,
                borderRadius: 22,
                position: "relative",
                boxShadow: "0 14px 35px rgba(0,0,0,0.25)",
                border: "1px solid rgba(255,255,255,0.10)",
                // IMPORTANT: keep overflow hidden for visuals, but we moved handles inside via styles
                overflow: "hidden",
              }}
            >
              {/* BG Image layer (now independent from bgType => combinable) */}
              {showBgImg ? (
                <Rnd
                  bounds="parent"
                  disableDragging={!editBg}
                  enableResizing={editBg}
                  size={{ width: tpl.bgImageBox.width, height: tpl.bgImageBox.height }}
                  position={{ x: tpl.bgImageBox.x, y: tpl.bgImageBox.y }}
                  onDragStop={(e, d) => {
                    setTpl((p) => ({ ...p, bgImageBox: { ...p.bgImageBox, x: d.x, y: d.y } }));
                  }}
                  onResizeStop={(e, direction, ref, delta, position) => {
                    const w = ref.offsetWidth;
                    const h = ref.offsetHeight;
                    setTpl((p) => ({
                      ...p,
                      bgImageBox: { x: position.x, y: position.y, width: w, height: h },
                    }));
                  }}
                  resizeHandleStyles={{
                    topLeft: HANDLE_STYLE,
                    topRight: HANDLE_STYLE,
                    bottomLeft: HANDLE_STYLE,
                    bottomRight: HANDLE_STYLE,
                  }}
                  style={{
                    zIndex: editBg ? 50 : 1,
                    outline: editBg ? "2px dashed rgba(255,255,255,0.55)" : "none",
                    borderRadius: 22,
                    pointerEvents: editBg ? "auto" : "none",
                    opacity: tpl.bgImageOpacity,
                  }}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={tpl.bgImageUrl}
                    alt="background"
                    style={{
                      width: "100%",
                      height: "100%",
                      objectFit: "cover",
                      display: "block",
                      pointerEvents: "none",
                      userSelect: "none",
                    }}
                  />
                </Rnd>
              ) : null}

              {/* Overlay readability - must NOT block mouse */}
              {showBgImg ? (
                <div
                  style={{
                    position: "absolute",
                    inset: 0,
                    background: "rgba(0,0,0,0.20)",
                    zIndex: 10,
                    pointerEvents: "none",
                  }}
                />
              ) : null}

              {/* Foreground content (disable pointer events while editing BG so it doesn't block handles) */}
              <div
                style={{
                  position: "absolute",
                  inset: 0,
                  padding: 18,
                  zIndex: 20,
                  pointerEvents: editBg ? "none" : "auto",
                }}
              >
                <div style={{ position: "absolute", top: 18, right: 18, fontWeight: 900, fontSize: 18, opacity: 0.95 }}>
                  8/10
                </div>

                <div style={{ position: "absolute", top: 18, left: 18, right: 90 }}>
                  <div style={{ fontSize: 26, fontWeight: 900, lineHeight: 1.05 }}>
                    {tpl.title || "Loyalty Card"}
                  </div>
                  <div style={{ opacity: 0.9, fontSize: 12, marginTop: 4 }}>
                    Programme fidélité • {FONT_OPTIONS.find((f) => f.key === tpl.font)?.label || "Inter"}
                  </div>
                </div>

                <div style={{ position: "absolute", left: 18, bottom: 16, fontSize: 13, opacity: 0.9 }}>
                  ownerId (temp) • fw_ownerId
                </div>
              </div>

              {/* Logo layer */}
              <Rnd
                bounds="parent"
                disableDragging={!editLogo}
                enableResizing={editLogo}
                size={{ width: tpl.logoBox.width, height: tpl.logoBox.height }}
                position={{ x: tpl.logoBox.x, y: tpl.logoBox.y }}
                onDragStop={(e, d) => {
                  setTpl((p) => ({ ...p, logoBox: { ...p.logoBox, x: d.x, y: d.y } }));
                }}
                onResizeStop={(e, direction, ref, delta, position) => {
                  const w = ref.offsetWidth;
                  const h = ref.offsetHeight;
                  setTpl((p) => ({
                    ...p,
                    logoBox: { x: position.x, y: position.y, width: w, height: h },
                  }));
                }}
                resizeHandleStyles={{
                  topLeft: HANDLE_STYLE,
                  topRight: HANDLE_STYLE,
                  bottomLeft: HANDLE_STYLE,
                  bottomRight: HANDLE_STYLE,
                }}
                style={{
                  zIndex: editLogo ? 60 : 30,
                  outline: editLogo ? "2px dashed rgba(255,255,255,0.55)" : "none",
                  borderRadius: 16,
                  pointerEvents: editLogo ? "auto" : "none",
                }}
              >
                {tpl.logoUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={tpl.logoUrl}
                    alt="logo"
                    style={{
                      width: "100%",
                      height: "100%",
                      borderRadius: 16,
                      objectFit: "cover",
                      background: "rgba(255,255,255,0.12)",
                      border: "1px solid rgba(255,255,255,0.15)",
                      pointerEvents: "none",
                      userSelect: "none",
                      display: "block",
                    }}
                  />
                ) : (
                  <div
                    style={{
                      width: "100%",
                      height: "100%",
                      borderRadius: 16,
                      background: "rgba(255,255,255,0.12)",
                      border: "1px solid rgba(255,255,255,0.15)",
                    }}
                  />
                )}
              </Rnd>
            </div>
          </div>

          <div style={{ marginTop: 12, opacity: 0.75, fontSize: 12, lineHeight: 1.35 }}>
            Prochaine étape : appliquer ce template sur <code>/wallet/card/[cardId]</code>.
          </div>
        </div>
      </div>
    </main>
  );
}
