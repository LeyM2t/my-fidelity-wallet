import { redirect } from "next/navigation";
import { cookies } from "next/headers";

const LOCALES = ["fr", "en", "es"] as const;
type Locale = (typeof LOCALES)[number];

function isLocale(value: string): value is Locale {
  return LOCALES.includes(value as Locale);
}

export default async function HomePage() {
  const cookieStore = await cookies();
  const preferredLocale = cookieStore.get("preferredLocale")?.value ?? "";

  const locale: Locale = isLocale(preferredLocale) ? preferredLocale : "fr";

  redirect(`/${locale}`);
}