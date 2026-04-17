import { NextRequest, NextResponse } from "next/server";
import { db } from "../../../../lib/firebaseAdmin";
import { requireMerchantUid } from "../../../../lib/merchantAuth";
import { slugify } from "../../../../lib/slugify";
import { generateScanSecret } from "../../../../lib/generateScanSecret";

export async function POST(req: NextRequest) {
  try {
    // 1. Vérifier merchant connecté
    const merchantUid = await requireMerchantUid();

    if (!merchantUid) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    // 2. Lire body
    const body = await req.json();
    const { name } = body;

    if (!name || typeof name !== "string") {
      return NextResponse.json(
        { error: "Invalid store name" },
        { status: 400 }
      );
    }

    // 3. Vérifier si merchant a déjà un store (mono-store)
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

    // 4. Générer storeId (slug)
    let baseSlug = slugify(name);
    let storeId = baseSlug;
    let counter = 1;

    // Vérifier unicité
    while (true) {
      const doc = await db.collection("stores").doc(storeId).get();
      if (!doc.exists) break;

      counter++;
      storeId = `${baseSlug}-${counter}`;
    }

    // 5. Générer scanSecret
    const scanSecret = generateScanSecret();

    // 6. Template par défaut
    const cardTemplate = {
      title: name,
      bgColor: "#111827",
      textColor: "#ffffff",
      font: "Inter",
      logoUrl: "",
      bgImageUrl: ""
    };

    // 7. Création store
    await db.collection("stores").doc(storeId).set({
      storeId,
      name,
      merchantId: merchantUid,
      scanSecret,
      goal: 10,
      cardTemplate,
      createdAt: new Date(),
      updatedAt: new Date()
    });

    // 8. Réponse
    return NextResponse.json({
      success: true,
      storeId
    });

  } catch (error) {
    console.error("POST /api/stores/create error:", error);

    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}