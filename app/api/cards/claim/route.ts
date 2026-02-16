import { NextResponse } from "next/server";
import { db } from "@/lib/firebaseAdmin";
import { FieldValue } from "firebase-admin/firestore";

function safeIdFromToken(token: string) {
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
      const snap = await tx.get(claimRef);

      // --- CASE A: claim exists
      if (snap.exists) {
        const data = snap.data() as any;

        // A1) already claimed properly (has cardId)
        if (data?.cardId) {
          return {
            cardId: String(data.cardId),
            already: true,
            storeId: data?.storeId ?? null,
          };
        }

        // A2) pre-created claim (from /api/claims/create) but not consumed yet
        const storeId = typeof data?.storeId === "string" && data.storeId.trim()
          ? data.storeId.trim()
          : "store_demo_1";

        const cardRef = db.collection("cards").doc();

        tx.set(cardRef, {
          storeId,
          ownerId,
          stamps: 0,
          goal: 10,
          status: "active",
          rewardAvailable: false,
          rewardsUsed: 0,
          sourceToken: token,
          createdAt: FieldValue.serverTimestamp(),
          updatedAt: FieldValue.serverTimestamp(),
        });

        tx.update(claimRef, {
          ownerId,
          cardId: cardRef.id,
          claimedAt: FieldValue.serverTimestamp(),
        });

        return {
          cardId: cardRef.id,
          already: false,
          storeId,
        };
      }

      // --- CASE B: claim does not exist (old dev behavior)
      const storeId = "store_demo_1";
      const cardRef = db.collection("cards").doc();

      tx.set(cardRef, {
        storeId,
        ownerId,
        stamps: 0,
        goal: 10,
        status: "active",
        rewardAvailable: false,
        rewardsUsed: 0,
        sourceToken: token,
        createdAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp(),
      });

      tx.set(claimRef, {
        token,
        ownerId,
        cardId: cardRef.id,
        storeId,
        createdAt: FieldValue.serverTimestamp(),
      });

      return {
        cardId: cardRef.id,
        already: false,
        storeId,
      };
    });

    return NextResponse.json({ ok: true, ...result });
  } catch (e: any) {
    return NextResponse.json(
      { error: String(e?.message ?? e) },
      { status: 500 }
    );
  }
}
