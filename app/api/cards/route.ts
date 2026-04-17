import { NextResponse } from "next/server";
import { db } from "@/lib/firebaseAdmin";
import { requireClientUid } from "@/lib/clientSession";

export async function GET() {
  try {
    const clientUid = await requireClientUid();

    const snapshot = await db
      .collection("cards")
      .where("ownerId", "==", clientUid)
      .get();

    const cards = snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));

    return NextResponse.json({ cards });
  } catch (error) {
    console.error("api/cards GET error", error);

    const message =
      error instanceof Error ? error.message : "Unknown error";

    if (message === "UNAUTHORIZED_CLIENT") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    return NextResponse.json(
      { error: message || "Failed to load cards" },
      { status: 500 }
    );
  }
}