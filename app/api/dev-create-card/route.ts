import { NextResponse } from "next/server";
import { db } from "@/lib/firebaseAdmin";
import { FieldValue } from "firebase-admin/firestore";

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const ownerId = url.searchParams.get("ownerId") || "";
    const storeId = url.searchParams.get("storeId") || "store_1";
    const goalStr = url.searchParams.get("goal");
    const goal = goalStr ? Number(goalStr) : 10;

    if (!ownerId) return NextResponse.json({ error: "ownerId missing" }, { status: 400 });
    if (!storeId) return NextResponse.json({ error: "storeId missing" }, { status: 400 });
    if (!Number.isFinite(goal) || goal <= 0)
      return NextResponse.json({ error: "invalid goal" }, { status: 400 });

    const ref = db.collection("cards").doc();

    await ref.set({
      storeId,
      ownerId,
      stamps: 0,
      goal,
      status: "active",
      rewardAvailable: false,
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    });

    return NextResponse.json({ ok: true, cardId: ref.id, storeId, ownerId, goal });
  } catch (e: any) {
    return NextResponse.json(
      { error: String(e?.message ?? e ?? "unknown error") },
      { status: 500 }
    );
  }
}
