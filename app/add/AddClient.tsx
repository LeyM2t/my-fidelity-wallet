"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

function getOrCreateOwnerId(): string {
  const key = "fw_ownerId"; // ✅ même clé que /wallet
  try {
    const existing = localStorage.getItem(key);
    if (existing && existing.trim()) return existing.trim();

    const id =
      typeof crypto !== "undefined" && "randomUUID" in crypto
        ? crypto.randomUUID()
        : `owner_${Math.random().toString(16).slice(2)}_${Date.now()}`;

    localStorage.setItem(key, id);
    return id;
  } catch {
    return `owner_${Math.random().toString(16).slice(2)}_${Date.now()}`;
  }
}

export default function AddClient() {
  const router = useRouter();
  const sp = useSearchParams();
  const token = useMemo(() => sp.get("token") ?? "", [sp]);

  const [status, setStatus] = useState<"idle" | "loading" | "ok" | "error">("idle");
  const [message, setMessage] = useState<string>("");

  // évite double run en dev (React StrictMode)
  const startedRef = useRef(false);

  useEffect(() => {
    async function run() {
      if (startedRef.current) return;
      startedRef.current = true;

      if (!token) {
        setStatus("error");
        setMessage("Token manquant (ex: /add?token=XXXX)");
        return;
      }

      setStatus("loading");
      setMessage("Ajout de la carte…");

      const ownerId = getOrCreateOwnerId();

      try {
        const res = await fetch("/api/cards/claim", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ token, ownerId }),
        });

        const data: any = await res.json().catch(() => ({}));

        if (!res.ok) {
          setStatus("error");
          setMessage(data?.error ?? `Erreur HTTP ${res.status}`);
          return;
        }

        const cardId = data?.cardId;
        if (!cardId || typeof cardId !== "string") {
          setStatus("error");
          setMessage("cardId manquant dans la réponse serveur");
          return;
        }

        setStatus("ok");
        setMessage("Carte prête ✅ Ouverture…");

        setTimeout(() => {
          router.replace(`/wallet/card/${encodeURIComponent(cardId)}`);
        }, 600);
      } catch (err: any) {
        setStatus("error");
        setMessage(String(err?.message ?? err ?? "Erreur réseau"));
      }
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
        {status === "idle" ? "—" : status === "loading" ? "⏳" : status === "ok" ? "✅" : "❌"}{" "}
        {message}
      </div>
    </main>
  );
}
