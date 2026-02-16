"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

function getOrCreateOwnerId() {
  try {
    const key = "dev_ownerId";
    const existing = localStorage.getItem(key);
    if (existing && existing.trim()) return existing.trim();

    const id =
      (globalThis.crypto as any)?.randomUUID?.() ??
      `owner_${Math.random().toString(36).slice(2)}${Date.now().toString(36)}`;

    localStorage.setItem(key, id);
    return id;
  } catch {
    return `owner_${Math.random().toString(36).slice(2)}`;
  }
}

export default function AddClient() {
  const router = useRouter();
  const sp = useSearchParams();
  const token = useMemo(() => sp.get("token") ?? "", [sp]);

  const [status, setStatus] = useState<"idle" | "loading" | "ok" | "error">("idle");
  const [message, setMessage] = useState<string>("");

  useEffect(() => {
    async function run() {
      if (!token) {
        setStatus("error");
        setMessage("Token manquant (ex: /add?token=XXXX)");
        return;
      }

      setStatus("loading");
      setMessage("Ajout de la carte…");

      const ownerId = getOrCreateOwnerId();

      const res = await fetch("/api/cards/claim", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, ownerId }),
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        setStatus("error");
        setMessage(data?.error ?? "Erreur inconnue");
        return;
      }

      setStatus("ok");
      setMessage("Carte ajoutée ✅ Redirection vers le wallet…");
      router.replace("/wallet");
    }

    run();
  }, [token, router]);

  return (
    <main style={{ padding: 24, fontFamily: "Arial", maxWidth: 720, margin: "0 auto" }}>
      <h1 style={{ fontSize: 22, marginBottom: 8 }}>Ajouter la carte</h1>

      <div style={{ fontSize: 13, color: "#666", marginBottom: 12 }}>
        Token : <code>{token || "(vide)"}</code>
      </div>

      <div
        style={{
          padding: 12,
          border: "1px solid #ddd",
          borderRadius: 12,
          background: status === "error" ? "#fee2e2" : "#f8fafc",
        }}
      >
        <strong>Statut :</strong>{" "}
        {status === "idle"
          ? "—"
          : status === "loading"
          ? "⏳"
          : status === "ok"
          ? "✅"
          : "❌"}{" "}
        {message}
      </div>
    </main>
  );
}
