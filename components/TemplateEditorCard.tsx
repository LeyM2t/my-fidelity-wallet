"use client";

import React from "react";
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
const LOGO_SAFE_MARGIN = 8;
const BG_SAFE_MARGIN = 0;
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

  const x = clamp(box.x, margin, cardWidth - margin - width);
  const y = clamp(box.y, margin, cardHeight - margin - height);

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
  editLogoLabel,
  editBackgroundLabel,
  fontDefaultLabel,
}: Props) {
  const handleStyle = buildHandleStyle(
    isMobile ? HANDLE_SIZE_MOBILE : HANDLE_SIZE_DESKTOP
  );

  const title = tpl.title || loyaltyCardText;
  const fontLabel =
    fontOptions.find((f) => f.key === tpl.font)?.label || fontDefaultLabel;

  return (
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
          dragHandleClassName="fw-bg-drag-handle"
          onDragStop={(_, d) => {
            onChange((prev) => ({
              ...prev,
              bgImageBox: clampBgBox({
                ...prev.bgImageBox,
                x: d.x / cardScale,
                y: d.y / cardScale,
              }),
            }));
          }}
          onResizeStop={(_, __, ref, ___, position) => {
            const w = ref.offsetWidth / cardScale;
            const h = ref.offsetHeight / cardScale;

            onChange((prev) => ({
              ...prev,
              bgImageBox: clampBgBox({
                x: position.x / cardScale,
                y: position.y / cardScale,
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
            textShadow: showBgImg ? "0 2px 12px rgba(0,0,0,0.35)" : "none",
          }}
        >
          {previewScore}
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
              textShadow: showBgImg ? "0 2px 12px rgba(0,0,0,0.35)" : "none",
            }}
          >
            {title}
          </div>

          <div
            style={{
              opacity: 0.9,
              fontSize: 12 * cardScale,
              marginTop: 4 * cardScale,
              textShadow: showBgImg ? "0 2px 12px rgba(0,0,0,0.35)" : "none",
            }}
          >
            {loyaltyProgramText} • {fontLabel}
          </div>
        </div>

        <div
          style={{
            position: "absolute",
            left: 18 * cardScale,
            bottom: 16 * cardScale,
            fontSize: 13 * cardScale,
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
        scale={cardScale}
        size={{
          width: tpl.logoBox.width * cardScale,
          height: tpl.logoBox.height * cardScale,
        }}
        position={{
          x: tpl.logoBox.x * cardScale,
          y: tpl.logoBox.y * cardScale,
        }}
        dragHandleClassName="fw-logo-drag-handle"
        onDragStop={(_, d) => {
          onChange((prev) => ({
            ...prev,
            logoBox: clampLogoBox({
              ...prev.logoBox,
              x: d.x / cardScale,
              y: d.y / cardScale,
            }),
          }));
        }}
        onResizeStop={(_, __, ref, ___, position) => {
          const w = ref.offsetWidth / cardScale;
          const h = ref.offsetHeight / cardScale;

          onChange((prev) => ({
            ...prev,
            logoBox: clampLogoBox({
              x: position.x / cardScale,
              y: position.y / cardScale,
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
        }}
      >
        <div
          className="fw-logo-drag-handle"
          style={{
            width: "100%",
            height: "100%",
            cursor: editLogo ? "move" : "default",
            touchAction: "none",
            padding: isMobile ? 2 : 0,
            boxSizing: "border-box",
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
        </div>
      </Rnd>

      {isMobile ? (
        <div
          style={{
            position: "absolute",
            left: 12,
            right: 12,
            bottom: 10,
            zIndex: 80,
            display: "flex",
            justifyContent: "space-between",
            gap: 8,
            pointerEvents: "none",
          }}
        >
          <div
            style={{
              padding: "6px 10px",
              borderRadius: 999,
              background: "rgba(17,24,39,0.72)",
              color: "#fff",
              fontSize: 11,
              fontWeight: 700,
            }}
          >
            {editLogoLabel}: {editLogo ? "ON" : "OFF"}
          </div>

          <div
            style={{
              padding: "6px 10px",
              borderRadius: 999,
              background: "rgba(17,24,39,0.72)",
              color: "#fff",
              fontSize: 11,
              fontWeight: 700,
            }}
          >
            {editBackgroundLabel}: {editBg ? "ON" : "OFF"}
          </div>
        </div>
      ) : null}
    </div>
  );
}