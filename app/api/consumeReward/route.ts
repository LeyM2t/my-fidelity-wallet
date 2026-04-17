import { NextResponse } from "next/server";
import { db } from "@/lib/firebaseAdmin";
import { requireClientUid } from "@/lib/clientSession";

type Body = {
  cardId?: string;
};

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as Body;
    const cardId = typeof body.cardId === "string" ? body.cardId.trim() : "";

    if (!cardId) {
      return NextResponse.json({ error: "cardId missing" }, { status: 400 });
    }

    const clientUid = await requireClientUid();
    const ref = db.collection("cards").doc(cardId);

    const out = await db.runTransaction(async (tx) => {
      const snap = await tx.get(ref);

      if (!snap.exists) {
        return { ok: true as const, deleted: false, alreadyGone: true };
      }

      const data = snap.data() || {};

      if (data.ownerId !== clientUid) {
        return {
          ok: false as const,
          status: 403 as const,
          error: "forbidden",
        };
      }

      if (data.status !== "reward") {
        return {
          ok: false as const,
          status: 400 as const,
          error: "card is not a reward",
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
    const message = String(e?.message ?? e ?? "unknown error");

    if (message === "UNAUTHORIZED_CLIENT") {
      return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    }

    return NextResponse.json({ error: message }, { status: 500 });
  }
}