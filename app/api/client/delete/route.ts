import { NextResponse } from "next/server";
import { db } from "@/lib/firebaseAdmin";
import { requireClientUid } from "@/lib/clientSession";

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
    const clientUid = await requireClientUid();

    if (!clientUid) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const cardsQuery = db.collection("cards").where("ownerId", "==", clientUid);
    const claimsQuery = db.collection("claims").where("ownerId", "==", clientUid);

    const cardsCountSnap = await cardsQuery.count().get();
    const claimsCountSnap = await claimsQuery.count().get();

    const deletedCards = cardsCountSnap.data().count || 0;
    const deletedClaims = claimsCountSnap.data().count || 0;

    await deleteDocsByQuery(cardsQuery);
    await deleteDocsByQuery(claimsQuery);

    return NextResponse.json({
      ok: true,
      deletedCards,
      deletedClaims,
    });
  } catch (error) {
    console.error("POST /api/client/delete error:", error);

    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}