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
        background: "#f3f4f6",
        fontFamily:
          'Inter, Arial, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
      }}
    >
      <div style={{ width: "100%", maxWidth: 540 }}>
        <div
          style={{
            marginBottom: 16,
            display: "flex",
            justifyContent: "flex-start",
          }}
        >
          <LanguageSwitcher />
        </div>

        <div
          style={{
            width: "100%",
            background: "#ffffff",
            padding: 36,
            borderRadius: 28,
            boxShadow: "0 10px 30px rgba(0,0,0,0.06)",
          }}
        >
          <h1
            style={{
              fontSize: 30,
              lineHeight: 1.15,
              fontWeight: 800,
              margin: 0,
              marginBottom: 14,
              color: "#111827",
            }}
          >
            {mode === "login" ? t("title.login") : t("title.signup")}
          </h1>

          <p
            style={{
              margin: 0,
              marginBottom: 28,
              fontSize: 15,
              lineHeight: 1.5,
              color: "#64748b",
            }}
          >
            {mode === "login"
              ? t("buttons.switchToSignup")
              : t("buttons.switchToLogin")}
          </p>

          <div style={{ display: "grid", gap: 16 }}>
            <input
              type="email"
              placeholder={t("placeholders.email")}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="email"
              style={{
                width: "100%",
                padding: "18px 20px",
                borderRadius: 18,
                border: "1px solid #d1d5db",
                fontSize: 16,
                color: "#111827",
                background: "#ffffff",
                outline: "none",
                boxSizing: "border-box",
              }}
            />

            <input
              type="password"
              placeholder={t("placeholders.password")}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete={
                mode === "login" ? "current-password" : "new-password"
              }
              style={{
                width: "100%",
                padding: "18px 20px",
                borderRadius: 18,
                border: "1px solid #d1d5db",
                fontSize: 16,
                color: "#111827",
                background: "#ffffff",
                outline: "none",
                boxSizing: "border-box",
              }}
            />

            <button
              onClick={handleSubmit}
              disabled={loading}
              style={{
                width: "100%",
                padding: "18px 20px",
                borderRadius: 18,
                border: "none",
                background: "#05070d",
                color: "#ffffff",
                fontSize: 16,
                fontWeight: 800,
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
                width: "100%",
                padding: "18px 20px",
                borderRadius: 18,
                border: "1px solid #d1d5db",
                background: "#ffffff",
                color: "#111827",
                fontSize: 16,
                fontWeight: 700,
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
                  padding: "14px 16px",
                  borderRadius: 14,
                  fontSize: 14,
                  lineHeight: 1.4,
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