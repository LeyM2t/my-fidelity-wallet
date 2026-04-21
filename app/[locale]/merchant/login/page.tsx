// app/[locale]/merchant/login/page.tsx

"use client";

import { useEffect, useMemo, useState } from "react";
import {
  createUserWithEmailAndPassword,
  fetchSignInMethodsForEmail,
  sendPasswordResetEmail,
  signInWithEmailAndPassword,
} from "firebase/auth";
import { useParams, useRouter } from "next/navigation";
import { auth } from "@/lib/firebaseClient";
import { useTranslations } from "next-intl";
import LanguageSwitcher from "@/components/LanguageSwitcher";

function isEmailAlreadyInUseError(error: unknown) {
  if (!(error instanceof Error)) return false;
  return (
    error.message.includes("auth/email-already-in-use") ||
    error.message.includes("email-already-in-use")
  );
}

export default function MerchantLoginPage() {
  const router = useRouter();
  const params = useParams<{ locale: string }>();
  const locale = String(params?.locale ?? "en");
  const t = useTranslations("merchantLogin");

  const [mode, setMode] = useState<"login" | "signup">("login");
  const [nextPath, setNextPath] = useState(`/${locale}/merchant`);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [resetLoading, setResetLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [info, setInfo] = useState<string>("");

  useEffect(() => {
    const sp = new URLSearchParams(window.location.search);
    const n = sp.get("next");

    if (!n) {
      setNextPath(`/${locale}/merchant`);
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

    setNextPath(`/${locale}/merchant`);
  }, [locale]);

  async function resolveUserCredential(cleanEmail: string, cleanPassword: string) {
    if (mode === "login") {
      return signInWithEmailAndPassword(auth, cleanEmail, cleanPassword);
    }

    try {
      return await createUserWithEmailAndPassword(auth, cleanEmail, cleanPassword);
    } catch (err) {
      if (!isEmailAlreadyInUseError(err)) {
        throw err;
      }

      const methods = await fetchSignInMethodsForEmail(auth, cleanEmail);
      if (!methods.includes("password")) {
        throw err;
      }

      return signInWithEmailAndPassword(auth, cleanEmail, cleanPassword);
    }
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);
    setInfo("");
    setLoading(true);

    try {
      const cleanEmail = email.trim();
      const cleanPassword = password.trim();

      if (!cleanEmail || !cleanPassword) {
        throw new Error(t("errors.requiredFields"));
      }

      const cred = await resolveUserCredential(cleanEmail, cleanPassword);
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
      router.refresh();
    } catch (e: any) {
      setErr(e?.message || t("errors.login"));
    } finally {
      setLoading(false);
    }
  }

  async function handleForgotPassword() {
    setErr(null);
    setInfo("");
    setResetLoading(true);

    try {
      const cleanEmail = email.trim();

      if (!cleanEmail) {
        throw new Error(t("forgotPassword.emailRequired"));
      }

      await sendPasswordResetEmail(auth, cleanEmail);
      setInfo(t("forgotPassword.resetSent"));
    } catch (e: any) {
      setErr(e?.message || t("forgotPassword.resetFailed"));
    } finally {
      setResetLoading(false);
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
            {mode === "login" ? t("title.login") : t("title.signup")}
          </h1>

          <p
            style={{
              textAlign: "center",
              fontSize: 13,
              color: "#6b7280",
              marginBottom: 20,
            }}
          >
            {mode === "login" ? t("subtitle.login") : t("subtitle.signup")}
          </p>

          <form onSubmit={onSubmit} style={{ display: "grid", gap: 12 }}>
            <input
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              type="email"
              placeholder={t("placeholders.email")}
              required
              autoComplete="email"
              style={{
                padding: 12,
                borderRadius: 12,
                border: "1px solid #ddd",
                fontSize: 14,
                color: "#111",
                background: "#fff",
              }}
            />

            <div style={{ display: "grid", gap: 8 }}>
              <input
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                type="password"
                placeholder={t("placeholders.password")}
                required
                autoComplete={
                  mode === "login" ? "current-password" : "new-password"
                }
                style={{
                  padding: 12,
                  borderRadius: 12,
                  border: "1px solid #ddd",
                  fontSize: 14,
                  color: "#111",
                  background: "#fff",
                }}
              />

              {mode === "login" ? (
                <button
                  type="button"
                  onClick={handleForgotPassword}
                  disabled={resetLoading}
                  style={{
                    alignSelf: "flex-end",
                    border: "none",
                    background: "transparent",
                    color: "#2563eb",
                    fontSize: 13,
                    fontWeight: 700,
                    cursor: resetLoading ? "default" : "pointer",
                    padding: 0,
                  }}
                >
                  {resetLoading
                    ? `⏳ ${t("forgotPassword.button")}`
                    : t("forgotPassword.button")}
                </button>
              ) : null}
            </div>

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
              {loading
                ? `⏳ ${t("buttons.loading")}`
                : mode === "login"
                  ? t("buttons.login")
                  : t("buttons.signup")}
            </button>

            <button
              type="button"
              onClick={() => {
                setMode((prev) => (prev === "login" ? "signup" : "login"));
                setErr(null);
                setInfo("");
              }}
              style={{
                padding: 12,
                borderRadius: 12,
                border: "1px solid #ddd",
                background: "#fff",
                color: "#111",
                fontWeight: 700,
                cursor: "pointer",
              }}
            >
              {mode === "login"
                ? t("buttons.switchToSignup")
                : t("buttons.switchToLogin")}
            </button>

            <button
              type="button"
              onClick={() => router.push(`/${locale}/client/login`)}
              style={{
                padding: 12,
                borderRadius: 12,
                border: "1px solid #ddd",
                background: "#fff",
                color: "#111",
                fontWeight: 700,
                cursor: "pointer",
              }}
            >
              {t("buttons.switchToClient")}
            </button>

            {info && (
              <div
                style={{
                  background: "#dcfce7",
                  color: "#166534",
                  padding: 10,
                  borderRadius: 10,
                  fontSize: 13,
                }}
              >
                ✅ {info}
              </div>
            )}

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