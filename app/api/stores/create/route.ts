import { NextRequest, NextResponse } from "next/server";
import { db } from "../../../../lib/firebaseAdmin";
import { requireMerchantUid } from "../../../../lib/merchantAuth";
import { slugify } from "../../../../lib/slugify";
import { generateScanSecret } from "../../../../lib/generateScanSecret";
import { FieldValue } from "firebase-admin/firestore";

export async function POST(req: NextRequest) {
  try {
    const merchantUid = await requireMerchantUid();

    if (!merchantUid) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const body = await req.json().catch(() => ({}));
    const { name } = body;

    if (!name || typeof name !== "string" || !name.trim()) {
      return NextResponse.json(
        { error: "Invalid store name" },
        { status: 400 }
      );
    }

    const cleanName = name.trim().slice(0, 80);

    const existingStoreSnap = await db
      .collection("stores")
      .where("merchantId", "==", merchantUid)
      .limit(1)
      .get();

    if (!existingStoreSnap.empty) {
      return NextResponse.json(
        { error: "Store already exists for this merchant" },
        { status: 400 }
      );
    }

    let baseSlug = slugify(cleanName);
    if (!baseSlug) baseSlug = "store";

    let storeId = baseSlug;
    let counter = 1;

    while (true) {
      const doc = await db.collection("stores").doc(storeId).get();
      if (!doc.exists) break;

      counter++;
      storeId = `${baseSlug}-${counter}`;
    }

    const scanSecret = generateScanSecret();

    const cardTemplate = {
      title: cleanName,
      textColor: "#ffffff",
      font: "inter",
      bgType: "color",
      bgColor: "#111827",
      gradient: {
        from: "#ff0000",
        to: "#111827",
        angle: 45,
      },
      logoUrl: "",
      bgImageUrl: "",
      bgImageEnabled: false,
      bgImageOpacity: 0.85,
      logoBox: {
        x: 18,
        y: 18,
        width: 56,
        height: 56,
      },
      bgImageBox: {
        x: 0,
        y: 0,
        width: 420,
        height: 220,
      },
    };

    await db.collection("stores").doc(storeId).set({
      storeId,
      name: cleanName,
      merchantId: merchantUid,
      scanSecret,
      goal: 10,
      cardTemplate,
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    });

    return NextResponse.json({
      success: true,
      storeId,
    });
  } catch (error) {
    console.error("POST /api/stores/create error:", error);

    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}