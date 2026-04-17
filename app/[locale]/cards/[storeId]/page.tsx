import Link from "next/link";
import { getTranslations } from "next-intl/server";
import QrClient from "./qr-client";

type Props = {
  params: { storeId: string; locale: string };
};

export default async function CardQrPage({ params }: Props) {
  const { storeId, locale } = params;
  const t = await getTranslations("cardQr");

  return (
    <main style={{ padding: 24, maxWidth: 720, margin: "0 auto" }}>
      <div style={{ marginBottom: 16 }}>
        <Link href={`/${locale}/cards`} style={{ opacity: 0.8 }}>
          ← {t("back")}
        </Link>
      </div>

      <QrClient storeId={storeId} />
    </main>
  );
}