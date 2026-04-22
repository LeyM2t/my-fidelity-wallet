import { NextResponse } from "next/server";
import { db } from "@/lib/firebaseAdmin";
import { requireMerchantUid } from "@/lib/merchantAuth";

type Body = {
  cardId?: string;
};

async function authorizeConsumeReward(storeId: string) {
  const storeRef = db.collection("stores").doc(storeId);
  const storeSnap = await storeRef.get();

  if (!storeSnap.exists) {
    return {
      ok: false as const,
      status: 404 as const,
      error: "store not found",
    };
  }

  const storeData = storeSnap.data() as any;
  const merchantUid = await requireMerchantUid();

  if (!merchantUid) {
    return {
      ok: false as const,
      status: 401 as const,
      error: "not authenticated",
    };
  }

  if (storeData.merchantId !== merchantUid) {
    return {
      ok: false as const,
      status: 403 as const,
      error: "not your store",
    };
  }

  return { ok: true as const };
}

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as Body;
    const cardId = typeof body.cardId === "string" ? body.cardId.trim() : "";

    if (!cardId) {
      return NextResponse.json({ error: "cardId missing" }, { status: 400 });
    }

    const ref = db.collection("cards").doc(cardId);

    const out = await db.runTransaction(async (tx) => {
      const snap = await tx.get(ref);

      if (!snap.exists) {
        return { ok: true as const, deleted: false, alreadyGone: true };
      }

      const data = snap.data() || {};
      const storeId = typeof data.storeId === "string" ? data.storeId.trim() : "";

      if (!storeId) {
        return {
          ok: false as const,
          status: 400 as const,
          error: "card missing storeId",
        };
      }

      const auth = await authorizeConsumeReward(storeId);
      if (!auth.ok) {
        return {
          ok: false as const,
          status: auth.status,
          error: auth.error,
        };
      }

      const status = typeof data.status === "string" ? data.status : undefined;
      const rewardAvailable =
        typeof data.rewardAvailable === "boolean"
          ? data.rewardAvailable
          : status === "reward";

      if (status !== "reward" || !rewardAvailable) {
        return {
          ok: false as const,
          status: 400 as const,
          error: "card is not an available reward",
        };
      }

      tx.delete(ref);

      return { ok: true as const, deleted: true, alreadyGone: false };
    });

    if (!out.ok) {
      return NextResponse.json({ error: out.error }, { status: out.status });
    }

    return NextResponse.json(out);
  } catch (e: any) {
    return NextResponse.json(
      { error: String(e?.message ?? e ?? "unknown error") },
      { status: 500 }
    );
  }
}