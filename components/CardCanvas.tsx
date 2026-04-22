"use client";

import React, { useMemo } from "react";
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
const CARD_PADDING = 18;

const LOGO_SAFE_MARGIN = 0;
const LOGO_MIN_SIZE = 36;
const LOGO_MAX_WIDTH = 220;
const LOGO_MAX_HEIGHT = 180;

const inter = Inter({ subsets: ["latin"], weight: ["400", "600", "800"] });
const poppins = Poppins({ subsets: ["latin"], weight: ["400", "600", "800"] });
const playfair = Playfair_Display({
  subsets: ["latin"],
  weight: ["400", "600", "800"],
});
const montserrat = Montserrat({
  subsets: ["latin"],
  weight: ["400", "600", "800"],
});
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

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}

function clampNumber(
  value: unknown,
  min: number,
  max: number,
  fallback: number
) {
  const n =
    typeof value === "number" && Number.isFinite(value) ? value : fallback;
  return clamp(n, min, max);
}

function clamp01(n: number) {
  if (Number.isNaN(n)) return 0;
  return Math.max(0, Math.min(1, n));
}

function normalizeBox(
  box: Box | undefined,
  fallback: Required<Box>
): Required<Box> {
  return {
    x: clampNumber(box?.x, -9999, 9999, fallback.x),
    y: clampNumber(box?.y, -9999, 9999, fallback.y),
    width: clampNumber(box?.width, 10, 9999, fallback.width),
    height: clampNumber(box?.height, 10, 9999, fallback.height),
  };
}

function clampBoxInsideCard(
  box: Required<Box>,
  cardWidth: number,
  cardHeight: number,
  margin = 0
): Required<Box> {
  const maxWidth = Math.max(10, cardWidth - margin * 2);
  const maxHeight = Math.max(10, cardHeight - margin * 2);

  const width = clamp(box.width, 10, maxWidth);
  const height = clamp(box.height, 10, maxHeight);

  const maxX = Math.max(margin, cardWidth - margin - width);
  const maxY = Math.max(margin, cardHeight - margin - height);

  const x = clamp(box.x, margin, maxX);
  const y = clamp(box.y, margin, maxY);

  return { x, y, width, height };
}

function clampLogoBox(box: Required<Box>): Required<Box> {
  const width = clamp(box.width, LOGO_MIN_SIZE, LOGO_MAX_WIDTH);
  const height = clamp(box.height, LOGO_MIN_SIZE, LOGO_MAX_HEIGHT);

  return clampBoxInsideCard(
    {
      ...box,
      width,
      height,
    },
    BASE_W,
    BASE_H,
    LOGO_SAFE_MARGIN
  );
}

function clampBgBox(box: Required<Box>): Required<Box> {
  return {
    x: clamp(box.x, -BASE_W * 2, BASE_W * 2),
    y: clamp(box.y, -BASE_H * 2, BASE_H * 2),
    width: clamp(box.width, 40, BASE_W * 3),
    height: clamp(box.height, 40, BASE_H * 3),
  };
}

function safeImageSrc(url?: string) {
  const u = (url || "").trim();
  if (!u) return "";
  if (u.startsWith("/")) return u;
  if (/^https?:\/\/[^\s]+$/i.test(u)) return u;
  return "";
}

export default function CardCanvas({ template }: { template: CardTemplate }) {
  const fontFamily = useMemo(
    () => getFontFamily(template.font),
    [template.font]
  );

  const logoBox = useMemo(() => {
    const raw = normalizeBox(template.logoBox, {
      x: 18,
      y: 18,
      width: 56,
      height: 56,
    });

    return clampLogoBox(raw);
  }, [template.logoBox]);

  const bgImageBox = useMemo(() => {
    const raw = normalizeBox(template.bgImageBox, {
      x: 0,
      y: 0,
      width: BASE_W,
      height: BASE_H,
    });

    return clampBgBox(raw);
  }, [template.bgImageBox]);

  const background = useMemo(() => {
    if (template.bgGradient) return template.bgGradient;

    if (
      template.bgType === "gradient" &&
      template.gradient?.from &&
      template.gradient?.to
    ) {
      const angle =
        typeof template.gradient.angle === "number"
          ? template.gradient.angle
          : 45;

      return `linear-gradient(${angle}deg, ${template.gradient.from}, ${template.gradient.to})`;
    }

    return template.bgColor || "#111827";
  }, [template.bgGradient, template.bgType, template.gradient, template.bgColor]);

  const safeBgImageUrl = safeImageSrc(template.bgImageUrl);
  const safeLogoUrl = safeImageSrc(template.logoUrl);

  const showBgImage =
    !!safeBgImageUrl &&
    (typeof template.bgImageEnabled === "boolean"
      ? template.bgImageEnabled
      : true);

  const bgOpacity = clamp01(template.bgImageOpacity ?? 0.7);
  const textColor = template.textColor || "#ffffff";

  return (
    <div style={{ width: "100%" }}>
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
            color: textColor,
            fontFamily,
            boxShadow: "0 14px 35px rgba(0,0,0,0.18)",
          }}
        >
          {showBgImage ? (
            <img
              src={safeBgImageUrl}
              alt=""
              aria-hidden="true"
              style={{
                position: "absolute",
                left: `${(bgImageBox.x / BASE_W) * 100}%`,
                top: `${(bgImageBox.y / BASE_H) * 100}%`,
                width: `${(bgImageBox.width / BASE_W) * 100}%`,
                height: `${(bgImageBox.height / BASE_H) * 100}%`,
                objectFit: "cover",
                opacity: bgOpacity,
                display: "block",
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
              padding: CARD_PADDING,
            }}
          >
            <div
              style={{
                position: "absolute",
                top: CARD_PADDING,
                right: CARD_PADDING,
                fontSize: 18,
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
                top: CARD_PADDING,
                left: CARD_PADDING,
                right: 90,
              }}
            >
              <div
                style={{
                  fontSize: 26,
                  fontWeight: 900,
                  lineHeight: 1.05,
                  wordBreak: "break-word",
                  textShadow: showBgImage ? "0 2px 12px rgba(0,0,0,0.35)" : "none",
                }}
              >
                {template.title ?? ""}
              </div>
            </div>

            {safeLogoUrl ? (
              <div
                style={{
                  position: "absolute",
                  left: `${(logoBox.x / BASE_W) * 100}%`,
                  top: `${(logoBox.y / BASE_H) * 100}%`,
                  width: `${(logoBox.width / BASE_W) * 100}%`,
                  height: `${(logoBox.height / BASE_H) * 100}%`,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  overflow: "hidden",
                  background: "transparent",
                  border: "none",
                }}
              >
                <img
                  src={safeLogoUrl}
                  alt=""
                  aria-hidden="true"
                  style={{
                    width: "100%",
                    height: "100%",
                    objectFit: "contain",
                    objectPosition: "center",
                    display: "block",
                    background: "transparent",
                    border: "none",
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