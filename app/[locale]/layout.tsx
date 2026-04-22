import { NextIntlClientProvider } from "next-intl";
import { getMessages } from "next-intl/server";
import { notFound } from "next/navigation";
import PwaInstallPrompt from "@/components/PwaInstallPrompt";

const locales = ["en", "fr", "es"];

export default async function LocaleLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;

  if (!locales.includes(locale)) {
    notFound();
  }

  const messages = await getMessages({ locale });

  return (
    <NextIntlClientProvider locale={locale} messages={messages}>
      <>
        {children}
        <PwaInstallPrompt />
      </>
    </NextIntlClientProvider>
  );
}