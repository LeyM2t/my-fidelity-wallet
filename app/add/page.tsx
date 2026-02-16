// app/add/page.tsx
"use client";

import { useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";

export default function AddPage() {
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    const token = searchParams.get("token") ?? "";
    // Pour l’instant: on ne “crée” pas encore la carte ici.
    // On valide juste le flux QR -> ouverture app.
    router.replace(`/wallet?token=${encodeURIComponent(token)}`);
  }, [router, searchParams]);

  return (
    <main style={{ padding: 24, fontFamily: "Arial" }}>
      <h1>Ajout de carte…</h1>
      <p>Redirection…</p>
    </main>
  );
}
