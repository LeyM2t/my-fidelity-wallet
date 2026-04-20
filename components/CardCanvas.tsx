"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
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

type BgType = "color" | "gradient" | "image";

type Gradient = {
  from?: string;
  to?: string;
  angle?: number;
};

type Box = {
  x?: number;
  y?: number;
  width?: number;
  height?: number;
};

type CardTemplate = {
  title?: string;
  scoreText?: string;

  textColor?: string;
  font?: string;

  bgType?: BgType;
  bgColor?: string;
  bgGradient?: string;
  gradient?: Gradient;

  bgImageUrl?: string;
  bgImageEnabled?: boolean;
  bgImageOpacity?: number;
  bgImageBox?: Box;

  logoUrl?: string;
  logoBox?: Box;
};

const BASE_W = 420;
const BASE_H = 220;

const inter = Inter({ subsets: ["latin"], weight: ["400", "600", "800"] });
const poppins = Poppins({ subsets: ["latin"], weight: ["400", "600", "800"] });
const playfair = Playfair_Display({ subsets: ["latin"], weight: ["400", "600", "800"] });
const montserrat = Montserrat({ subsets: ["latin"], weight: ["400", "600", "800"] });
const roboto = Roboto({ subsets: ["latin"], weight: ["400", "700", "900"] });
const lora = Lora({ subsets: ["latin"], weight: ["400", "600", "700"] });
const oswald = Oswald({ subsets: ["latin"], weight: ["400", "600", "700"] });
const nunito = Nunito({ subsets: ["latin"], weight: ["400", "600", "800"] });

function getFontFamily(fontKey?: string) {
  switch (fontKey) {
    case "poppins":
      return poppins.style.fontFamily;
    case "playfair":
      return playfair.style.fontFamily;
    case "montserrat":
      return montserrat.style.fontFamily;
    case "roboto":
      return roboto.style.fontFamily;
    case "lora":
      return lora.style.fontFamily;
    case "oswald":
      return oswald.style.fontFamily;
    case "nunito":
      return nunito.style.fontFamily;
    case "inter":
    default:
      return inter.style.fontFamily;
  }
}

function clamp01(n: number) {
  if (Number.isNaN(n)) return 0;
  return Math.max(0, Math.min(1, n));
}

function clampNumber(
  value: unknown,
  min: number,
  max: number,
  fallback: number
) {
  const n = typeof value === "number" && Number.isFinite(value) ? value : fallback;
  return Math.max(min, Math.min(max, n));
}

function normalizeBox(box: Box | undefined, fallback: Required<Box>): Required<Box> {
  return {
    x: clampNumber(box?.x, -999, 999, fallback.x),
    y: clampNumber(box?.y, -999, 999, fallback.y),
    width: clampNumber(box?.width, 10, 9999, fallback.width),
    height: clampNumber(box?.height, 10, 9999, fallback.height),
  };
}

export default function CardCanvas({ template }: { template: CardTemplate }) {
  const wrapRef = useRef<HTMLDivElement | null>(null);
  const titleRef = useRef<HTMLDivElement | null>(null);

  const [scale, setScale] = useState(1);
  const [titlePx, setTitlePx] = useState<number>(38);

  const textColor = template.textColor || "#ffffff";
  const fontFamily = useMemo(() => getFontFamily(template.font), [template.font]);

  const logoBox = normalizeBox(template.logoBox, {
    x: 18,
    y: 18,
    width: 56,
    height: 56,
  });

  const bgImageBox = normalizeBox(template.bgImageBox, {
    x: 0,
    y: 0,
    width: BASE_W,
    height: BASE_H,
  });

  const background = useMemo(() => {
    if (template.bgGradient) return template.bgGradient;

    if (
      template.bgType === "gradient" &&
      template.gradient?.from &&
      template.gradient?.to
    ) {
      const angle =
        typeof template.gradient.angle === "number" ? template.gradient.angle : 45;
      return `linear-gradient(${angle}deg, ${template.gradient.from}, ${template.gradient.to})`;
    }

    return template.bgColor || "#111827";
  }, [template.bgGradient, template.bgType, template.gradient, template.bgColor]);

  const showBgImage =
    !!template.bgImageUrl &&
    (typeof template.bgImageEnabled === "boolean"
      ? template.bgImageEnabled
      : true);

  const bgOpacity = clamp01(template.bgImageOpacity ?? 0.6);

  useEffect(() => {
    const el = wrapRef.current;
    if (!el) return;

    const ro = new ResizeObserver(() => {
      const w = el.getBoundingClientRect().width;
      if (!w || Number.isNaN(w)) return;
      setScale(w / BASE_W);
    });

    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  useEffect(() => {
    const base = 38 * scale;
    setTitlePx(base);

    const raf = requestAnimationFrame(() => {
      const el = titleRef.current;
      if (!el) return;

      const maxW = el.clientWidth;
      const sw = el.scrollWidth;

      if (maxW <= 0 || sw <= 0) return;

      if (sw > maxW) {
        const ratio = (maxW / sw) * 0.98;
        const minPx = 16 * scale;
        const next = Math.max(minPx, base * ratio);
        setTitlePx(next);
      }
    });

    return () => cancelAnimationFrame(raf);
  }, [scale, template.title, fontFamily]);

  return (
    <div ref={wrapRef} style={{ width: "100%" }}>
      <div
        style={{
          position: "relative",
          width: "100%",
          aspectRatio: `${BASE_W} / ${BASE_H}`,
        }}
      >
        <div
          style={{
            position: "absolute",
            inset: 0,
            borderRadius: 22,
            overflow: "hidden",
            background,
            ["--s" as any]: scale,
            color: textColor,
            fontFamily,
          }}
        >
          {showBgImage ? (
            <img
              src={template.bgImageUrl}
              alt=""
              aria-hidden="true"
              style={{
                position: "absolute",
                left: bgImageBox.x * scale,
                top: bgImageBox.y * scale,
                width: bgImageBox.width * scale,
                height: bgImageBox.height * scale,
                objectFit: "cover",
                opacity: bgOpacity,
              }}
            />
          ) : null}

          {showBgImage ? (
            <div
              aria-hidden="true"
              style={{
                position: "absolute",
                inset: 0,
                background: "rgba(0,0,0,0.18)",
              }}
            />
          ) : null}

          <div
            style={{
              position: "absolute",
              inset: 0,
              padding: `calc(18px * var(--s))`,
            }}
          >
            <div
              style={{
                position: "absolute",
                top: `calc(18px * var(--s))`,
                right: `calc(18px * var(--s))`,
                fontSize: `calc(18px * var(--s))`,
                fontWeight: 900,
                opacity: 0.95,
                textShadow: showBgImage ? "0 2px 12px rgba(0,0,0,0.35)" : "none",
              }}
            >
              {template.scoreText ?? ""}
            </div>

            <div
              style={{
                position: "absolute",
                top: `calc(18px * var(--s))`,
                left: `calc(18px * var(--s))`,
                right: `calc(90px * var(--s))`,
              }}
            >
              <div
                ref={titleRef}
                style={{
                  fontSize: `${titlePx}px`,
                  fontWeight: 800,
                  lineHeight: 1.05,
                  whiteSpace: "nowrap",
                  overflow: "hidden",
                  textShadow: showBgImage ? "0 2px 12px rgba(0,0,0,0.35)" : "none",
                }}
                title={template.title || ""}
              >
                {template.title ?? ""}
              </div>
            </div>

            {template.logoUrl ? (
              <div
                style={{
                  position: "absolute",
                  left: logoBox.x * scale,
                  top: logoBox.y * scale,
                  width: logoBox.width * scale,
                  height: logoBox.height * scale,
                  borderRadius: 16 * scale,
                  background: "rgba(255,255,255,0.12)",
                  border: "1px solid rgba(255,255,255,0.15)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  overflow: "hidden",
                  padding: `calc(6px * var(--s))`,
                  backdropFilter: showBgImage ? "blur(2px)" : undefined,
                }}
              >
                <img
                  src={template.logoUrl}
                  alt=""
                  aria-hidden="true"
                  style={{
                    width: "100%",
                    height: "100%",
                    objectFit: "contain",
                    display: "block",
                  }}
                />
              </div>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
}