"use client";

import React, { useEffect, useMemo, useState } from "react";

type WalletItem = {
  id: string;
  name: string;
  color: string;
};

type Props = {
  open: boolean;
  title: string;
  subtitle?: string;
  confirmLabel: string;
  cancelLabel: string;
  wallets: WalletItem[];
  initialWalletId?: string;
  loading?: boolean;
  onClose: () => void;
  onConfirm: (walletId: string) => void;
};

export default function WalletMoveModal({
  open,
  title,
  subtitle,
  confirmLabel,
  cancelLabel,
  wallets,
  initialWalletId,
  loading = false,
  onClose,
  onConfirm,
}: Props) {
  const [selectedWalletId, setSelectedWalletId] = useState(initialWalletId || "");

  useEffect(() => {
    if (!open) return;
    setSelectedWalletId(initialWalletId || wallets[0]?.id || "");
  }, [open, initialWalletId, wallets]);

  useEffect(() => {
    if (!open) return;

    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open, onClose]);

  const disabled = useMemo(
    () => !selectedWalletId || loading,
    [selectedWalletId, loading]
  );

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
          maxWidth: 560,
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
              marginBottom: subtitle ? 8 : 0,
            }}
          >
            {title}
          </div>

          {subtitle ? (
            <div
              style={{
                fontSize: 14,
                lineHeight: 1.45,
                color: "#52525b",
              }}
            >
              {subtitle}
            </div>
          ) : null}
        </div>

        <div
          style={{
            padding: 22,
            display: "grid",
            gap: 12,
            maxHeight: "50vh",
            overflowY: "auto",
          }}
        >
          {wallets.map((wallet) => {
            const active = wallet.id === selectedWalletId;

            return (
              <button
                key={wallet.id}
                type="button"
                onClick={() => setSelectedWalletId(wallet.id)}
                style={{
                  width: "100%",
                  textAlign: "left",
                  borderRadius: 20,
                  border: active ? "2px solid #18181b" : "1px solid #d4d4d8",
                  background: "#ffffff",
                  padding: 14,
                  cursor: "pointer",
                  boxShadow: active
                    ? "0 0 0 3px rgba(24,24,27,0.06)"
                    : "none",
                }}
              >
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 12,
                  }}
                >
                  <div
                    style={{
                      width: 20,
                      height: 20,
                      borderRadius: 999,
                      background: wallet.color,
                      border: "1px solid rgba(0,0,0,0.12)",
                      flexShrink: 0,
                    }}
                  />

                  <div
                    style={{
                      minWidth: 0,
                      flex: 1,
                    }}
                  >
                    <div
                      style={{
                        fontSize: 16,
                        fontWeight: 800,
                        color: "#18181b",
                        lineHeight: 1.2,
                      }}
                    >
                      {wallet.name}
                    </div>

                    <div
                      style={{
                        fontSize: 12,
                        color: "#71717a",
                        marginTop: 4,
                        wordBreak: "break-all",
                      }}
                    >
                      {wallet.id}
                    </div>
                  </div>
                </div>
              </button>
            );
          })}
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
            onClick={() => onConfirm(selectedWalletId)}
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