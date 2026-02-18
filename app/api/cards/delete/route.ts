import { NextResponse } from "next/server";
import { db } from "@/lib/firebaseAdmin";

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const cardId = typeof body?.cardId === "string" ? body.cardId.trim() : "";
    const ownerId = typeof body?.ownerId === "string" ? body.ownerId.trim() : "";

    if (!cardId) {
      return NextResponse.json({ error: "cardId missing" }, { status: 400 });
    }
    if (!ownerId) {
      return NextResponse.json({ error: "ownerId missing" }, { status: 400 });
    }

    const ref = db.collection("cards").doc(cardId);
    const snap = await ref.get();

    if (!snap.exists) {
      return NextResponse.json({ error: "card not found" }, { status: 404 });
    }

    const data = snap.data() as any;
    if ((data?.ownerId ?? "") !== ownerId) {
      return NextResponse.json({ error: "forbidden" }, { status: 403 });
    }

    await ref.delete();

    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json(
      { error: e?.message ?? "server error" },
      { status: 500 }
    );
  }
}
