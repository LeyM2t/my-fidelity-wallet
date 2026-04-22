import { redirect } from "next/navigation";
import { verifyClientSessionCookie } from "@/lib/clientSession";
import { requireMerchantUid } from "@/lib/merchantAuth";

export default async function Home({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;

  const clientUid = await verifyClientSessionCookie(true);
  if (clientUid) {
    redirect(`/${locale}/wallet`);
  }

  const merchantUid = await requireMerchantUid();
  if (merchantUid) {
    redirect(`/${locale}/merchant`);
  }

  redirect(`/${locale}/client/login`);
}