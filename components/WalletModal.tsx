"use client";

import React, { useEffect, useMemo, useState } from "react";
import WalletColorPicker from "@/components/WalletColorPicker";

type Props = {
  open: boolean;
  title: string;
  nameLabel: string;
  colorLabel: string;
  confirmLabel: string;
  cancelLabel: string;
  initialName: string;
  initialColor: string;
  colors: readonly string[];
  loading?: boolean;
  onClose: () => void;
  onConfirm: (payload: { name: string; color: string }) => void;
};

export default function WalletModal({
  open,
  title,
  nameLabel,
  colorLabel,
  confirmLabel,
  cancelLabel,
  initialName,
  initialColor,
  colors,
  loading = false,
  onClose,
  onConfirm,
}: Props) {
  const [name, setName] = useState(initialName);
  const [color, setColor] = useState(initialColor);

  useEffect(() => {
    if (!open) return;
    setName(initialName);
    setColor(initialColor);
  }, [open, initialName, initialColor]);

  useEffect(() => {
    if (!open) return;

    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open, onClose]);

  const disabled = useMemo(() => !name.trim() || loading, [name, loading]);

  if (!open) return null;

  return (
    <div
      onClick={onClose}
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 2000,
        background: "rgba(24,24,27,0.56)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 16,
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width: "100%",
          maxWidth: 520,
          borderRadius: 28,
          background: "#ffffff",
          boxShadow: "0 30px 80px rgba(0,0,0,0.25)",
          overflow: "hidden",
        }}
      >
        <div
          style={{
            padding: 22,
            borderBottom: "1px solid #e4e4e7",
          }}
        >
          <div
            style={{
              fontSize: 22,
              lineHeight: 1.1,
              fontWeight: 900,
              color: "#18181b",
            }}
          >
            {title}
          </div>
        </div>

        <div
          style={{
            padding: 22,
            display: "grid",
            gap: 18,
          }}
        >
          <div>
            <div
              style={{
                fontSize: 14,
                fontWeight: 700,
                color: "#18181b",
                marginBottom: 10,
              }}
            >
              {nameLabel}
            </div>

            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              maxLength={40}
              autoFocus
              style={{
                width: "100%",
                height: 48,
                borderRadius: 16,
                border: "1px solid #d4d4d8",
                padding: "0 14px",
                fontSize: 16,
                color: "#18181b",
                background: "#ffffff",
                boxSizing: "border-box",
                outline: "none",
              }}
            />
          </div>

          <WalletColorPicker
            colors={colors}
            value={color}
            onChange={setColor}
            label={colorLabel}
          />
        </div>

        <div
          style={{
            padding: 22,
            borderTop: "1px solid #e4e4e7",
            display: "flex",
            gap: 10,
            justifyContent: "flex-end",
            flexWrap: "wrap",
          }}
        >
          <button
            type="button"
            onClick={onClose}
            style={{
              height: 46,
              borderRadius: 16,
              border: "1px solid #d4d4d8",
              background: "#ffffff",
              color: "#18181b",
              padding: "0 16px",
              fontSize: 14,
              fontWeight: 700,
              cursor: "pointer",
            }}
          >
            {cancelLabel}
          </button>

          <button
            type="button"
            disabled={disabled}
            onClick={() =>
              onConfirm({
                name: name.trim(),
                color,
              })
            }
            style={{
              height: 46,
              borderRadius: 16,
              border: "none",
              background: "#18181b",
              color: "#ffffff",
              padding: "0 16px",
              fontSize: 14,
              fontWeight: 800,
              cursor: disabled ? "default" : "pointer",
              opacity: disabled ? 0.5 : 1,
            }}
          >
            {loading ? "..." : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}