import { Suspense } from "react";
import QrPublicClient from "./QrPublicClient";

export const dynamic = "force-dynamic";

export default function Page() {
  return (
    <Suspense fallback={<div style={{ padding: 24, fontFamily: "Arial" }}>Chargement…</div>}>
      <QrPublicClient />
    </Suspense>
  );
}
