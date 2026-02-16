import { NextResponse } from "next/server";
import { db } from "@/lib/firebaseAdmin";
import { FieldValue } from "firebase-admin/firestore";

function safeIdFromToken(token: string) {
  // Firestore doc id ne doit pas contenir "/" etc.
  return token.replace(/[^a-zA-Z0-9_-]/g, "_").slice(0, 200);
}

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const token = typeof body?.token === "string" ? body.token.trim() : "";
    const ownerId = typeof body?.ownerId === "string" ? body.ownerId.trim() : "";

    if (!token) {
      return NextResponse.json({ error: "token missing" }, { status: 400 });
    }
    if (!ownerId) {
      return NextResponse.json({ error: "ownerId missing" }, { status: 400 });
    }

    const claimId = safeIdFromToken(token);
    const claimRef = db.collection("claims").doc(claimId);

    const result = await db.runTransaction(async (tx) => {
      const existing = await tx.get(claimRef);
      if (existing.exists) {
        const data = existing.data() as any;
        return { cardId: data.cardId as string, already: true };
      }

      const cardRef = db.collection("cards").doc();
      tx.set(cardRef, {
        ownerId,
        stamps: 0,
        goal: 10,
        rewardsUsed: 0,
        sourceToken: token,
        createdAt: FieldValue.serverTimestamp(),
      });

      tx.set(claimRef, {
        token,
        ownerId,
        cardId: cardRef.id,
        createdAt: FieldValue.serverTimestamp(),
      });

      return { cardId: cardRef.id, already: false };
    });

    return NextResponse.json({ ok: true, ...result });
  } catch (e: any) {
    return NextResponse.json(
      { error: String(e?.message ?? e) },
      { status: 500 }
    );
  }
}
