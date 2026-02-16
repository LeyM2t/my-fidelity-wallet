// app/qr-public/page.tsx
import QRCode from "qrcode";
import { headers } from "next/headers";

export const dynamic = "force-dynamic";

function getBaseUrl() {
  // Option 1 (recommandé) : variable d'env sur Vercel
  const envUrl = process.env.NEXT_PUBLIC_APP_URL;
  if (envUrl && envUrl.trim()) return envUrl.replace(/\/+$/, "");

  // Option 2 : fallback via headers (marque la page dynamic)
  const h = headers();
  const host = h.get("x-forwarded-host") ?? h.get("host");
  const proto = h.get("x-forwarded-proto") ?? "https";
  return host ? `${proto}://${host}` : "http://localhost:3000";
}

export default async function QrPublicPage({
  searchParams,
}: {
  searchParams: { token?: string };
}) {
  const token = typeof searchParams?.token === "string" ? searchParams.token : "";

  const baseUrl = getBaseUrl();
  const url = `${baseUrl}/add?token=${encodeURIComponent(token)}`;

  const dataUrl = await QRCode.toDataURL(url, { margin: 2, width: 420 });

  return (
    <main style={{ padding: 24, fontFamily: "Arial", maxWidth: 720, margin: "0 auto" }}>
      <h1 style={{ fontSize: 22, marginBottom: 8 }}>QR Public</h1>

      <div style={{ fontSize: 13, color: "#666", marginBottom: 12 }}>
        URL : <code>{url}</code>
      </div>

      <div style={{ padding: 16, border: "1px solid #ddd", borderRadius: 16, display: "inline-block" }}>
        <img src={dataUrl} alt="QR Code" />
      </div>

      {!token ? (
        <p style={{ marginTop: 12, color: "#b91c1c" }}>
          ⚠️ token manquant dans l’URL (ex: /qr-public?token=XXXX)
        </p>
      ) : null}
    </main>
  );
}
