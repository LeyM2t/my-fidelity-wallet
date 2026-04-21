import "@/lib/firebaseAdmin";
import { cookies } from "next/headers";
import { getAuth } from "firebase-admin/auth";
import { db } from "@/lib/firebaseAdmin";

type AppUserRole = "client" | "merchant";

async function getUserRole(uid: string): Promise<AppUserRole | null> {
  const snap = await db.collection("users").doc(uid).get();

  if (!snap.exists) return null;

  const data = snap.data() as { role?: AppUserRole } | undefined;
  const role = data?.role;

  if (role !== "client" && role !== "merchant") {
    return null;
  }

  return role;
}

export async function requireMerchantUid(): Promise<string | null> {
  const cookieStore = await cookies();
  const session = cookieStore.get("merchantSession")?.value;

  if (!session) return null;

  try {
    const decoded = await getAuth().verifySessionCookie(session, true);
    const uid = decoded.uid;

    const role = await getUserRole(uid);
    if (role !== "merchant") {
      return null;
    }

    return uid;
  } catch {
    return null;
  }
}