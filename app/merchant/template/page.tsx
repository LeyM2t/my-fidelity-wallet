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

// Drag + resize
import { Rnd } from "react-rnd";

// Color picker (si tu l'as installé)
import { HexColorPicker } from "react-colorful";

const STORE_ID = "get-your-crepe";

type BgType = "color" | "gradient" | "image";

type Gradient = {
  from: string; // hex
  to: string; // hex
  angle: number; // deg
};

type Box = {
  x: number;
  y: number;
  width: number;
  height: number;
};

type CardTemplate = {
  title: string;
  textColor: string; // hex
  font: string;

  // background
  bgType: BgType;
  bgColor: string; // hex (fallback & color mode)
  gradient: Gradient;

  // images
  logoUrl?: string;
  bgImageUrl?: string;

  // editable layout (new)
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

  // defaults “ok” pour commencer
  logoBox: { x: 18, y: 18, width: 56, height: 56 },
  bgImageBox: { x: 0, y: 0, width: 520, height: 260 },
};

// presets type “Word”
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

export default function MerchantTemplatePage() {
  const [adminKey, setAdminKey] = useState("");
  const [tpl, setTpl] = useState<CardTemplate>(DEFAULT);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState("");
  const [err, setErr] = useState("");

  const [activeTab, setActiveTab] = useState<"themes" | "colors" | "fonts" | "images">("themes");
  const [colorSubTab, setColorSubTab] = useState<"color" | "gradient" | "image">("color");

  // mode “édition” pour afficher les poignées
  const [editLogo, setEditLogo] = useState(true);
  const [editBg, setEditBg] = useState(true);

  const fontFamily = useMemo(() => getFontFamily(tpl.font), [tpl.font]);

  const hasBgImg = !!(tpl.bgImageUrl && tpl.bgImageUrl.trim());
  const needsOverlay = tpl.bgType === "image" && hasBgImg;

  const cardBaseStyle = useMemo(() => {
    const base: React.CSSProperties = {
      color: tpl.textColor,
      fontFamily,
    };

    if (tpl.bgType === "color") {
      base.background = tpl.bgColor;
    } else if (tpl.bgType === "gradient") {
      base.background = `linear-gradient(${tpl.gradient.angle}deg, ${tpl.gradient.from}, ${tpl.gradient.to})`;
    } else {
      // image : on met un fallback, puis l’image est rendue en layer avec Rnd
      base.background = tpl.bgColor;
    }

    return base;
  }, [tpl.bgType, tpl.bgColor, tpl.gradient, tpl.textColor, fontFamily]);

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

      // compat : ancien modèle (bgColor/textColor/font/logoUrl/bgImageUrl) => nouveau modèle
      const raw = (data?.cardTemplate || {}) as Partial<CardTemplate> & any;

      const merged: CardTemplate = {
        ...DEFAULT,
        ...raw,

        // champs nouveaux avec fallback
        bgType: (raw.bgType === "color" || raw.bgType === "gradient" || raw.bgType === "image") ? raw.bgType : (raw.bgImageUrl ? "image" : "color"),
        gradient: {
          from: clampHex(raw?.gradient?.from) || DEFAULT.gradient.from,
          to: clampHex(raw?.gradient?.to) || DEFAULT.gradient.to,
          angle: clampNumber(raw?.gradient?.angle, 0, 360, DEFAULT.gradient.angle),
        },
        logoBox: normalizeBox(raw?.logoBox, DEFAULT.logoBox),
        bgImageBox: normalizeBox(raw?.bgImageBox, DEFAULT.bgImageBox),
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
          <h1 style={{ fontSize: 28, marginBottom: 6 }}>Template carte — V2.6 (builder avancé)</h1>
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
          <div style={{ fontSize: 12, opacity: 0.7, marginTop: 8 }}>
            Sans la clé, Save renverra 401.
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

          {/* THEMES */}
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

          {/* COLORS */}
          {activeTab === "colors" ? (
            <div>
              <div style={{ fontWeight: 900, marginBottom: 10 }}>Fond : mode</div>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                {[
                  { k: "color", label: "Couleur" },
                  { k: "gradient", label: "Dégradé" },
                  { k: "image", label: "Image" },
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

              {/* shared text color */}
              <div style={{ fontWeight: 900, marginBottom: 6 }}>Couleur texte</div>
              <div style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 12 }}>
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
                <button
                  onClick={() => setTpl({ ...tpl, textColor: "#ffffff" })}
                  style={{ padding: "8px 10px", borderRadius: 999, border: "1px solid #444", background: "rgba(0,0,0,0.25)", color: "white", fontWeight: 800 }}
                >
                  Blanc
                </button>
                <button
                  onClick={() => setTpl({ ...tpl, textColor: "#111827" })}
                  style={{ padding: "8px 10px", borderRadius: 999, border: "1px solid #444", background: "rgba(0,0,0,0.25)", color: "white", fontWeight: 800 }}
                >
                  Noir
                </button>
              </div>

              {colorSubTab === "color" ? (
                <div>
                  <div style={{ fontWeight: 900, marginBottom: 10 }}>Palette (clic)</div>
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(6, 1fr)", gap: 8 }}>
                    {SWATCHES.map((c) => (
                      <button
                        key={c}
                        onClick={() => setTpl({ ...tpl, bgType: "color", bgColor: c })}
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

                  <div style={{ fontWeight: 900, marginBottom: 6 }}>Couleur fond</div>
                  <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                    <input
                      type="color"
                      value={clampHex(tpl.bgColor) || "#111827"}
                      onChange={(e) => setTpl({ ...tpl, bgType: "color", bgColor: e.target.value })}
                      style={{ width: 46, height: 40, border: "0", background: "transparent" }}
                      title="Choisir une couleur"
                    />
                    <input
                      value={tpl.bgColor}
                      onChange={(e) => setTpl({ ...tpl, bgType: "color", bgColor: e.target.value })}
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
                        title={`${g.from} → ${g.to}`}
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
                      <input
                        value={tpl.gradient.from}
                        onChange={(e) => setTpl((p) => ({ ...p, bgType: "gradient", gradient: { ...p.gradient, from: e.target.value } }))}
                        placeholder="#ff0000"
                        style={{
                          width: "100%",
                          marginTop: 10,
                          padding: 10,
                          borderRadius: 12,
                          border: "1px solid #444",
                          background: "rgba(0,0,0,0.35)",
                          color: "white",
                        }}
                      />
                    </div>

                    <div style={{ border: "1px solid #333", borderRadius: 14, padding: 10, background: "rgba(0,0,0,0.25)" }}>
                      <div style={{ fontWeight: 800, marginBottom: 8 }}>Couleur 2</div>
                      <HexColorPicker
                        color={clampHex(tpl.gradient.to) || DEFAULT.gradient.to}
                        onChange={(v) => setTpl((p) => ({ ...p, bgType: "gradient", gradient: { ...p.gradient, to: v } }))}
                      />
                      <input
                        value={tpl.gradient.to}
                        onChange={(e) => setTpl((p) => ({ ...p, bgType: "gradient", gradient: { ...p.gradient, to: e.target.value } }))}
                        placeholder="#111827"
                        style={{
                          width: "100%",
                          marginTop: 10,
                          padding: 10,
                          borderRadius: 12,
                          border: "1px solid #444",
                          background: "rgba(0,0,0,0.35)",
                          color: "white",
                        }}
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

              {colorSubTab === "image" ? (
                <div style={{ marginTop: 4 }}>
                  <div style={{ fontWeight: 900, marginBottom: 6 }}>Image de fond (URL)</div>
                  <input
                    value={tpl.bgImageUrl || ""}
                    onChange={(e) => setTpl({ ...tpl, bgType: "image", bgImageUrl: e.target.value })}
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
                    Mets une image large. Ensuite : active “Edit BG” à droite et ajuste.
                  </div>
                </div>
              ) : null}
            </div>
          ) : null}

          {/* FONTS */}
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

          {/* IMAGES */}
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
                onChange={(e) => setTpl({ ...tpl, bgType: "image", bgImageUrl: e.target.value })}
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
                Astuce : logo dans <code>/public</code> ⇒ <code>/logo.png</code>.
              </div>
            </div>
          ) : null}
        </div>

        {/* RIGHT: Preview */}
        <div style={{ border: "1px solid #2a2a2a", borderRadius: 16, padding: 16, background: "rgba(255,255,255,0.03)" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 10 }}>
            <div style={{ fontWeight: 900, fontSize: 18 }}>Preview</div>
            <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
              <label style={{ display: "flex", gap: 6, alignItems: "center", fontSize: 12, opacity: 0.85 }}>
                <input type="checkbox" checked={editLogo} onChange={(e) => setEditLogo(e.target.checked)} />
                Edit Logo
              </label>
              <label style={{ display: "flex", gap: 6, alignItems: "center", fontSize: 12, opacity: 0.85 }}>
                <input type="checkbox" checked={editBg} onChange={(e) => setEditBg(e.target.checked)} />
                Edit BG
              </label>
              <div style={{ opacity: 0.7, fontSize: 12 }}>
                {loading ? "Chargement…" : "Live"} • {STORE_ID}
              </div>
            </div>
          </div>

          <div
            style={{
              ...cardBaseStyle,
              height: 220,
              borderRadius: 22,
              overflow: "hidden",
              position: "relative",
              boxShadow: "0 14px 35px rgba(0,0,0,0.25)",
              border: "1px solid rgba(255,255,255,0.10)",
            }}
          >
            {/* Background image layer (only if bgType=image) */}
            {tpl.bgType === "image" && hasBgImg ? (
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
                style={{
                  zIndex: 1,
                  outline: editBg ? "2px dashed rgba(255,255,255,0.45)" : "none",
                  borderRadius: 22,
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

            {/* Overlay to keep text readable over image */}
            {needsOverlay ? (
              <div
                style={{
                  position: "absolute",
                  inset: 0,
                  background: "rgba(0,0,0,0.35)",
                  zIndex: 2,
                }}
              />
            ) : null}

            {/* Foreground content */}
            <div style={{ position: "absolute", inset: 0, padding: 18, zIndex: 3 }}>
              {/* Score top-right */}
              <div style={{ position: "absolute", top: 18, right: 18, fontWeight: 900, fontSize: 18, opacity: 0.95 }}>
                8/10
              </div>

              {/* Title block */}
              <div style={{ position: "absolute", top: 18, left: 18, right: 90 }}>
                <div style={{ fontSize: 26, fontWeight: 900, lineHeight: 1.05 }}>
                  {tpl.title || "Loyalty Card"}
                </div>
                <div style={{ opacity: 0.9, fontSize: 12, marginTop: 4 }}>
                  Programme fidélité • {FONT_OPTIONS.find((f) => f.key === tpl.font)?.label || "Inter"}
                </div>
              </div>

              {/* ownerId bottom-left */}
              <div style={{ position: "absolute", left: 18, bottom: 16, fontSize: 13, opacity: 0.9 }}>
                ownerId (temp) • fw_ownerId
              </div>
            </div>

            {/* Logo layer (drag+resize) */}
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
              style={{
                zIndex: 4,
                outline: editLogo ? "2px dashed rgba(255,255,255,0.45)" : "none",
                borderRadius: 16,
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

          <div style={{ marginTop: 12, opacity: 0.75, fontSize: 12, lineHeight: 1.35 }}>
            Prochaine étape : appliquer ce template sur <code>/wallet/card/[cardId]</code> (affichage carte réelle).
          </div>
        </div>
      </div>
    </main>
  );
}
