"use client";

import React, { useEffect, useRef, useState } from "react";

type CardTemplate = {
  title?: string;
  scoreText?: string;

  bgColor?: string;
  bgGradient?: string;

  bgImageUrl?: string;
  bgImageOpacity?: number;

  logoUrl?: string;
};

const BASE_W = 420;
const BASE_H = 220;

function clamp01(n: number) {
  if (Number.isNaN(n)) return 0;
  return Math.max(0, Math.min(1, n));
}

export default function CardCanvas({ template }: { template: CardTemplate }) {
  const wrapRef = useRef<HTMLDivElement | null>(null);
  const titleRef = useRef<HTMLDivElement | null>(null);

  const [scale, setScale] = useState(1);

  // font du titre (en px) ajustée automatiquement pour tenir sur 1 ligne
  const [titlePx, setTitlePx] = useState<number>(38);

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

  // Recalcule la taille du titre quand le scale ou le texte change
  useEffect(() => {
    const base = 38 * scale;
    setTitlePx(base);

    const raf = requestAnimationFrame(() => {
      const el = titleRef.current;
      if (!el) return;

      // On veut que le texte rentre dans la largeur dispo (1 ligne)
      const maxW = el.clientWidth;
      const sw = el.scrollWidth;

      if (maxW <= 0 || sw <= 0) return;

      if (sw > maxW) {
        // ratio pour faire rentrer (petite marge)
        const ratio = (maxW / sw) * 0.98;
        const minPx = 16 * scale; // limite basse pour pas devenir illisible
        const next = Math.max(minPx, base * ratio);
        setTitlePx(next);
      }
    });

    return () => cancelAnimationFrame(raf);
  }, [scale, template.title]);

  const background = template.bgGradient ? template.bgGradient : template.bgColor || "#111827";
  const bgOpacity = clamp01(template.bgImageOpacity ?? 0.6);

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
          }}
        >
          {template.bgImageUrl ? (
            <img
              src={template.bgImageUrl}
              alt=""
              aria-hidden="true"
              style={{
                position: "absolute",
                inset: 0,
                width: "100%",
                height: "100%",
                objectFit: "cover",
                opacity: bgOpacity,
                transform: "scale(1.02)",
              }}
            />
          ) : null}

          <div
            aria-hidden="true"
            style={{
              position: "absolute",
              inset: 0,
              background: "rgba(0,0,0,0.18)",
            }}
          />

          <div
            style={{
              position: "absolute",
              inset: 0,
              padding: `calc(18px * var(--s))`,
              display: "flex",
              gap: `calc(14px * var(--s))`,
            }}
          >
            {/* GAUCHE */}
            <div
              style={{
                flex: 1,
                minWidth: 0,
                display: "flex",
                flexDirection: "column",
                justifyContent: "space-between",
              }}
            >
              {/* Titre (1 ligne, auto-fit) */}
              <div
                ref={titleRef}
                style={{
                  fontSize: `${titlePx}px`,
                  fontWeight: 800,
                  lineHeight: 1.05,
                  color: "white",
                  whiteSpace: "nowrap",
                  overflow: "hidden", // on évite de casser la carte si qqchose va mal
                  textShadow: "0 2px 12px rgba(0,0,0,0.35)",
                }}
                title={template.title || ""}
              >
                {template.title ?? ""}
              </div>

              {/* Score bas gauche */}
              <div
                style={{
                  alignSelf: "flex-start",
                  fontSize: `calc(26px * var(--s))`,
                  fontWeight: 800,
                  color: "white",
                  padding: `calc(10px * var(--s)) calc(14px * var(--s))`,
                  borderRadius: `calc(14px * var(--s))`,
                  background: "rgba(0,0,0,0.28)",
                  backdropFilter: "blur(6px)",
                }}
              >
                {template.scoreText ?? ""}
              </div>
            </div>

            {/* DROITE = logo gros */}
            <div style={{ width: "36%", position: "relative" }}>
              {template.logoUrl ? (
                <div
                  style={{
                    position: "absolute",
                    inset: 0,
                    borderRadius: `calc(18px * var(--s))`,
                    background: "rgba(255,255,255,0.12)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    padding: `calc(10px * var(--s))`,
                  }}
                >
                  <img
                    src={template.logoUrl}
                    alt=""
                    aria-hidden="true"
                    style={{
                      maxWidth: "100%",
                      maxHeight: "100%",
                      objectFit: "contain",
                    }}
                  />
                </div>
              ) : null}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}