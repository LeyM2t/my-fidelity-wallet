import { NextResponse } from "next/server";
import { db } from "@/lib/firebaseAdmin";
import { FieldValue } from "firebase-admin/firestore";

type Body = {
  storeId?: string;
  ownerId?: string;
  cardId?: string;
  add?: number;
};

async function authorizeAddStamps(req: Request, storeId: string) {
  // Mode compat :
  // - si stores/{storeId}.scanSecret n'existe pas -> OK
  // - si il existe -> header x-scan-secret doit matcher
  const scanSecretHeader = (req.headers.get("x-scan-secret") || "").trim();

  const storeRef = db.collection("stores").doc(storeId);
  const storeSnap = await storeRef.get();
  const storeData = storeSnap.exists ? (storeSnap.data() as any) : null;

  const requiredSecret =
    typeof storeData?.scanSecret === "string" ? storeData.scanSecret.trim() : "";

  if (!requiredSecret) {
    return { ok: true as const, mode: "compat-no-secret" as const };
  }

  if (!scanSecretHeader || scanSecretHeader !== requiredSecret) {
    return { ok: false as const, status: 403 as const, error: "forbidden" };
  }

  return { ok: true as const, mode: "secret-ok" as const };
}

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as Body;

    const storeId = typeof body.storeId === "string" ? body.storeId : "";
    const ownerId = typeof body.ownerId === "string" ? body.ownerId : "";
    const cardId = typeof body.cardId === "string" ? body.cardId : "";
    const add = typeof body.add === "number" ? body.add : NaN;

    if (!storeId)
      return NextResponse.json({ error: "storeId missing" }, { status: 400 });
    if (!ownerId)
      return NextResponse.json({ error: "ownerId missing" }, { status: 400 });
    if (!cardId)
      return NextResponse.json({ error: "cardId missing" }, { status: 400 });
    if (!Number.isFinite(add) || add <= 0)
      return NextResponse.json({ error: "add must be positive" }, { status: 400 });

    // ✅ SECURITY (V2 scanSecret)
    const auth = await authorizeAddStamps(req, storeId);
    if (!auth.ok) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    const cardsCol = db.collection("cards");
    const cardRef = cardsCol.doc(cardId);

    const result = await db.runTransaction(async (tx) => {
      const snap = await tx.get(cardRef);

      if (!snap.exists) {
        return { ok: false as const, status: 404 as const, error: "card not found" };
      }

      const data = snap.data() || {};

      if (data.storeId !== storeId)
        return { ok: false as const, status: 403 as const, error: "storeId mismatch" };

      if (data.ownerId !== ownerId)
        return { ok: false as const, status: 403 as const, error: "ownerId mismatch" };

      // ✅ Compat / auto-migration:
      // Ancien modèle: data.active = "store_demo_1" (ou true)
      // Nouveau modèle: data.status = "active"
      const status = typeof data.status === "string" ? data.status : undefined;

      const legacyActive =
        data.active === true ||
        (typeof data.active === "string" && data.active === storeId) ||
        (typeof data.active === "string" && data.active.toLowerCase() === "active");

      const shouldTreatAsActive = status === "active" || (!status && legacyActive);

      if (!shouldTreatAsActive) {
        return {
          ok: false as const,
          status: 400 as const,
          error: "cannot add stamps to non-active card",
        };
      }

      // Si on est dans l'ancien modèle, on "répare" la carte maintenant
      if (status !== "active") {
        tx.update(cardRef, {
          status: "active",
          active: FieldValue.delete(),
          updatedAt: FieldValue.serverTimestamp(),
        });
      }

      const goal = typeof data.goal === "number" && data.goal > 0 ? data.goal : 10;

      const stamps = typeof data.stamps === "number" && data.stamps >= 0 ? data.stamps : 0;

      let total = stamps + add;

      // ------------------------
      // CAS 1 : pas encore atteint
      // ------------------------
      if (total < goal) {
        tx.update(cardRef, {
          stamps: total,
          updatedAt: FieldValue.serverTimestamp(),
        });

        return {
          ok: true as const,
          stamps: total,
          goal,
          rewardAvailable: false,
          rolledOver: false,
          activeCardId: cardId,
          rewardCardId: null as string | null,
          createdRewardIds: [] as string[],
          surplus: 0,
        };
      }

      // ------------------------
      // CAS 2 : atteint / dépasse goal
      // ------------------------
      const surplusAfterFirst = total - goal;

      // La carte actuelle devient reward
      tx.update(cardRef, {
        stamps: goal,
        status: "reward",
        rewardAvailable: true,
        updatedAt: FieldValue.serverTimestamp(),
      });

      const createdRewardIds: string[] = [cardId];

      // Si gros ajout (ex: +25), on peut générer plusieurs rewards
      let surplus = surplusAfterFirst;

      while (surplus >= goal) {
        const rewardRef = cardsCol.doc();

        tx.set(rewardRef, {
          storeId,
          ownerId,
          stamps: goal,
          goal,
          status: "reward",
          rewardAvailable: true,
          createdAt: FieldValue.serverTimestamp(),
          updatedAt: FieldValue.serverTimestamp(),
        });

        createdRewardIds.push(rewardRef.id);
        surplus -= goal;
      }

      // Nouvelle carte active pour le surplus restant
      const activeRef = cardsCol.doc();

      tx.set(activeRef, {
        storeId,
        ownerId,
        stamps: surplus,
        goal,
        status: "active",
        rewardAvailable: false,
        createdAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp(),
      });

      return {
        ok: true as const,
        stamps: goal,
        goal,
        rewardAvailable: true,
        rolledOver: true,
        activeCardId: activeRef.id,
        rewardCardId: cardId,
        createdRewardIds,
        surplus,
      };
    });

    if (!result.ok) {
      return NextResponse.json({ error: result.error }, { status: result.status });
    }

    // (Optionnel) on pourrait renvoyer auth.mode en debug, mais je le laisse clean
    return NextResponse.json(result);
  } catch (e: any) {
    return NextResponse.json(
      { error: String(e?.message ?? e ?? "unknown error") },
      { status: 500 }
    );
  }
}