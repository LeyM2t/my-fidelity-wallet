// app/qr-public/page.tsx
export const dynamic = "force-dynamic";

import QRCode from "qrcode";
import { headers } from "next/headers";

type SP = { token?: string };

async function getBaseUrl() {
  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host");
  const proto = h.get("x-forwarded-proto") ?? "https";
  return host ? `${proto}://${host}` : "http://localhost:3000";
}

export default async function QrPublicPage(props: {
  searchParams?: SP | Promise<SP>;
}) {
  const sp = await props.searchParams;
  const token = typeof sp?.token === "string" ? sp.token : "";

  const baseUrl = await getBaseUrl();
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
