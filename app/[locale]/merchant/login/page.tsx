"use client";

import { useEffect, useMemo, useState } from "react";
import {
  createUserWithEmailAndPassword,
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
      resetSent: "Correo de restablecimiento enviado. Revisa tu buzón.",
      resetFailed: "No se pudo enviar el correo de restablecimiento.",
    };
  }

  return {
    forgotPassword: "Forgot password?",
    emailRequired: "Enter your email to reset your password.",
    resetSent: "Password reset email sent. Check your inbox.",
    resetFailed: "Could not send password reset email.",
  };
}

function getMerchantModeTexts(locale: string) {
  if (locale === "fr") {
    return {
      titleLogin: "Connexion merchant",
      titleSignup: "Créer un compte merchant",
      subtitleLogin: "Connecte-toi à ton espace commerçant.",
      subtitleSignup: "Crée ton compte pour gérer ton commerce.",
      signup: "Créer mon compte",
      switchToSignup: "Créer un compte merchant",
      switchToLogin: "J’ai déjà un compte merchant",
      roleMismatch:
        "Ce compte appartient à l’espace client. Connecte-toi depuis la page client.",
    };
  }

  if (locale === "es") {
    return {
      titleLogin: "Inicio de sesión merchant",
      titleSignup: "Crear una cuenta merchant",
      subtitleLogin: "Inicia sesión en tu espacio de comerciante.",
      subtitleSignup: "Crea tu cuenta para gestionar tu negocio.",
      signup: "Crear mi cuenta",
      switchToSignup: "Crear una cuenta merchant",
      switchToLogin: "Ya tengo una cuenta merchant",
      roleMismatch:
        "Esta cuenta pertenece al espacio cliente. Inicia sesión desde la página client.",
    };
  }

  return {
    titleLogin: "Merchant login",
    titleSignup: "Create a merchant account",
    subtitleLogin: "Sign in to your merchant area.",
    subtitleSignup: "Create your account to manage your business.",
    signup: "Create my account",
    switchToSignup: "Create a merchant account",
    switchToLogin: "I already have a merchant account",
    roleMismatch:
      "This account belongs to the client area. Please sign in from the client page.",
  };
}

function mapMerchantErrorMessage(
  rawMessage: string,
  fallback: string,
  locale: string
) {
  const texts = getMerchantModeTexts(locale);

  if (rawMessage === "ROLE_MISMATCH") {
    return texts.roleMismatch;
  }

  return rawMessage || fallback;
}

export default function MerchantLoginPage() {
  const router = useRouter();
  const params = useParams<{ locale: string }>();
  const locale = String(params?.locale ?? "en");
  const t = useTranslations("merchantLogin");
  const forgotTexts = useMemo(() => getForgotTexts(locale), [locale]);
  const modeTexts = useMemo(() => getMerchantModeTexts(locale), [locale]);

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

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);
    setInfo("");
    setLoading(true);

    try {
      const cleanEmail = email.trim();

      if (!cleanEmail || !password) {
        throw new Error(t("errors.login"));
      }

      const cred =
        mode === "login"
          ? await signInWithEmailAndPassword(auth, cleanEmail, password)
          : await createUserWithEmailAndPassword(auth, cleanEmail, password);

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
      const rawMessage = e?.message || t("errors.login");
      setErr(mapMerchantErrorMessage(rawMessage, t("errors.login"), locale));
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
            {mode === "login" ? modeTexts.titleLogin : modeTexts.titleSignup}
          </h1>

          <p
            style={{
              textAlign: "center",
              fontSize: 13,
              color: "#6b7280",
              marginBottom: 20,
            }}
          >
            {mode === "login"
              ? modeTexts.subtitleLogin
              : modeTexts.subtitleSignup}
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
                    ? `⏳ ${forgotTexts.forgotPassword}`
                    : forgotTexts.forgotPassword}
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
                ? `⏳ ${t("loading")}`
                : mode === "login"
                  ? t("login")
                  : modeTexts.signup}
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
                ? modeTexts.switchToSignup
                : modeTexts.switchToLogin}
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