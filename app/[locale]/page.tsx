import { redirect } from "next/navigation";
import { verifyClientSessionCookie } from "@/lib/clientSession";
import { requireMerchantUid } from "@/lib/merchantAuth";

const LOCALES = ["fr", "en", "es"] as const;
type Locale = (typeof LOCALES)[number];

function isLocale(value: string): value is Locale {
  return LOCALES.includes(value as Locale);
}

export default async function Home({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale: rawLocale } = await params;
  const locale: Locale = isLocale(rawLocale) ? rawLocale : "fr";

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