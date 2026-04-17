import { cookies } from "next/headers";
import { getAuth } from "firebase-admin/auth";

export async function requireMerchantUid() {
  const cookieStore = await cookies();
  const session = cookieStore.get("merchantSession")?.value;
  if (!session) return null;

  try {
    const decoded = await getAuth().verifySessionCookie(session, true);
    return decoded.uid;
  } catch {
    return null;
  }
}