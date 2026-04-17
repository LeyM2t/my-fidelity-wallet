"use client";

import { useState } from "react";

export default function TestPage() {
  const [result, setResult] = useState<string>("Aucun résultat");

  const createStore = async () => {
    try {
      const res = await fetch("/api/stores/create", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ name: "Mon Test Store" }),
      });

      const data = await res.json();

      setResult(JSON.stringify({
        status: res.status,
        data,
      }, null, 2));
    } catch (error) {
      setResult(`Erreur fetch: ${String(error)}`);
    }
  };

  return (
    <main style={{ padding: "24px", fontFamily: "Arial, sans-serif" }}>
      <h1>Test création de store</h1>

      <button
        onClick={createStore}
        style={{
          padding: "10px 16px",
          cursor: "pointer",
          marginTop: "12px",
          marginBottom: "20px",
        }}
      >
        Créer un store
      </button>

      <pre
        style={{
          background: "#f5f5f5",
          padding: "16px",
          borderRadius: "8px",
          whiteSpace: "pre-wrap",
        }}
      >
        {result}
      </pre>
    </main>
  );
}