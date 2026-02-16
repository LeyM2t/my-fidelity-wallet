import { NextResponse } from "next/server";
import { db } from "@/lib/firebaseAdmin";

type Body = {
  storeId?: string;
  ownerId?: string;
  cardId?: string;
};

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as Body;

    const storeId = typeof body.storeId === "string" ? body.storeId : "";
    const ownerId = typeof body.ownerId === "string" ? body.ownerId : "";
    const cardId = typeof body.cardId === "string" ? body.cardId : "";

    if (!storeId) return NextResponse.json({ error: "storeId missing" }, { status: 400 });
    if (!ownerId) return NextResponse.json({ error: "ownerId missing" }, { status: 400 });
    if (!cardId) return NextResponse.json({ error: "cardId missing" }, { status: 400 });

    const ref = db.collection("cards").doc(cardId);

    const out = await db.runTransaction(async (tx) => {
      const snap = await tx.get(ref);
      if (!snap.exists) {
        // idempotent
        return { ok: true as const, deleted: false, alreadyGone: true };
      }

      const data = snap.data() || {};
      if (data.storeId !== storeId) return { ok: false as const, status: 403 as const, error: "storeId mismatch" };
      if (data.ownerId !== ownerId) return { ok: false as const, status: 403 as const, error: "ownerId mismatch" };

      if (data.status !== "reward") {
        return { ok: false as const, status: 400 as const, error: "card is not a reward" };
      }

      tx.delete(ref);
      return { ok: true as const, deleted: true, alreadyGone: false };
    });

    if (!out.ok) return NextResponse.json({ error: out.error }, { status: out.status });

    return NextResponse.json(out);
  } catch (e: any) {
    return NextResponse.json(
      { error: String(e?.message ?? e ?? "unknown error") },
      { status: 500 }
    );
  }
}
