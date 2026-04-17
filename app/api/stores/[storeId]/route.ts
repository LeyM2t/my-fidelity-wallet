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

function clampHex(v: any, fallback: string) {
  const s = typeof v === "string" ? v.trim() : "";
  return /^#[0-9a-fA-F]{6}$/.test(s) ? s.toLowerCase() : fallback;
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
      return NextResponse.json({
        storeId: sid,
        name: "",
        cardTemplate: {
          title: "Loyalty Card",
          bgColor: "#111827",
          textColor: "#ffffff",
          font: "inter",
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
    return NextResponse.json({ error: e?.message || "failed" }, { status: 500 });
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
    const cardTemplate =
      body?.cardTemplate && typeof body.cardTemplate === "object"
        ? body.cardTemplate
        : null;

    if (!cardTemplate) {
      return NextResponse.json({ error: "cardTemplate missing" }, { status: 400 });
    }

    // ✅ On accepte tes fonts + on garde compat (sans/serif/mono)
    const allowedFonts = new Set([
      "inter",
      "poppins",
      "montserrat",
      "nunito",
      "roboto",
      "lora",
      "playfair",
      "oswald",
      "sans",
      "serif",
      "mono",
    ]);

    const font =
      typeof cardTemplate.font === "string" && allowedFonts.has(cardTemplate.font)
        ? cardTemplate.font
        : "inter";

    const clean = {
      title:
        typeof cardTemplate.title === "string"
          ? cardTemplate.title.slice(0, 40)
          : "Loyalty Card",
      bgColor: clampHex(cardTemplate.bgColor, "#111827"),
      textColor: clampHex(cardTemplate.textColor, "#ffffff"),
      font,
      logoUrl:
        typeof cardTemplate.logoUrl === "string"
          ? cardTemplate.logoUrl.slice(0, 500)
          : "",
      bgImageUrl:
        typeof cardTemplate.bgImageUrl === "string"
          ? cardTemplate.bgImageUrl.slice(0, 500)
          : "",
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
    return NextResponse.json({ error: e?.message || "failed" }, { status: 500 });
  }
}