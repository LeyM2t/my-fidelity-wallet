"use client";

import { useEffect, useMemo, useState } from "react";
import {
  sendPasswordResetEmail,
  signInWithEmailAndPassword,
} from "firebase/auth";
import { useParams, useRouter } from "next/navigation";
import { auth } from "@/lib/firebaseClient";
import { useTranslations } from "next-intl";
import LanguageSwitcher from "@/components/LanguageSwitcher";

function getForgotTexts(locale: string) {
  if (locale === "fr") {
    return {
      forgotPassword: "Mot de passe oublié ?",
      emailRequired: "Entre ton email pour réinitialiser ton mot de passe.",
      resetSent:
        "Email de réinitialisation envoyé. Vérifie ta boîte mail.",
      resetFailed:
        "Impossible d’envoyer l’email de réinitialisation.",
    };
  }

  if (locale === "es") {
    return {
      forgotPassword: "¿Olvidaste tu contraseña?",
      emailRequired: "Introduce tu email para restablecer tu contraseña.",
      resetSent:
        "Correo de restablecimiento enviado. Revisa tu buzón.",
      resetFailed:
        "No se pudo enviar el correo de restablecimiento.",
    };
  }

  return {
    forgotPassword: "Forgot password?",
    emailRequired: "Enter your email to reset your password.",
    resetSent: "Password reset email sent. Check your inbox.",
    resetFailed: "Could not send password reset email.",
  };
}

export default function MerchantLoginPage() {
  const router = useRouter();
  const params = useParams<{ locale: string }>();
  const locale = String(params?.locale ?? "en");
  const t = useTranslations("merchantLogin");
  const forgotTexts = useMemo(() => getForgotTexts(locale), [locale]);

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

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);
    setInfo("");
    setLoading(true);

    try {
      const cred = await signInWithEmailAndPassword(auth, email.trim(), password);
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

  async function handleForgotPassword() {
    setErr(null);
    setInfo("");
    setResetLoading(true);

    try {
      const cleanEmail = email.trim();

      if (!cleanEmail) {
        throw new Error(forgotTexts.emailRequired);
      }

      await sendPasswordResetEmail(auth, cleanEmail);
      setInfo(forgotTexts.resetSent);
    } catch (e: any) {
      setErr(e?.message || forgotTexts.resetFailed);
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
                placeholder={t("password")}
                required
                autoComplete="current-password"
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
                  ? `⏳ ${forgotTexts.forgotPassword}`
                  : forgotTexts.forgotPassword}
              </button>
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
              {loading ? `⏳ ${t("loading")}` : t("login")}
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