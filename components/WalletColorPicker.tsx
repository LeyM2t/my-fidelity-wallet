"use client";

import React from "react";

type Props = {
  colors: readonly string[];
  value: string;
  onChange: (color: string) => void;
  label?: string;
};

export default function WalletColorPicker({
  colors,
  value,
  onChange,
  label,
}: Props) {
  return (
    <div>
      {label ? (
        <div
          style={{
            fontSize: 14,
            fontWeight: 700,
            color: "#18181b",
            marginBottom: 10,
          }}
        >
          {label}
        </div>
      ) : null}

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(6, minmax(0, 1fr))",
          gap: 10,
        }}
      >
        {colors.map((color) => {
          const active = color.toLowerCase() === value.toLowerCase();

          return (
            <button
              key={color}
              type="button"
              onClick={() => onChange(color)}
              aria-label={color}
              title={color}
              style={{
                height: 42,
                borderRadius: 14,
                border: active ? "3px solid #18181b" : "1px solid #d4d4d8",
                background: color,
                cursor: "pointer",
                boxShadow: active
                  ? "0 0 0 3px rgba(24,24,27,0.08)"
                  : "none",
              }}
            />
          );
        })}
      </div>
    </div>
  );
}