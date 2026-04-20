import { NextResponse } from "next/server";
import { db } from "@/lib/firebaseAdmin";
import { requireMerchantUid } from "@/lib/merchantAuth";

async function deleteDocsByQuery(
  query: FirebaseFirestore.Query<FirebaseFirestore.DocumentData>
) {
  while (true) {
    const snapshot = await query.limit(200).get();

    if (snapshot.empty) {
      break;
    }

    const batch = db.batch();

    snapshot.docs.forEach((doc) => {
      batch.delete(doc.ref);
    });

    await batch.commit();

    if (snapshot.size < 200) {
      break;
    }
  }
}

export async function POST() {
  try {
    const merchantUid = await requireMerchantUid();

    if (!merchantUid) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const storeSnapshot = await db
      .collection("stores")
      .where("merchantId", "==", merchantUid)
      .limit(1)
      .get();

    if (storeSnapshot.empty) {
      return NextResponse.json({
        ok: true,
        deletedStore: false,
        deletedClaims: 0,
        deletedCards: 0,
      });
    }

    const storeDoc = storeSnapshot.docs[0];
    const storeData = storeDoc.data() || {};
    const storeId =
      typeof storeData.storeId === "string" && storeData.storeId.trim()
        ? storeData.storeId.trim()
        : storeDoc.id;

    const claimsQuery = db.collection("claims").where("storeId", "==", storeId);
    const cardsQuery = db.collection("cards").where("storeId", "==", storeId);

    const claimsCountSnap = await claimsQuery.count().get();
    const cardsCountSnap = await cardsQuery.count().get();

    const deletedClaims = claimsCountSnap.data().count || 0;
    const deletedCards = cardsCountSnap.data().count || 0;

    await deleteDocsByQuery(claimsQuery);
    await deleteDocsByQuery(cardsQuery);
    await storeDoc.ref.delete();

    return NextResponse.json({
      ok: true,
      deletedStore: true,
      storeId,
      deletedClaims,
      deletedCards,
    });
  } catch (error) {
    console.error("POST /api/merchant/delete error:", error);

    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}