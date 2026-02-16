import { NextResponse } from "next/server";
import { db } from "@/lib/firebaseAdmin";

type StoreDoc = {
  name: string;
  cardTemplate?: {
    bg?: string;
    fg?: string;
    accent?: string;
  };
};

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const idsRaw = url.searchParams.get("ids") || "";

    const ids = Array.from(
      new Set(
        idsRaw
          .split(",")
          .map((s) => s.trim())
          .filter(Boolean)
      )
    );

    if (ids.length === 0) return NextResponse.json({});

    const reads = ids.map(async (storeId) => {
      const snap = await db.collection("stores").doc(storeId).get();
      if (!snap.exists) return null;

      const data = snap.data() as Partial<StoreDoc> | undefined;
      if (!data?.name) return null;

      return [storeId, { name: data.name, cardTemplate: data.cardTemplate ?? {} }] as const;
    });

    const entries = (await Promise.all(reads)).filter(Boolean) as Array<
      readonly [string, StoreDoc]
    >;

    const out: Record<string, StoreDoc> = {};
    for (const [storeId, store] of entries) out[storeId] = store;

    return NextResponse.json(out);
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "Unknown error" }, { status: 500 });
  }
}
