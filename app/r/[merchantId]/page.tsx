"use client";

import { useEffect } from "react";
import { useRouter, useSearchParams, useParams } from "next/navigation";
import { addMerchantCard } from "@/app/lib/walletStorage";

export default function AddFromQrPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const params = useParams();

  useEffect(() => {
    const merchantId = params.merchantId as string;

    if (!merchantId) return;

    const name = searchParams.get("name") ?? "Commerce";
    const goalRaw = searchParams.get("goal");
    const goal = goalRaw ? parseInt(goalRaw, 10) : 10;

    addMerchantCard(merchantId, name, Number.isFinite(goal) ? goal : 10);

    router.replace("/wallet");
  }, [params, router, searchParams]);

  return (
    <main style={{ padding: 16 }}>
      <h1>Ajout de la carte…</h1>
      <p>Redirection vers le wallet.</p>
    </main>
  );
}
