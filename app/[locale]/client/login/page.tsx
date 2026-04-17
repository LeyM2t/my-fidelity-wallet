"use client";

import { useMemo, useState } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { auth } from "@/lib/firebaseClient";
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
} from "firebase/auth";
import LanguageSwitcher from "@/components/LanguageSwitcher";

export default function ClientLoginPage() {
  const router = useRouter();
  const params = useParams<{ locale: string }>();
  const searchParams = useSearchParams();
  const t = useTranslations("clientLogin");

  const locale = String(params?.locale ?? "en");
  const next = useMemo(
    () => searchParams.get("next") || `/${locale}/wallet`,
    [locale, searchParams]
  );

  const [mode, setMode] = useState<"login" | "signup">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit() {
    setLoading(true);
    setError("");

    try {
      const cleanEmail = email.trim();

      if (!cleanEmail || !password) {
        throw new Error(t("errors.requiredFields"));
      }

      const userCredential =
        mode === "login"
          ? await signInWithEmailAndPassword(auth, cleanEmail, password)
          : await createUserWithEmailAndPassword(auth, cleanEmail, password);

      const idToken = await userCredential.user.getIdToken();

      const res = await fetch("/api/auth/client/sessionLogin", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ idToken }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => null);
        throw new Error(data?.error || t("errors.sessionCreationFailed"));
      }

      router.push(next);
      router.refresh();
    } catch (err) {
      const message =
        err instanceof Error ? err.message : t("errors.generic");
      setError(message);
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
        fontFamily:
          'Inter, Arial, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
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
            }}
          >
            {mode === "login" ? t("title.login") : t("title.signup")}
          </h1>

          <p
            style={{
              textAlign: "center",
              fontSize: 13,
              opacity: 0.7,
              marginBottom: 20,
            }}
          >
            {mode === "login"
              ? t("buttons.switchToSignup")
              : t("buttons.switchToLogin")}
          </p>

          <div style={{ display: "grid", gap: 12 }}>
            <input
              type="email"
              placeholder={t("placeholders.email")}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              style={{
                padding: 12,
                borderRadius: 12,
                border: "1px solid #ddd",
                fontSize: 14,
              }}
            />

            <input
              type="password"
              placeholder={t("placeholders.password")}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              style={{
                padding: 12,
                borderRadius: 12,
                border: "1px solid #ddd",
                fontSize: 14,
              }}
            />

            <button
              onClick={handleSubmit}
              disabled={loading}
              style={{
                padding: 12,
                borderRadius: 12,
                border: "none",
                background: "#111",
                color: "#fff",
                fontWeight: 700,
                cursor: loading ? "default" : "pointer",
              }}
            >
              {loading
                ? `⏳ ${t("buttons.loading")}`
                : mode === "login"
                  ? t("buttons.login")
                  : t("buttons.signup")}
            </button>

            <button
              type="button"
              onClick={() =>
                setMode((prev) => (prev === "login" ? "signup" : "login"))
              }
              style={{
                padding: 12,
                borderRadius: 12,
                border: "1px solid #ddd",
                background: "#fff",
                color: "#111",
                fontWeight: 600,
                cursor: "pointer",
              }}
            >
              {mode === "login"
                ? t("buttons.switchToSignup")
                : t("buttons.switchToLogin")}
            </button>

            {error ? (
              <div
                style={{
                  background: "#fee2e2",
                  color: "#991b1b",
                  padding: 10,
                  borderRadius: 10,
                  fontSize: 13,
                }}
              >
                ❌ {error}
              </div>
            ) : null}
          </div>
        </div>
      </div>
    </main>
  );
}