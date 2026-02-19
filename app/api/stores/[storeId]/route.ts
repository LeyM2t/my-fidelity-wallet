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

function isHex6(v: any) {
  return typeof v === "string" && /^#[0-9a-fA-F]{6}$/.test(v.trim());
}

function clampNumber(v: any, min: number, max: number, fallback: number) {
  const n = typeof v === "number" && Number.isFinite(v) ? v : fallback;
  return Math.min(max, Math.max(min, n));
}

type Box = { x: number; y: number; width: number; height: number };

function sanitizeBox(v: any, fallback: Box): Box {
  return {
    x: clampNumber(v?.x, -999, 999, fallback.x),
    y: clampNumber(v?.y, -999, 999, fallback.y),
    width: clampNumber(v?.width, 10, 9999, fallback.width),
    height: clampNumber(v?.height, 10, 9999, fallback.height),
  };
}

function sanitizeTemplate(input: any) {
  // Defaults compatibles V2.6
  const DEFAULT = {
    title: "Loyalty Card",
    textColor: "#ffffff",
    font: "inter",

    bgType: "color" as "color" | "gradient" | "image",
    bgColor: "#111827",
    gradient: { from: "#ff0000", to: "#111827", angle: 45 },

    logoUrl: "",
    bgImageUrl: "",

    bgImageEnabled: false,
    bgImageOpacity: 0.85,

    logoBox: { x: 18, y: 18, width: 56, height: 56 },
    bgImageBox: { x: 0, y: 0, width: 420, height: 220 },
  };

  const t = (input && typeof input === "object") ? input : {};

  // title
  const title =
    typeof t.title === "string" ? t.title.slice(0, 40) : DEFAULT.title;

  // colors
  const bgColor =
    isHex6(t.bgColor) ? t.bgColor.toLowerCase() : DEFAULT.bgColor;

  const textColor =
    isHex6(t.textColor) ? t.textColor.toLowerCase() : DEFAULT.textColor;

  // font (on accepte tes clés du builder)
  // NB: on garde une whitelist large pour éviter des valeurs “random”
  const allowedFonts = new Set([
    "inter",
    "poppins",
    "montserrat",
    "nunito",
    "roboto",
    "lora",
    "playfair",
    "oswald",
    // compat anciens
    "sans",
    "serif",
    "mono",
  ]);
  const font =
    typeof t.font === "string" && allowedFonts.has(t.font)
      ? t.font
      : DEFAULT.font;

  // bgType
  const bgType =
    t.bgType === "color" || t.bgType === "gradient" || t.bgType === "image"
      ? t.bgType
      : DEFAULT.bgType;

  // gradient
  const gradient = {
    from: isHex6(t?.gradient?.from) ? t.gradient.from.toLowerCase() : DEFAULT.gradient.from,
    to: isHex6(t?.gradient?.to) ? t.gradient.to.toLowerCase() : DEFAULT.gradient.to,
    angle: clampNumber(t?.gradient?.angle, 0, 360, DEFAULT.gradient.angle),
  };

  // urls
  const logoUrl =
    typeof t.logoUrl === "string" ? t.logoUrl.slice(0, 500) : DEFAULT.logoUrl;

  const bgImageUrl =
    typeof t.bgImageUrl === "string"
      ? t.bgImageUrl.slice(0, 500)
      : DEFAULT.bgImageUrl;

  // combine base + image
  // compat: si bgType=image (ancienne logique), on force l’activation
  const bgImageEnabledRaw =
    typeof t.bgImageEnabled === "boolean"
      ? t.bgImageEnabled
      : (bgType === "image" || !!(bgImageUrl && bgImageUrl.trim()));

  const bgImageEnabled = !!bgImageEnabledRaw;

  const bgImageOpacity =
    clampNumber(t.bgImageOpacity, 0, 1, DEFAULT.bgImageOpacity);

  // boxes
  const logoBox = sanitizeBox(t.logoBox, DEFAULT.logoBox);
  const bgImageBox = sanitizeBox(t.bgImageBox, DEFAULT.bgImageBox);

  // NOTE: on garde aussi bgType=image pour compat,
  // mais l’affichage “combiné” se fait via bgImageEnabled/bgImageOpacity.
  return {
    title,
    bgColor,
    textColor,
    font,
    logoUrl,
    bgImageUrl,

    bgType,
    gradient,

    bgImageEnabled,
    bgImageOpacity,

    logoBox,
    bgImageBox,
  };
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
        cardTemplate: sanitizeTemplate({}),
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
    const cardTemplate =
      body?.cardTemplate && typeof body.cardTemplate === "object"
        ? body.cardTemplate
        : null;

    if (!cardTemplate) {
      return NextResponse.json(
        { error: "cardTemplate missing" },
        { status: 400 }
      );
    }

    const clean = sanitizeTemplate(cardTemplate);

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
