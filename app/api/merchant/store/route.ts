import { NextResponse } from "next/server";
import { db } from "../../../../lib/firebaseAdmin";
import { requireMerchantUid } from "../../../../lib/merchantAuth";

export async function GET() {
  try {
    const merchantUid = await requireMerchantUid();

    if (!merchantUid) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const snapshot = await db
      .collection("stores")
      .where("merchantId", "==", merchantUid)
      .limit(1)
      .get();

    if (snapshot.empty) {
      return NextResponse.json({ store: null });
    }

    const doc = snapshot.docs[0];
    const data = doc.data();

    return NextResponse.json({
      store: {
        storeId: data.storeId ?? doc.id,
        name: data.name ?? "",
      },
    });
  } catch (error) {
    console.error("GET /api/merchant/store error:", error);

    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}