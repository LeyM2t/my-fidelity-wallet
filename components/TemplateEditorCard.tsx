"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import { Rnd } from "react-rnd";

const CARD_WIDTH = 420;
const CARD_HEIGHT = 220;

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
  bgType: "color" | "gradient" | "image";
  bgColor: string;
  gradient: {
    from: string;
    to: string;
    angle: number;
  };
  logoUrl?: string;
  bgImageUrl?: string;
  bgImageEnabled: boolean;
  bgImageOpacity: number;
  logoBox: Box;
  bgImageBox: Box;
};

type FontOption = {
  key: string;
  label: string;
  family: string;
};

type Props = {
  tpl: CardTemplate;
  isMobile: boolean;
  cardScale: number;
  showBgImg: boolean;
  fontOptions: readonly FontOption[];
  cardBaseStyle: React.CSSProperties;
  editLogo: boolean;
  editBg: boolean;
  onChange: (updater: (prev: CardTemplate) => CardTemplate) => void;
  previewScore: string;
  loyaltyCardText: string;
  loyaltyProgramText: string;
  ownerPreviewText: string;
  editLogoLabel: string;
  editBackgroundLabel: string;
  fontDefaultLabel: string;
};

const HANDLE_SIZE_DESKTOP = 14;
const HANDLE_SIZE_MOBILE = 22;
const LOGO_SAFE_MARGIN = 0;
const LOGO_MIN_SIZE = 36;
const LOGO_MAX_WIDTH = 220;
const LOGO_MAX_HEIGHT = 180;

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}

function clampBoxInsideCard(
  box: Box,
  cardWidth: number,
  cardHeight: number,
  margin = 0
): Box {
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

function clampLogoBox(box: Box): Box {
  const width = clamp(box.width, LOGO_MIN_SIZE, LOGO_MAX_WIDTH);
  const height = clamp(box.height, LOGO_MIN_SIZE, LOGO_MAX_HEIGHT);

  return clampBoxInsideCard(
    {
      ...box,
      width,
      height,
    },
    CARD_WIDTH,
    CARD_HEIGHT,
    LOGO_SAFE_MARGIN
  );
}

function clampBgBox(box: Box): Box {
  return {
    x: clamp(box.x, -CARD_WIDTH * 2, CARD_WIDTH * 2),
    y: clamp(box.y, -CARD_HEIGHT * 2, CARD_HEIGHT * 2),
    width: clamp(box.width, 40, CARD_WIDTH * 3),
    height: clamp(box.height, 40, CARD_HEIGHT * 3),
  };
}

function buildHandleStyle(size: number): React.CSSProperties {
  return {
    width: size,
    height: size,
    borderRadius: 999,
    background: "rgba(255,255,255,0.98)",
    border: "1px solid rgba(0,0,0,0.35)",
    boxShadow: "0 3px 12px rgba(0,0,0,0.35)",
  };
}

export default function TemplateEditorCard({
  tpl,
  isMobile,
  cardScale,
  showBgImg,
  fontOptions,
  cardBaseStyle,
  editLogo,
  editBg,
  onChange,
  previewScore,
  loyaltyCardText,
  loyaltyProgramText,
  ownerPreviewText,
  fontDefaultLabel,
}: Props) {
  const rootRef = useRef<HTMLDivElement | null>(null);

  const [renderWidth, setRenderWidth] = useState(CARD_WIDTH);
  const [renderHeight, setRenderHeight] = useState(CARD_HEIGHT);

  useEffect(() => {
    const el = rootRef.current;
    if (!el) return;

    const updateSize = () => {
      const rect = el.getBoundingClientRect();
      if (!rect.width || !rect.height) return;
      setRenderWidth(rect.width);
      setRenderHeight(rect.height);
    };

    updateSize();

    const ro = new ResizeObserver(() => updateSize());
    ro.observe(el);

    return () => ro.disconnect();
  }, []);

  const actualScaleX = renderWidth / CARD_WIDTH;
  const actualScaleY = renderHeight / CARD_HEIGHT;
  const actualScale = Math.min(actualScaleX, actualScaleY) || cardScale || 1;

  const handleStyle = buildHandleStyle(
    isMobile ? HANDLE_SIZE_MOBILE : HANDLE_SIZE_DESKTOP
  );

  const title = tpl.title || loyaltyCardText;
  const fontLabel =
    fontOptions.find((f) => f.key === tpl.font)?.label || fontDefaultLabel;

  return (
    <div
      ref={rootRef}
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
          size={{
            width: tpl.bgImageBox.width * actualScaleX,
            height: tpl.bgImageBox.height * actualScaleY,
          }}
          position={{
            x: tpl.bgImageBox.x * actualScaleX,
            y: tpl.bgImageBox.y * actualScaleY,
          }}
          dragHandleClassName="fw-bg-drag-handle"
          onDragStop={(_, d) => {
            onChange((prev) => ({
              ...prev,
              bgImageBox: clampBgBox({
                ...prev.bgImageBox,
                x: d.x / actualScaleX,
                y: d.y / actualScaleY,
              }),
            }));
          }}
          onResizeStop={(_, __, ref, ___, position) => {
            const w = ref.offsetWidth / actualScaleX;
            const h = ref.offsetHeight / actualScaleY;

            onChange((prev) => ({
              ...prev,
              bgImageBox: clampBgBox({
                x: position.x / actualScaleX,
                y: position.y / actualScaleY,
                width: w,
                height: h,
              }),
            }));
          }}
          resizeHandleStyles={{
            topLeft: handleStyle,
            topRight: handleStyle,
            bottomLeft: handleStyle,
            bottomRight: handleStyle,
          }}
          resizeHandleComponent={{
            topLeft: <div />,
            topRight: <div />,
            bottomLeft: <div />,
            bottomRight: <div />,
          }}
          style={{
            zIndex: editBg ? 50 : 1,
            outline: editBg ? "2px dashed rgba(255,255,255,0.55)" : "none",
            borderRadius: 22,
            pointerEvents: editBg ? "auto" : "none",
            opacity: tpl.bgImageOpacity,
          }}
        >
          <div
            className="fw-bg-drag-handle"
            style={{
              width: "100%",
              height: "100%",
              cursor: editBg ? "move" : "default",
              touchAction: "none",
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
          </div>
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
          padding: 18 * actualScale,
          zIndex: 20,
          pointerEvents: editBg ? "none" : "auto",
        }}
      >
        <div
          style={{
            position: "absolute",
            top: 18 * actualScale,
            right: 18 * actualScale,
            fontWeight: 900,
            fontSize: 18 * actualScale,
            opacity: 0.95,
            textShadow: showBgImg ? "0 2px 12px rgba(0,0,0,0.35)" : "none",
          }}
        >
          {previewScore}
        </div>

        <div
          style={{
            position: "absolute",
            top: 18 * actualScale,
            left: 18 * actualScale,
            right: 90 * actualScale,
          }}
        >
          <div
            style={{
              fontSize: 26 * actualScale,
              fontWeight: 900,
              lineHeight: 1.05,
              wordBreak: "break-word",
              textShadow: showBgImg ? "0 2px 12px rgba(0,0,0,0.35)" : "none",
            }}
          >
            {title}
          </div>

          <div
            style={{
              opacity: 0.9,
              fontSize: 12 * actualScale,
              marginTop: 4 * actualScale,
              textShadow: showBgImg ? "0 2px 12px rgba(0,0,0,0.35)" : "none",
            }}
          >
            {loyaltyProgramText} • {fontLabel}
          </div>
        </div>

        <div
          style={{
            position: "absolute",
            left: 18 * actualScale,
            bottom: 16 * actualScale,
            fontSize: 13 * actualScale,
            opacity: 0.9,
            textShadow: showBgImg ? "0 2px 12px rgba(0,0,0,0.35)" : "none",
          }}
        >
          {ownerPreviewText}
        </div>
      </div>

      <Rnd
        bounds="parent"
        disableDragging={!editLogo}
        enableResizing={editLogo}
        lockAspectRatio={!!tpl.logoUrl}
        size={{
          width: tpl.logoBox.width * actualScaleX,
          height: tpl.logoBox.height * actualScaleY,
        }}
        position={{
          x: tpl.logoBox.x * actualScaleX,
          y: tpl.logoBox.y * actualScaleY,
        }}
        dragHandleClassName="fw-logo-drag-handle"
        onDragStop={(_, d) => {
          onChange((prev) => ({
            ...prev,
            logoBox: clampLogoBox({
              ...prev.logoBox,
              x: d.x / actualScaleX,
              y: d.y / actualScaleY,
            }),
          }));
        }}
        onResizeStop={(_, __, ref, ___, position) => {
          const w = ref.offsetWidth / actualScaleX;
          const h = ref.offsetHeight / actualScaleY;

          onChange((prev) => ({
            ...prev,
            logoBox: clampLogoBox({
              x: position.x / actualScaleX,
              y: position.y / actualScaleY,
              width: w,
              height: h,
            }),
          }));
        }}
        resizeHandleStyles={{
          topLeft: handleStyle,
          topRight: handleStyle,
          bottomLeft: handleStyle,
          bottomRight: handleStyle,
        }}
        resizeHandleComponent={{
          topLeft: <div />,
          topRight: <div />,
          bottomLeft: <div />,
          bottomRight: <div />,
        }}
        style={{
          zIndex: editLogo ? 60 : 30,
          outline: editLogo ? "2px dashed rgba(255,255,255,0.65)" : "none",
          borderRadius: 16,
          pointerEvents: editLogo ? "auto" : "none",
          overflow: "visible",
          background: "transparent",
          border: "none",
        }}
      >
        <div
          className="fw-logo-drag-handle"
          style={{
            width: "100%",
            height: "100%",
            cursor: editLogo ? "move" : "default",
            touchAction: "none",
            padding: 0,
            boxSizing: "border-box",
            background: "transparent",
            border: "none",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          {tpl.logoUrl ? (
            <img
              src={tpl.logoUrl}
              alt="logo"
              style={{
                width: "100%",
                height: "100%",
                objectFit: "contain",
                objectPosition: "center",
                background: "transparent",
                border: "none",
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
                background: "transparent",
                border: editLogo ? "1px dashed rgba(255,255,255,0.35)" : "none",
                borderRadius: 16,
              }}
            />
          )}
        </div>
      </Rnd>
    </div>
  );
}