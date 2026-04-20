"use client";

import React, { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
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
import { useTranslations } from "next-intl";
import { auth } from "@/lib/firebaseClient";
import {
  EmailAuthProvider,
  reauthenticateWithCredential,
} from "firebase/auth";

const STORE_ID = "get-your-crepe";
const CARD_WIDTH = 420;
const CARD_HEIGHT = 220;

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
  bgType: BgType;
  bgColor: string;
  gradient: Gradient;
  logoUrl?: string;
  bgImageUrl?: string;
  bgImageEnabled: boolean;
  bgImageOpacity: number;
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
  { key: "inter", label: "Inter (modern)", family: inter.style.fontFamily },
  { key: "poppins", label: "Poppins (rounded)", family: poppins.style.fontFamily },
  { key: "montserrat", label: "Montserrat (professional)", family: montserrat.style.fontFamily },
  { key: "nunito", label: "Nunito (friendly)", family: nunito.style.fontFamily },
  { key: "roboto", label: "Roboto (classic)", family: roboto.style.fontFamily },
  { key: "lora", label: "Lora (reading)", family: lora.style.fontFamily },
  { key: "playfair", label: "Playfair (elegant)", family: playfair.style.fontFamily },
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
  bgImageBox: { x: 0, y: 0, width: CARD_WIDTH, height: CARD_HEIGHT },
};

const THEME_PRESETS = [
  { name: "Black & White", bg: "#111827", text: "#ffffff", font: "inter" },
  { name: "Bold Red", bg: "#ff0000", text: "#ffffff", font: "oswald" },
  { name: "Professional Blue", bg: "#1d4ed8", text: "#ffffff", font: "montserrat" },
  { name: "Warm Orange", bg: "#f97316", text: "#111827", font: "poppins" },
  { name: "Nature Green", bg: "#16a34a", text: "#ffffff", font: "nunito" },
  { name: "Fun Purple", bg: "#7c3aed", text: "#ffffff", font: "poppins" },
  { name: "Soft Sand", bg: "#f5f5f4", text: "#111827", font: "lora" },
  { name: "Navy Gold", bg: "#0b132b", text: "#facc15", font: "playfair" },
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

function clampNumber(n: unknown, min: number, max: number, fallback: number) {
  const v = typeof n === "number" && Number.isFinite(n) ? n : fallback;
  return Math.min(max, Math.max(min, v));
}

function normalizeBox(b: unknown, fallback: Box): Box {
  const box = b as Partial<Box> | undefined;

  return {
    x: clampNumber(box?.x, -999, 999, fallback.x),
    y: clampNumber(box?.y, -999, 999, fallback.y),
    width: clampNumber(box?.width, 10, 9999, fallback.width),
    height: clampNumber(box?.height, 10, 9999, fallback.height),
  };
}

function clampBoxInsideCard(box: Box, cardWidth: number, cardHeight: number): Box {
  const width = Math.min(box.width, cardWidth);
  const height = Math.min(box.height, cardHeight);

  return {
    x: Math.max(0, Math.min(box.x, cardWidth - width)),
    y: Math.max(0, Math.min(box.y, cardHeight - height)),
    width,
    height,
  };
}

function sanitizeTemplateBoxes(template: CardTemplate): CardTemplate {
  return {
    ...template,
    logoBox: clampBoxInsideCard(
      normalizeBox(template.logoBox, DEFAULT.logoBox),
      CARD_WIDTH,
      CARD_HEIGHT
    ),
    bgImageBox: clampBoxInsideCard(
      normalizeBox(template.bgImageBox, DEFAULT.bgImageBox),
      CARD_WIDTH,
      CARD_HEIGHT
    ),
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

const panelStyle: React.CSSProperties = {
  border: "1px solid #e4e4e7",
  borderRadius: 24,
  padding: 18,
  background: "rgba(255,255,255,0.82)",
  boxShadow: "0 10px 30px rgba(0,0,0,0.06)",
  color: "#18181b",
  minWidth: 0,
};

const inputStyle: React.CSSProperties = {
  width: "100%",
  padding: 10,
  borderRadius: 12,
  border: "1px solid #d4d4d8",
  background: "#fff",
  color: "#18181b",
  outline: "none",
  boxSizing: "border-box",
};

const cardShellStyle: React.CSSProperties = {
  width: "100%",
  maxWidth: 420,
  aspectRatio: "420 / 220",
  margin: "0 auto",
};

function TabButton({
  active,
  label,
  onClick,
}: {
  active: boolean;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        padding: "8px 12px",
        borderRadius: 999,
        border: "1px solid #d4d4d8",
        background: active ? "#18181b" : "#fff",
        color: active ? "#fff" : "#18181b",
        fontWeight: 800,
        cursor: "pointer",
      }}
    >
      {label}
    </button>
  );
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return <div style={{ fontWeight: 900, marginBottom: 10 }}>{children}</div>;
}

export default function MerchantTemplatePage() {
  const params = useParams<{ locale: string }>();
  const locale = String(params?.locale ?? "en");
  const t = useTranslations("merchantTemplate");

  const [confirmPassword, setConfirmPassword] = useState("");
  const [tpl, setTpl] = useState<CardTemplate>(DEFAULT);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState("");
  const [err, setErr] = useState("");

  const [activeTab, setActiveTab] = useState<"themes" | "colors" | "fonts" | "images">("themes");
  const [colorSubTab, setColorSubTab] = useState<"color" | "gradient">("color");

  const [editLogo, setEditLogo] = useState(true);
  const [editBg, setEditBg] = useState(true);

  const [isMobile, setIsMobile] = useState(false);
  const [cardScale, setCardScale] = useState(1);

  const fontFamily = useMemo(() => getFontFamily(tpl.font), [tpl.font]);

  const hasBgImg = !!(tpl.bgImageUrl && tpl.bgImageUrl.trim());
  const showBgImg = tpl.bgImageEnabled && hasBgImg;

  useEffect(() => {
    const checkViewport = () => {
      const width = window.innerWidth;
      setIsMobile(width < 900);

      const pagePadding = width < 640 ? 36 : 72;
      const maxCardWidth = CARD_WIDTH;
      const availableWidth = Math.max(280, width - pagePadding);
      const targetWidth = Math.min(maxCardWidth, availableWidth);
      setCardScale(targetWidth / CARD_WIDTH);
    };

    checkViewport();
    window.addEventListener("resize", checkViewport);
    return () => window.removeEventListener("resize", checkViewport);
  }, []);

  const baseBackground = useMemo(() => {
    if (tpl.bgType === "gradient") {
      return `linear-gradient(${tpl.gradient.angle}deg, ${tpl.gradient.from}, ${tpl.gradient.to})`;
    }
    return tpl.bgColor;
  }, [tpl.bgType, tpl.bgColor, tpl.gradient]);

  const cardBaseStyle = useMemo(() => {
    return {
      color: tpl.textColor,
      fontFamily,
      background: baseBackground,
    } as React.CSSProperties;
  }, [tpl.textColor, fontFamily, baseBackground]);

  function resetLayout() {
    setTpl((prev) => ({
      ...prev,
      logoBox: DEFAULT.logoBox,
      bgImageBox: DEFAULT.bgImageBox,
    }));
  }

  async function load() {
    setLoading(true);
    setErr("");
    setMsg("");

    try {
      const res = await fetch(`/api/stores/${STORE_ID}`, { cache: "no-store" });
      const data = await res.json();

      if (!res.ok) {
        setErr(data?.error || t("errors.load"));
        setTpl(DEFAULT);
        return;
      }

      const raw = (data?.cardTemplate || {}) as Partial<CardTemplate> & {
        bgType?: string;
        gradient?: Partial<Gradient>;
        bgImageEnabled?: boolean;
        bgImageOpacity?: number;
        logoBox?: Partial<Box>;
        bgImageBox?: Partial<Box>;
        bgImageUrl?: string;
      };

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
          from: clampHex(raw?.gradient?.from || "") || DEFAULT.gradient.from,
          to: clampHex(raw?.gradient?.to || "") || DEFAULT.gradient.to,
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

      setTpl(sanitizeTemplateBoxes(merged));
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : t("errors.network");
      setErr(message);
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
      if (!confirmPassword.trim()) {
        setErr(t("errors.passwordRequired"));
        return;
      }

      const user = auth.currentUser;
      const email = user?.email || "";

      if (!user || !email) {
        setErr(t("errors.notAuthenticated"));
        return;
      }

      const credential = EmailAuthProvider.credential(email, confirmPassword);
      await reauthenticateWithCredential(user, credential);

      const idToken = await user.getIdToken(true);

      const payload: CardTemplate = sanitizeTemplateBoxes({
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
      });

      const res = await fetch(`/api/stores/${STORE_ID}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${idToken}`,
        },
        body: JSON.stringify({ cardTemplate: payload }),
      });

      const data = await res.json();

      if (!res.ok) {
        setErr(data?.error || t("errors.save"));
        return;
      }

      setTpl(payload);
      setMsg(t("saved"));
      setConfirmPassword("");
    } catch (e: unknown) {
      const message =
        e instanceof Error ? e.message : t("errors.reauthFailed");
      setErr(message);
    } finally {
      setSaving(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  const controlsPanel = (
    <div style={panelStyle}>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          gap: 10,
          alignItems: "center",
          flexWrap: "wrap",
        }}
      >
        <SectionTitle>{t("confirmPassword")}</SectionTitle>
        <button
          onClick={resetLayout}
          type="button"
          style={{
            height: 36,
            borderRadius: 12,
            border: "1px solid #d4d4d8",
            background: "#fff",
            color: "#18181b",
            padding: "0 12px",
            fontSize: 13,
            fontWeight: 700,
            cursor: "pointer",
          }}
        >
          {t("resetLayout")}
        </button>
      </div>

      <input
        type="password"
        value={confirmPassword}
        onChange={(e) => setConfirmPassword(e.target.value)}
        placeholder={t("confirmPasswordPlaceholder")}
        style={inputStyle}
        autoComplete="current-password"
      />

      <div style={{ height: 16 }} />

      <SectionTitle>{t("titleLabel")}</SectionTitle>
      <input
        value={tpl.title}
        onChange={(e) => setTpl({ ...tpl, title: e.target.value })}
        maxLength={40}
        style={inputStyle}
      />

      <div style={{ height: 16 }} />

      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
        <TabButton
          active={activeTab === "themes"}
          label={t("tabs.themes")}
          onClick={() => setActiveTab("themes")}
        />
        <TabButton
          active={activeTab === "colors"}
          label={t("tabs.colors")}
          onClick={() => setActiveTab("colors")}
        />
        <TabButton
          active={activeTab === "fonts"}
          label={t("tabs.fonts")}
          onClick={() => setActiveTab("fonts")}
        />
        <TabButton
          active={activeTab === "images"}
          label={t("tabs.images")}
          onClick={() => setActiveTab("images")}
        />
      </div>

      <div style={{ height: 14 }} />

      {activeTab === "themes" ? (
        <div>
          <SectionTitle>{t("presets")}</SectionTitle>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr",
              gap: 10,
            }}
          >
            {THEME_PRESETS.map((p) => (
              <button
                key={p.name}
                type="button"
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
                  border: "1px solid #d4d4d8",
                  background: "#fff",
                  color: "#18181b",
                  cursor: "pointer",
                  minWidth: 0,
                }}
              >
                <div
                  style={{
                    display: "flex",
                    gap: 8,
                    alignItems: "center",
                    marginBottom: 6,
                    flexWrap: "wrap",
                  }}
                >
                  <span
                    style={{
                      width: 18,
                      height: 18,
                      borderRadius: 6,
                      background: p.bg,
                      border: "1px solid rgba(0,0,0,0.12)",
                    }}
                  />
                  <span
                    style={{
                      width: 18,
                      height: 18,
                      borderRadius: 6,
                      background: p.text,
                      border: "1px solid rgba(0,0,0,0.12)",
                    }}
                  />
                  <span style={{ fontSize: 12, opacity: 0.9 }}>{p.name}</span>
                </div>
                <div style={{ fontFamily: getFontFamily(p.font), fontWeight: 900, fontSize: 14 }}>
                  {FONT_OPTIONS.find((f) => f.key === p.font)?.label.split(" ")[0] ||
                    t("fontFallback")}
                </div>
              </button>
            ))}
          </div>
        </div>
      ) : null}

      {activeTab === "colors" ? (
        <div>
          <SectionTitle>{t("background")}</SectionTitle>

          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <TabButton
              active={colorSubTab === "color"}
              label={t("colorMode.color")}
              onClick={() => {
                setColorSubTab("color");
                setTpl((prev) => ({ ...prev, bgType: "color" }));
              }}
            />
            <TabButton
              active={colorSubTab === "gradient"}
              label={t("colorMode.gradient")}
              onClick={() => {
                setColorSubTab("gradient");
                setTpl((prev) => ({ ...prev, bgType: "gradient" }));
              }}
            />
          </div>

          <div style={{ height: 12 }} />

          <div style={{ fontWeight: 900, marginBottom: 6 }}>{t("textColor")}</div>
          <div
            style={{
              display: "flex",
              gap: 8,
              alignItems: "center",
              marginBottom: 12,
              flexWrap: "wrap",
            }}
          >
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
              style={{ ...inputStyle, flex: 1, minWidth: 140 }}
            />
          </div>

          {colorSubTab === "color" ? (
            <div>
              <SectionTitle>{t("palette")}</SectionTitle>
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: isMobile ? "repeat(4, 1fr)" : "repeat(6, 1fr)",
                  gap: 8,
                }}
              >
                {SWATCHES.map((c) => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => setTpl({ ...tpl, bgType: "color", bgColor: c })}
                    style={{
                      height: 32,
                      borderRadius: 10,
                      border: tpl.bgColor === c ? "2px solid #18181b" : "1px solid #d4d4d8",
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
              <SectionTitle>{t("gradients")}</SectionTitle>
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: isMobile ? "repeat(2, 1fr)" : "repeat(4, 1fr)",
                  gap: 10,
                  marginBottom: 12,
                }}
              >
                {GRADIENT_PRESETS.map((g, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() =>
                      setTpl((prev) => ({
                        ...prev,
                        bgType: "gradient",
                        gradient: g,
                      }))
                    }
                    style={{
                      height: 42,
                      borderRadius: 14,
                      border: "1px solid #d4d4d8",
                      background: `linear-gradient(${g.angle}deg, ${g.from}, ${g.to})`,
                      cursor: "pointer",
                    }}
                  />
                ))}
              </div>

              <div style={{ fontWeight: 900, marginBottom: 6 }}>{t("custom")}</div>

              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr",
                  gap: 10,
                }}
              >
                <div
                  style={{
                    border: "1px solid #d4d4d8",
                    borderRadius: 14,
                    padding: 10,
                    background: "#fff",
                    minWidth: 0,
                    overflow: "hidden",
                  }}
                >
                  <div style={{ fontWeight: 800, marginBottom: 8 }}>{t("color1")}</div>
                  <div style={{ width: "100%", overflowX: "auto" }}>
                    <HexColorPicker
                      color={clampHex(tpl.gradient.from) || DEFAULT.gradient.from}
                      onChange={(v) =>
                        setTpl((p) => ({
                          ...p,
                          bgType: "gradient",
                          gradient: { ...p.gradient, from: v },
                        }))
                      }
                    />
                  </div>
                </div>

                <div
                  style={{
                    border: "1px solid #d4d4d8",
                    borderRadius: 14,
                    padding: 10,
                    background: "#fff",
                    minWidth: 0,
                    overflow: "hidden",
                  }}
                >
                  <div style={{ fontWeight: 800, marginBottom: 8 }}>{t("color2")}</div>
                  <div style={{ width: "100%", overflowX: "auto" }}>
                    <HexColorPicker
                      color={clampHex(tpl.gradient.to) || DEFAULT.gradient.to}
                      onChange={(v) =>
                        setTpl((p) => ({
                          ...p,
                          bgType: "gradient",
                          gradient: { ...p.gradient, to: v },
                        }))
                      }
                    />
                  </div>
                </div>
              </div>

              <div style={{ height: 10 }} />

              <div style={{ fontWeight: 900, marginBottom: 6 }}>
                {t("angle")}: {Math.round(tpl.gradient.angle)}°
              </div>
              <input
                type="range"
                min={0}
                max={360}
                value={tpl.gradient.angle}
                onChange={(e) =>
                  setTpl((p) => ({
                    ...p,
                    bgType: "gradient",
                    gradient: { ...p.gradient, angle: Number(e.target.value) },
                  }))
                }
                style={{ width: "100%" }}
              />
            </div>
          ) : null}
        </div>
      ) : null}

      {activeTab === "images" ? (
        <div>
          <SectionTitle>{t("tabs.images")}</SectionTitle>

          <div style={{ fontWeight: 800, marginBottom: 6 }}>{t("logoUrl")}</div>
          <input
            value={tpl.logoUrl || ""}
            onChange={(e) => setTpl({ ...tpl, logoUrl: e.target.value })}
            placeholder={t("logoUrlPlaceholder")}
            style={inputStyle}
          />

          <div style={{ height: 10 }} />

          <div style={{ fontWeight: 800, marginBottom: 6 }}>{t("backgroundImageUrl")}</div>
          <input
            value={tpl.bgImageUrl || ""}
            onChange={(e) =>
              setTpl({ ...tpl, bgImageUrl: e.target.value, bgImageEnabled: true })
            }
            placeholder={t("backgroundImagePlaceholder")}
            style={inputStyle}
          />

          <div style={{ height: 10 }} />

          <label
            style={{
              display: "flex",
              gap: 10,
              alignItems: "center",
              fontWeight: 900,
              flexWrap: "wrap",
            }}
          >
            <input
              type="checkbox"
              checked={tpl.bgImageEnabled}
              onChange={(e) => setTpl({ ...tpl, bgImageEnabled: e.target.checked })}
            />
            {t("showBackgroundImage")}
          </label>

          <div style={{ height: 10 }} />

          <div style={{ fontWeight: 900, marginBottom: 6 }}>
            {t("imageOpacity")}: {Math.round(tpl.bgImageOpacity * 100)}%
          </div>
          <input
            type="range"
            min={0}
            max={100}
            value={Math.round(tpl.bgImageOpacity * 100)}
            onChange={(e) => setTpl({ ...tpl, bgImageOpacity: Number(e.target.value) / 100 })}
            style={{ width: "100%" }}
          />

          <div style={{ fontSize: 12, color: "#71717a", marginTop: 8 }}>
            {t("imagesHelp")}
          </div>
        </div>
      ) : null}

      {activeTab === "fonts" ? (
        <div>
          <SectionTitle>{t("tabs.fonts")}</SectionTitle>
          <div style={{ display: "grid", gap: 10 }}>
            {FONT_OPTIONS.map((f) => {
              const active = tpl.font === f.key;
              return (
                <button
                  key={f.key}
                  type="button"
                  onClick={() => setTpl({ ...tpl, font: f.key })}
                  style={{
                    textAlign: "left",
                    padding: 12,
                    borderRadius: 14,
                    border: active ? "2px solid #18181b" : "1px solid #d4d4d8",
                    background: "#fff",
                    color: "#18181b",
                    cursor: "pointer",
                    minWidth: 0,
                  }}
                >
                  <div style={{ fontSize: 12, opacity: 0.8, marginBottom: 6 }}>{f.label}</div>
                  <div style={{ fontFamily: f.family, fontWeight: 900, fontSize: 18 }}>
                    {t("previewTitleExample")}
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      ) : null}
    </div>
  );

  const previewPanel = (
    <div
      style={{
        ...panelStyle,
        position: isMobile ? "relative" : "sticky",
        top: isMobile ? undefined : 18,
      }}
    >
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "baseline",
          marginBottom: 10,
          gap: 12,
          flexWrap: "wrap",
        }}
      >
        <div style={{ fontWeight: 900, fontSize: 18 }}>{t("preview")}</div>

        <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
          <label
            style={{
              display: "flex",
              gap: 6,
              alignItems: "center",
              fontSize: 12,
              color: "#52525b",
            }}
          >
            <input
              type="checkbox"
              checked={editLogo}
              onChange={(e) => setEditLogo(e.target.checked)}
            />
            {t("editLogo")}
          </label>

          <label
            style={{
              display: "flex",
              gap: 6,
              alignItems: "center",
              fontSize: 12,
              color: "#52525b",
            }}
          >
            <input
              type="checkbox"
              checked={editBg}
              onChange={(e) => setEditBg(e.target.checked)}
            />
            {t("editBackground")}
          </label>

          <div style={{ color: "#71717a", fontSize: 12 }}>
            {loading ? t("loading") : t("live")} • {STORE_ID}
          </div>
        </div>
      </div>

      <div style={cardShellStyle}>
        <div
          style={{
            ...cardBaseStyle,
            width: "100%",
            height: "100%",
            borderRadius: 22,
            position: "relative",
            boxShadow: "0 14px 35px rgba(0,0,0,0.25)",
            border: "1px solid rgba(255,255,255,0.10)",
            overflow: "hidden",
          }}
        >
          {showBgImg ? (
            <Rnd
              bounds="parent"
              disableDragging={!editBg}
              enableResizing={editBg}
              scale={cardScale}
              size={{
                width: tpl.bgImageBox.width * cardScale,
                height: tpl.bgImageBox.height * cardScale,
              }}
              position={{
                x: tpl.bgImageBox.x * cardScale,
                y: tpl.bgImageBox.y * cardScale,
              }}
              onDragStop={(_, d) => {
                setTpl((p) => ({
                  ...p,
                  bgImageBox: clampBoxInsideCard(
                    {
                      ...p.bgImageBox,
                      x: d.x / cardScale,
                      y: d.y / cardScale,
                    },
                    CARD_WIDTH,
                    CARD_HEIGHT
                  ),
                }));
              }}
              onResizeStop={(_, __, ref, ___, position) => {
                const w = ref.offsetWidth / cardScale;
                const h = ref.offsetHeight / cardScale;
                setTpl((p) => ({
                  ...p,
                  bgImageBox: clampBoxInsideCard(
                    {
                      x: position.x / cardScale,
                      y: position.y / cardScale,
                      width: w,
                      height: h,
                    },
                    CARD_WIDTH,
                    CARD_HEIGHT
                  ),
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

          <div
            style={{
              position: "absolute",
              inset: 0,
              padding: 18 * cardScale,
              zIndex: 20,
              pointerEvents: editBg ? "none" : "auto",
            }}
          >
            <div
              style={{
                position: "absolute",
                top: 18 * cardScale,
                right: 18 * cardScale,
                fontWeight: 900,
                fontSize: 18 * cardScale,
                opacity: 0.95,
              }}
            >
              {t("previewScore")}
            </div>

            <div
              style={{
                position: "absolute",
                top: 18 * cardScale,
                left: 18 * cardScale,
                right: 90 * cardScale,
              }}
            >
              <div
                style={{
                  fontSize: 26 * cardScale,
                  fontWeight: 900,
                  lineHeight: 1.05,
                  wordBreak: "break-word",
                }}
              >
                {tpl.title || t("loyaltyCard")}
              </div>

              <div
                style={{
                  opacity: 0.9,
                  fontSize: 12 * cardScale,
                  marginTop: 4 * cardScale,
                }}
              >
                {t("loyaltyProgram")} •{" "}
                {FONT_OPTIONS.find((f) => f.key === tpl.font)?.label || t("fontDefault")}
              </div>
            </div>

            <div
              style={{
                position: "absolute",
                left: 18 * cardScale,
                bottom: 16 * cardScale,
                fontSize: 13 * cardScale,
                opacity: 0.9,
              }}
            >
              {t("ownerPreview")}
            </div>
          </div>

          <Rnd
            bounds="parent"
            disableDragging={!editLogo}
            enableResizing={editLogo}
            scale={cardScale}
            size={{
              width: tpl.logoBox.width * cardScale,
              height: tpl.logoBox.height * cardScale,
            }}
            position={{
              x: tpl.logoBox.x * cardScale,
              y: tpl.logoBox.y * cardScale,
            }}
            onDragStop={(_, d) => {
              setTpl((p) => ({
                ...p,
                logoBox: clampBoxInsideCard(
                  {
                    ...p.logoBox,
                    x: d.x / cardScale,
                    y: d.y / cardScale,
                  },
                  CARD_WIDTH,
                  CARD_HEIGHT
                ),
              }));
            }}
            onResizeStop={(_, __, ref, ___, position) => {
              const w = ref.offsetWidth / cardScale;
              const h = ref.offsetHeight / cardScale;
              setTpl((p) => ({
                ...p,
                logoBox: clampBoxInsideCard(
                  {
                    x: position.x / cardScale,
                    y: position.y / cardScale,
                    width: w,
                    height: h,
                  },
                  CARD_WIDTH,
                  CARD_HEIGHT
                ),
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

      <div style={{ marginTop: 12, color: "#71717a", fontSize: 12, lineHeight: 1.35 }}>
        {t("previewHelp")}
      </div>
    </div>
  );

  return (
    <main
      style={{
        minHeight: "100vh",
        padding: isMobile ? 14 : 18,
        background: "linear-gradient(180deg, #fafaf9 0%, #f4f4f5 45%, #f8fafc 100%)",
        fontFamily:
          'Inter, Arial, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
        color: "#18181b",
      }}
    >
      <div style={{ maxWidth: 1200, margin: "0 auto", display: "grid", gap: 18 }}>
        <section
          style={{
            display: "flex",
            justifyContent: "space-between",
            gap: 12,
            flexWrap: "wrap",
            alignItems: "flex-start",
          }}
        >
          <div style={{ minWidth: 0 }}>
            <div
              style={{
                fontSize: 13,
                fontWeight: 700,
                letterSpacing: 0.6,
                textTransform: "uppercase",
                color: "#71717a",
                marginBottom: 6,
              }}
            >
              {t("merchantTemplate")}
            </div>

            <h1
              style={{
                fontSize: isMobile ? 28 : 32,
                lineHeight: 1.05,
                margin: 0,
                color: "#18181b",
              }}
            >
              {t("pageTitle")}
            </h1>

            <p
              style={{
                margin: "8px 0 0",
                color: "#52525b",
                fontSize: 15,
                maxWidth: 720,
              }}
            >
              {t("pageDescription")}
            </p>
          </div>

          <div
            style={{
              display: "flex",
              gap: 10,
              alignItems: "center",
              flexWrap: "wrap",
              width: isMobile ? "100%" : "auto",
            }}
          >
            <Link
              href={`/${locale}/merchant`}
              style={{
                height: 44,
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                borderRadius: 16,
                border: "none",
                background: "#18181b",
                color: "#fff",
                padding: "0 16px",
                fontSize: 14,
                fontWeight: 700,
                textDecoration: "none",
                minWidth: isMobile ? 0 : undefined,
                flex: isMobile ? 1 : undefined,
              }}
            >
              ← {t("back")}
            </Link>

            <button
              onClick={load}
              disabled={loading}
              style={{
                height: 44,
                borderRadius: 16,
                border: "1px solid #d4d4d8",
                background: "#f4f4f5",
                color: "#18181b",
                padding: "0 16px",
                fontSize: 14,
                fontWeight: 700,
                cursor: loading ? "default" : "pointer",
                flex: isMobile ? 1 : undefined,
              }}
            >
              {loading ? t("loading") : t("refresh")}
            </button>

            <button
              onClick={save}
              disabled={saving}
              style={{
                height: 44,
                borderRadius: 16,
                border: "none",
                background: "#18181b",
                color: "#fff",
                padding: "0 16px",
                fontSize: 14,
                fontWeight: 800,
                cursor: saving ? "default" : "pointer",
                boxShadow: "0 10px 24px rgba(24,24,27,0.22)",
                flex: isMobile ? 1 : undefined,
              }}
            >
              {saving ? t("saving") : t("save")}
            </button>
          </div>
        </section>

        {err ? (
          <section
            style={{
              border: "1px solid #fecaca",
              background: "#fff1f2",
              color: "#881337",
              padding: 14,
              borderRadius: 18,
            }}
          >
            <div style={{ fontWeight: 800, marginBottom: 6 }}>{t("error")}</div>
            <div>{err}</div>
          </section>
        ) : null}

        {msg ? (
          <section
            style={{
              border: "1px solid #bbf7d0",
              background: "#f0fdf4",
              color: "#166534",
              padding: 14,
              borderRadius: 18,
            }}
          >
            <div style={{ fontWeight: 800 }}>{msg}</div>
          </section>
        ) : null}

        <div
          style={{
            display: "grid",
            gridTemplateColumns: isMobile ? "1fr" : "minmax(360px, 440px) minmax(0, 1fr)",
            gap: 16,
            alignItems: "start",
          }}
        >
          {isMobile ? (
            <>
              {previewPanel}
              {controlsPanel}
            </>
          ) : (
            <>
              {controlsPanel}
              {previewPanel}
            </>
          )}
        </div>
      </div>
    </main>
  );
}