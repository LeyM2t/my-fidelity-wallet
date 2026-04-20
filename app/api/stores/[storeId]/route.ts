import { NextResponse } from "next/server";
import { db } from "@/lib/firebaseAdmin";
import { FieldValue } from "firebase-admin/firestore";
import { getAuth } from "firebase-admin/auth";

type BgType = "color" | "gradient" | "image";

type Box = {
  x: number;
  y: number;
  width: number;
  height: number;
};

function sanitizeStoreId(storeId: string) {
  return storeId.replace(/[^a-zA-Z0-9_-]/g, "_").slice(0, 200);
}

function clampHex(v: unknown, fallback: string) {
  const s = typeof v === "string" ? v.trim() : "";
  return /^#[0-9a-fA-F]{6}$/.test(s) ? s.toLowerCase() : fallback;
}

function clampNumber(v: unknown, min: number, max: number, fallback: number) {
  const n = typeof v === "number" && Number.isFinite(v) ? v : fallback;
  return Math.min(max, Math.max(min, n));
}

function clampString(v: unknown, maxLength: number, fallback = "") {
  return typeof v === "string" ? v.trim().slice(0, maxLength) : fallback;
}

function normalizeBox(b: unknown, fallback: Box): Box {
  const box = b as Partial<Box> | undefined;

  return {
    x: clampNumber(box?.x, -999, 999, fallback.x),
    y: clampNumber(box?.y, -999, 999, fallback.y),
    width: clampNumber(box?.width, 10, 9999, fallback.width),
    height: clampNumber(box?.height, 10, 9999, fallback.height),
  };
}

async function getVerifiedMerchant(req: Request) {
  const authHeader = req.headers.get("authorization") || "";
  const match = authHeader.match(/^Bearer\s+(.+)$/i);
  const token = match?.[1]?.trim();

  if (!token) return null;

  try {
    const decoded = await getAuth().verifyIdToken(token);
    return {
      uid: decoded.uid,
      email: typeof decoded.email === "string" ? decoded.email : "",
    };
  } catch {
    return null;
  }
}

function getDefaultCardTemplate() {
  return {
    title: "Loyalty Card",
    textColor: "#ffffff",
    font: "inter",
    bgType: "color" as BgType,
    bgColor: "#111827",
    gradient: { from: "#ff0000", to: "#111827", angle: 45 },
    logoUrl: "",
    bgImageUrl: "",
    bgImageEnabled: false,
    bgImageOpacity: 0.85,
    logoBox: { x: 18, y: 18, width: 56, height: 56 },
    bgImageBox: { x: 0, y: 0, width: 420, height: 220 },
  };
}

function getStoreOwner(storeData: Record<string, unknown>) {
  const merchantId =
    typeof storeData.merchantId === "string" ? storeData.merchantId.trim() : "";

  const ownerUid =
    typeof storeData.ownerUid === "string"
      ? storeData.ownerUid.trim()
      : typeof storeData.merchantUid === "string"
        ? storeData.merchantUid.trim()
        : "";

  const ownerEmail =
    typeof storeData.ownerEmail === "string"
      ? storeData.ownerEmail.toLowerCase().trim()
      : typeof storeData.merchantEmail === "string"
        ? storeData.merchantEmail.toLowerCase().trim()
        : "";

  return { merchantId, ownerUid, ownerEmail };
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
        cardTemplate: getDefaultCardTemplate(),
      });
    }

    const data = snap.data() || {};

    return NextResponse.json({
      storeId: sid,
      name: typeof data.name === "string" ? data.name : "",
      cardTemplate: data.cardTemplate || getDefaultCardTemplate(),
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
    const merchant = await getVerifiedMerchant(req);

    if (!merchant) {
      return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    }

    const { storeId } = await ctx.params;
    const sid = sanitizeStoreId(storeId);

    const ref = db.collection("stores").doc(sid);
    const snap = await ref.get();

    if (!snap.exists) {
      return NextResponse.json({ error: "store not found" }, { status: 404 });
    }

    const storeData = (snap.data() || {}) as Record<string, unknown>;
    const { merchantId, ownerUid, ownerEmail } = getStoreOwner(storeData);
    const merchantEmail = merchant.email.toLowerCase().trim();

    const hasKnownOwner = !!(merchantId || ownerUid || ownerEmail);

    // Fail-closed:
    // si le store n'a pas de propriétaire identifiable, on bloque.
    if (!hasKnownOwner) {
      return NextResponse.json(
        { error: "store owner missing" },
        { status: 403 }
      );
    }

    if (merchantId && merchantId !== merchant.uid) {
      return NextResponse.json({ error: "forbidden" }, { status: 403 });
    }

    if (ownerUid && ownerUid !== merchant.uid) {
      return NextResponse.json({ error: "forbidden" }, { status: 403 });
    }

    if (ownerEmail && merchantEmail && ownerEmail !== merchantEmail) {
      return NextResponse.json({ error: "forbidden" }, { status: 403 });
    }

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

    const bgType: BgType =
      cardTemplate.bgType === "gradient" || cardTemplate.bgType === "image"
        ? cardTemplate.bgType
        : "color";

    const font =
      typeof cardTemplate.font === "string" && allowedFonts.has(cardTemplate.font)
        ? cardTemplate.font
        : "inter";

    const clean = {
      title: clampString(cardTemplate.title, 40, "Loyalty Card"),
      textColor: clampHex(cardTemplate.textColor, "#ffffff"),
      font,
      bgType,
      bgColor: clampHex(cardTemplate.bgColor, "#111827"),
      gradient: {
        from: clampHex(cardTemplate.gradient?.from, "#ff0000"),
        to: clampHex(cardTemplate.gradient?.to, "#111827"),
        angle: clampNumber(cardTemplate.gradient?.angle, 0, 360, 45),
      },
      logoUrl: clampString(cardTemplate.logoUrl, 500, ""),
      bgImageUrl: clampString(cardTemplate.bgImageUrl, 500, ""),
      bgImageEnabled: !!cardTemplate.bgImageEnabled,
      bgImageOpacity: clampNumber(cardTemplate.bgImageOpacity, 0, 1, 0.85),
      logoBox: normalizeBox(cardTemplate.logoBox, {
        x: 18,
        y: 18,
        width: 56,
        height: 56,
      }),
      bgImageBox: normalizeBox(cardTemplate.bgImageBox, {
        x: 0,
        y: 0,
        width: 420,
        height: 220,
      }),
    };

    await ref.set(
      {
        cardTemplate: clean,
        updatedAt: FieldValue.serverTimestamp(),
      },
      { merge: true }
    );

    return NextResponse.json({
      ok: true,
      storeId: sid,
      cardTemplate: clean,
    });
  } catch (e: any) {
    return NextResponse.json(
      { error: e?.message || "failed" },
      { status: 500 }
    );
  }
}