import { NextResponse } from "next/server";
import { db } from "@/lib/firebaseAdmin";
import { FieldValue } from "firebase-admin/firestore";

function safeIdFromToken(token: string) {
  // Firestore doc id ne doit pas contenir "/" etc.
  return token.replace(/[^a-zA-Z0-9_-]/g, "_").slice(0, 200);
}

/**
 * Durable rule:
 * - If token looks like a store id (starts with "store_"), we use it.
 * - Otherwise we fallback to the demo store.
 *
 * Later, we can replace this by a real "tokens" collection (token -> storeId).
 */
function storeIdFromToken(token: string) {
  if (token.startsWith("store_")) return token;
  // fallback demo store (exists in your Firestore)
  return "store_demo_1";
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

    const storeId = storeIdFromToken(token);

    // Optional safety: ensure store exists (prevents orphan cards)
    const storeRef = db.collection("stores").doc(storeId);
    const storeSnap = await storeRef.get();
    if (!storeSnap.exists) {
      return NextResponse.json(
        { error: `store not found for token (storeId=${storeId})` },
        { status: 400 }
      );
    }

    const claimId = safeIdFromToken(token);
    const claimRef = db.collection("claims").doc(claimId);

    const result = await db.runTransaction(async (tx) => {
      const existing = await tx.get(claimRef);
      if (existing.exists) {
        const data = existing.data() as any;
        return { cardId: data.cardId as string, already: true, storeId };
      }

      const cardRef = db.collection("cards").doc();

      tx.set(cardRef, {
        storeId,
        ownerId,
        stamps: 0,
        goal: 10,
        status: "active",        // ✅ durable: required by addStamps
        rewardAvailable: false,  // optional but consistent
        rewardsUsed: 0,
        sourceToken: token,
        createdAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp(),
      });

      tx.set(claimRef, {
        token,
        ownerId,
        storeId,
        cardId: cardRef.id,
        createdAt: FieldValue.serverTimestamp(),
      });

      return { cardId: cardRef.id, already: false, storeId };
    });

    return NextResponse.json({ ok: true, ...result });
  } catch (e: any) {
    return NextResponse.json(
      { error: String(e?.message ?? e) },
      { status: 500 }
    );
  }
}
