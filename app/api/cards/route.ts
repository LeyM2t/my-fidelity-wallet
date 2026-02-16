import { NextResponse } from "next/server";
import { db } from "@/lib/firebaseAdmin";

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const ownerId = url.searchParams.get("ownerId");

    if (!ownerId) {
      return NextResponse.json({ error: "ownerId missing" }, { status: 400 });
    }

    const snap = await db
      .collection("cards")
      .where("ownerId", "==", ownerId)
      .get();

    const cards = snap.docs.map((d) => ({ id: d.id, ...d.data() }));

    return NextResponse.json({ cards });
  } catch (e: any) {
    return NextResponse.json(
      { error: String(e?.message ?? e) },
      { status: 500 }
    );
  }
}
