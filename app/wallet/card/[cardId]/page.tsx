"use client";

import { useMemo } from "react";
import { useParams, useRouter } from "next/navigation";

export default function CardPage() {
  const router = useRouter();
  const params = useParams<{ cardId: string }>();
  const cardId = useMemo(() => String(params?.cardId ?? ""), [params]);

  return (
    <main style={{ padding: 24, fontFamily: "Arial", maxWidth: 720, margin: "0 auto" }}>
      <button onClick={() => router.push("/wallet")} style={{ marginBottom: 16 }}>
        ← Back
      </button>

      <h1 style={{ fontSize: 22, marginBottom: 8 }}>Card</h1>

      <div style={{ fontSize: 12, opacity: 0.7 }}>
        cardId: <span style={{ fontFamily: "monospace" }}>{cardId || "—"}</span>
      </div>
    </main>
  );
}
