"use client";

import { useEffect, useState } from "react";
import { signInWithEmailAndPassword } from "firebase/auth";
import { useParams, useRouter } from "next/navigation";
import { auth } from "@/lib/firebaseClient";
import { useTranslations } from "next-intl";
import LanguageSwitcher from "@/components/LanguageSwitcher";

export default function MerchantLoginPage() {
  const router = useRouter();
  const params = useParams<{ locale: string }>();
  const locale = String(params?.locale ?? "en");
  const t = useTranslations("merchantLogin");

  const [nextPath, setNextPath] = useState(`/${locale}/scan`);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    const sp = new URLSearchParams(window.location.search);
    const n = sp.get("next");

    if (!n) {
      setNextPath(`/${locale}/scan`);
      return;
    }

    if (
      n.startsWith("/en/") ||
      n.startsWith("/fr/") ||
      n.startsWith("/es/")
    ) {
      setNextPath(n);
      return;
    }

    if (n.startsWith("/")) {
      setNextPath(`/${locale}${n}`);
      return;
    }

    setNextPath(`/${locale}/scan`);
  }, [locale]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);
    setLoading(true);

    try {
      const cred = await signInWithEmailAndPassword(auth, email, password);
      const idToken = await cred.user.getIdToken();

      const res = await fetch("/api/auth/sessionLogin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ idToken }),
      });

      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error(j?.error || t("errors.sessionLogin"));
      }

      router.replace(nextPath);
    } catch (e: any) {
      setErr(e?.message || t("errors.login"));
    } finally {
      setLoading(false);
    }
  }

  return (
    <main
      style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 20,
        background: "#f9fafb",
      }}
    >
      <div style={{ width: "100%", maxWidth: 380 }}>
        <div style={{ marginBottom: 16 }}>
          <LanguageSwitcher />
        </div>

        <div
          style={{
            width: "100%",
            background: "#fff",
            padding: 24,
            borderRadius: 20,
            boxShadow: "0 10px 30px rgba(0,0,0,0.08)",
          }}
        >
          <h1
            style={{
              fontSize: 24,
              fontWeight: 700,
              marginBottom: 6,
              textAlign: "center",
              color: "#111",
            }}
          >
            {t("title")}
          </h1>

          <p
            style={{
              textAlign: "center",
              fontSize: 13,
              color: "#6b7280",
              marginBottom: 20,
            }}
          >
            {t("subtitle")}
          </p>

          <form onSubmit={onSubmit} style={{ display: "grid", gap: 12 }}>
            <input
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              type="email"
              placeholder={t("email")}
              required
              style={{
                padding: 12,
                borderRadius: 12,
                border: "1px solid #ddd",
                fontSize: 14,
                color: "#111",
                background: "#fff",
              }}
            />

            <input
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              type="password"
              placeholder={t("password")}
              required
              style={{
                padding: 12,
                borderRadius: 12,
                border: "1px solid #ddd",
                fontSize: 14,
                color: "#111",
                background: "#fff",
              }}
            />

            <button
              disabled={loading}
              type="submit"
              style={{
                marginTop: 6,
                padding: 12,
                borderRadius: 12,
                border: "none",
                background: "#111",
                color: "#fff",
                fontWeight: 700,
                cursor: loading ? "not-allowed" : "pointer",
              }}
            >
              {loading ? `⏳ ${t("loading")}` : t("login")}
            </button>

            {err && (
              <div
                style={{
                  background: "#fee2e2",
                  color: "#991b1b",
                  padding: 10,
                  borderRadius: 10,
                  fontSize: 13,
                }}
              >
                ❌ {err}
              </div>
            )}
          </form>
        </div>
      </div>
    </main>
  );
}