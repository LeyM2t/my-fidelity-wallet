import { NextResponse } from "next/server";
import { db } from "@/lib/firebaseAdmin";
import { FieldValue } from "firebase-admin/firestore";
import { requireClientUid } from "@/lib/clientSession";

function safeIdFromToken(token: string) {
  return token.replace(/[^a-zA-Z0-9_-]/g, "_").slice(0, 200);
}

type CardStatus = "active" | "reward";

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const token = typeof body?.token === "string" ? body.token.trim() : "";

    if (!token) {
      return NextResponse.json({ error: "token missing" }, { status: 400 });
    }

    const clientUid = await requireClientUid();
    const tokenId = safeIdFromToken(token);

    const result = await db.runTransaction(async (tx) => {
      const claimRef = db.collection("claims").doc(tokenId);
      const claimSnap = await tx.get(claimRef);

      if (!claimSnap.exists) {
        throw new Error("claim not found (token invalid or expired)");
      }

      const claim = claimSnap.data() as any;
      const storeId =
        typeof claim?.storeId === "string" ? claim.storeId.trim() : "";

      if (!storeId) {
        throw new Error("claim is missing storeId");
      }

      const activeQuery = db
        .collection("cards")
        .where("storeId", "==", storeId)
        .where("ownerId", "==", clientUid)
        .where("status", "==", "active")
        .limit(1);

      const activeSnap = await tx.get(activeQuery);

      if (!activeSnap.empty) {
        const doc = activeSnap.docs[0];
        const cardId = doc.id;

        tx.set(
          claimRef,
          {
            ownerId: clientUid,
            cardId,
            claimedAt: FieldValue.serverTimestamp(),
          },
          { merge: true }
        );

        return {
          cardId,
          storeId,
          status: "active" as CardStatus,
          existing: true,
        };
      }

      const rewardQuery = db
        .collection("cards")
        .where("storeId", "==", storeId)
        .where("ownerId", "==", clientUid)
        .where("status", "==", "reward")
        .limit(1);

      const rewardSnap = await tx.get(rewardQuery);

      if (!rewardSnap.empty) {
        const doc = rewardSnap.docs[0];
        const cardId = doc.id;

        tx.set(
          claimRef,
          {
            ownerId: clientUid,
            cardId,
            claimedAt: FieldValue.serverTimestamp(),
          },
          { merge: true }
        );

        return {
          cardId,
          storeId,
          status: "reward" as CardStatus,
          existing: true,
        };
      }

      const cardRef = db.collection("cards").doc();
      const now = FieldValue.serverTimestamp();

      tx.set(cardRef, {
        storeId,
        ownerId: clientUid,
        stamps: 0,
        goal: 10,
        status: "active",
        rewardAvailable: false,
        rewardsUsed: 0,
        sourceToken: token,
        createdAt: now,
        updatedAt: now,
      });

      tx.set(
        claimRef,
        {
          ownerId: clientUid,
          cardId: cardRef.id,
          claimedAt: now,
        },
        { merge: true }
      );

      return {
        cardId: cardRef.id,
        storeId,
        status: "active" as CardStatus,
        existing: false,
      };
    });

    return NextResponse.json(result);
  } catch (err: any) {
    const message = String(err?.message ?? err ?? "unknown error");

    if (message === "UNAUTHORIZED_CLIENT") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    return NextResponse.json({ error: message }, { status: 400 });
  }
}