"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";

type CardTemplate = {
  title?: string;
  scoreText?: string; // ex "8/10"
  // Background
  bgColor?: string; // ex "#111827"
  bgGradient?: string; // ex "linear-gradient(...)"
  bgImageUrl?: string; // url
  bgImageOpacity?: number; // 0..1
  // Logo
  logoUrl?: string;
};

type Props = {
  template: CardTemplate;
  // Si tu veux forcer une taille (sinon il s’adapte au parent)
  maxWidth?: number; // px
  className?: string;
};

const BASE_W = 420;
const BASE_H = 220;

function clamp01(n: number) {
  if (Number.isNaN(n)) return 0;
  return Math.max(0, Math.min(1, n));
}

export default function CardCanvas({ template, maxWidth, className }: Props) {
  const wrapRef = useRef<HTMLDivElement | null>(null);
  const [scale, setScale] = useState(1);

  // calc le scale = width / 420
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

  const bgStyle = useMemo<React.CSSProperties>(() => {
    const style: React.CSSProperties = {};
    if (template.bgGradient) {
      style.backgroundImage = template.bgGradient;
    } else if (template.bgColor) {
      style.background = template.bgColor;
    } else {
      style.background = "#0b0f19";
    }
    return style;
  }, [template.bgColor, template.bgGradient]);

  const imgOpacity = clamp01(template.bgImageOpacity ?? 0.35);

  return (
    <div
      ref={wrapRef}
      className={className}
      style={{
        width: "100%",
        maxWidth: maxWidth ? `${maxWidth}px` : undefined,
      }}
    >
      {/* Container ratio */}
      <div
        style={{
          position: "relative",
          width: "100%",
          aspectRatio: `${BASE_W} / ${BASE_H}`,
        }}
      >
        {/* Canvas logique 420x220 */}
        <div
          style={{
            position: "absolute",
            inset: 0,
            borderRadius: `calc(18px * ${scale})`,
            overflow: "hidden",
            ...bgStyle,

            // variable de scale dispo partout
            ["--s" as any]: scale,
          }}
        >
          {/* Background image */}
          {template.bgImageUrl ? (
            <div
              style={{
                position: "absolute",
                inset: 0,
                backgroundImage: `url(${template.bgImageUrl})`,
                backgroundSize: "cover",
                backgroundPosition: "center",
                opacity: imgOpacity,
              }}
            />
          ) : null}

          {/* contenu */}
          <div
            style={{
              position: "relative",
              height: "100%",
              width: "100%",
              // padding logique, scalé
              padding: `calc(18px * var(--s))`,
              display: "flex",
              flexDirection: "column",
              justifyContent: "space-between",
            }}
          >
            {/* top row */}
            <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: `calc(12px * var(--s))` }}>
              {/* logo */}
              <div style={{ display: "flex", alignItems: "center", gap: `calc(10px * var(--s))` }}>
                {template.logoUrl ? (
                  <img
                    src={template.logoUrl}
                    alt="logo"
                    style={{
                      width: `calc(56px * var(--s))`,
                      height: `calc(56px * var(--s))`,
                      objectFit: "contain",
                      borderRadius: `calc(12px * var(--s))`,
                    }}
                  />
                ) : null}

                {/* titre */}
                <div
                  style={{
                    fontSize: `calc(36px * var(--s))`,
                    lineHeight: 1.05,
                    fontWeight: 800,
                    color: "white",
                    maxWidth: "100%",
                    overflow: "hidden",
                    display: "-webkit-box",
                    WebkitLineClamp: 2,
                    WebkitBoxOrient: "vertical",
                    textShadow: "0 1px 12px rgba(0,0,0,0.35)",
                  }}
                >
                  {template.title ?? ""}
                </div>
              </div>
            </div>

            {/* bottom row */}
            <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between" }}>
              {/* score */}
              <div
                style={{
                  fontSize: `calc(28px * var(--s))`,
                  fontWeight: 800,
                  color: "white",
                  padding: `calc(10px * var(--s)) calc(14px * var(--s))`,
                  borderRadius: `calc(14px * var(--s))`,
                  background: "rgba(0,0,0,0.25)",
                  backdropFilter: "blur(6px)",
                }}
              >
                {template.scoreText ?? ""}
              </div>

              {/* placeholder zone (ex: petit pictogramme / rien) */}
              <div />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}