import Link from "next/link";
import QrClient from "./qr-client";

type Props = {
  params: Promise<{ storeId: string }>;
};

export default async function CardQrPage({ params }: Props) {
  const { storeId } = await params;

  return (
    <main style={{ padding: 24, maxWidth: 720, margin: "0 auto" }}>
      <div style={{ marginBottom: 16 }}>
        <Link href="/cards" style={{ opacity: 0.8 }}>
          ← Retour
        </Link>
      </div>

      <QrClient storeId={storeId} />
    </main>
  );
}
