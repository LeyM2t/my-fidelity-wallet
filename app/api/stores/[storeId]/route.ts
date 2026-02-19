import { NextResponse } from "next/server";
import { db } from "@/lib/firebaseAdmin";
import { FieldValue } from "firebase-admin/firestore";

function isAuthorized(req: Request) {
  const key = req.headers.get("x-merchant-admin-key") || "";
  const expected = process.env.MERCHANT_ADMIN_KEY || "";
  return expected.length > 0 && key === expected;
}

function sanitizeStoreId(storeId: string) {
  return storeId.replace(/[^a-zA-Z0-9_-]/g, "_").slice(0, 200);
}

export async function GET(
  _req: Request,
  ctx: { params: Promise<{ storeId: string }> }
) {
  try {
    const { storeId } = await ctx.params;
    const sid = sanitizeStoreId(storeId);

    const ref = db.collection("stores").doc(sid);
    const snap = await ref.get();

    if (!snap.exists) {
      // store peut ne pas exister encore : on renvoie un template par défaut
      return NextResponse.json({
        storeId: sid,
        name: "",
        cardTemplate: {
          title: "Loyalty Card",
          bgColor: "#111827",
          textColor: "#ffffff",
          font: "sans",
          logoUrl: "",
          bgImageUrl: "",
        },
      });
    }

    const data = snap.data() || {};
    return NextResponse.json({
      storeId: sid,
      name: data.name || "",
      cardTemplate: data.cardTemplate || null,
    });
  } catch (e: any) {
    return NextResponse.json(
      { error: e?.message || "failed" },
      { status: 500 }
    );
  }
}

export async function PATCH(
  req: Request,
  ctx: { params: Promise<{ storeId: string }> }
) {
  try {
    if (!isAuthorized(req)) {
      return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    }

    const { storeId } = await ctx.params;
    const sid = sanitizeStoreId(storeId);

    const body = await req.json().catch(() => ({}));

    const cardTemplate = body?.cardTemplate && typeof body.cardTemplate === "object"
      ? body.cardTemplate
      : null;

    if (!cardTemplate) {
      return NextResponse.json({ error: "cardTemplate missing" }, { status: 400 });
    }

    const allowedFonts = new Set(["sans", "serif", "mono"]);
    const font = typeof cardTemplate.font === "string" && allowedFonts.has(cardTemplate.font)
      ? cardTemplate.font
      : "sans";

    const clean = {
      title: typeof cardTemplate.title === "string" ? cardTemplate.title.slice(0, 40) : "Loyalty Card",
      bgColor: typeof cardTemplate.bgColor === "string" ? cardTemplate.bgColor.slice(0, 20) : "#111827",
      textColor: typeof cardTemplate.textColor === "string" ? cardTemplate.textColor.slice(0, 20) : "#ffffff",
      font,
      logoUrl: typeof cardTemplate.logoUrl === "string" ? cardTemplate.logoUrl.slice(0, 500) : "",
      bgImageUrl: typeof cardTemplate.bgImageUrl === "string" ? cardTemplate.bgImageUrl.slice(0, 500) : "",
    };

    const ref = db.collection("stores").doc(sid);
    await ref.set(
      {
        cardTemplate: clean,
        updatedAt: FieldValue.serverTimestamp(),
      },
      { merge: true }
    );

    return NextResponse.json({ ok: true, storeId: sid, cardTemplate: clean });
  } catch (e: any) {
    return NextResponse.json(
      { error: e?.message || "failed" },
      { status: 500 }
    );
  }
}
