"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { QRCodeCanvas } from "qrcode.react";
import { useTranslations } from "next-intl";
import { auth } from "@/lib/firebaseClient";
import {
  EmailAuthProvider,
  reauthenticateWithCredential,
  signOut,
} from "firebase/auth";

type MerchantStore = {
  storeId?: string;
  name?: string;
  cardTemplate?: {
    title?: string;
  };
};

function getDeleteTexts(locale: string) {
  if (locale === "fr") {
    return {
      sectionTitle: "Zone dangereuse",
      sectionDescription:
        "Supprime définitivement ton compte merchant et le commerce lié.",
      passwordPlaceholder: "Confirme ton mot de passe",
      button: "Supprimer mon compte",
      loading: "Suppression...",
      confirmFirst: "Entre ton mot de passe pour confirmer la suppression.",
      notAuthenticated: "Compte merchant non connecté.",
      deleteApiFailed: "Impossible de supprimer les données du commerce.",
      deleteAuthFailed: "Impossible de supprimer le compte merchant.",
      successRedirect: "Compte supprimé. Redirection...",
    };
  }

  if (locale === "es") {
    return {
      sectionTitle: "Zona peligrosa",
      sectionDescription:
        "Elimina definitivamente tu cuenta merchant y el comercio vinculado.",
      passwordPlaceholder: "Confirma tu contraseña",
      button: "Eliminar mi cuenta",
      loading: "Eliminando...",
      confirmFirst: "Introduce tu contraseña para confirmar la eliminación.",
      notAuthenticated: "Cuenta merchant no conectada.",
      deleteApiFailed: "No se pudieron eliminar los datos del comercio.",
      deleteAuthFailed: "No se pudo eliminar la cuenta merchant.",
      successRedirect: "Cuenta eliminada. Redirigiendo...",
    };
  }

  return {
    sectionTitle: "Danger zone",
    sectionDescription:
      "Permanently delete your merchant account and the linked store.",
    passwordPlaceholder: "Confirm your password",
    button: "Delete my account",
    loading: "Deleting...",
    confirmFirst: "Enter your password to confirm deletion.",
    notAuthenticated: "Merchant account is not signed in.",
    deleteApiFailed: "Could not delete store data.",
    deleteAuthFailed: "Could not delete merchant account.",
    successRedirect: "Account deleted. Redirecting...",
  };
}

function getDisplayStoreName(
  store: MerchantStore | null,
  fallback: string
): string {
  const name = String(store?.name ?? "").trim();
  if (name) return name;

  const templateTitle = String(store?.cardTemplate?.title ?? "").trim();
  if (templateTitle) return templateTitle;

  const storeId = String(store?.storeId ?? "").trim();
  if (storeId) return storeId;

  return fallback;
}

export default function MerchantPage() {
  const router = useRouter();
  const params = useParams<{ locale: string }>();
  const locale = String(params?.locale ?? "en");
  const t = useTranslations("merchant");
  const deleteTexts = useMemo(() => getDeleteTexts(locale), [locale]);

  const [store, setStore] = useState<MerchantStore | null>(null);
  const [storeLoading, setStoreLoading] = useState(true);
  const [storeError, setStoreError] = useState("");

  const [name, setName] = useState("");
  const [creatingStore, setCreatingStore] = useState(false);

  const [token, setToken] = useState("");
  const [tokenLoading, setTokenLoading] = useState(false);
  const [tokenError, setTokenError] = useState("");

  const [logoutLoading, setLogoutLoading] = useState(false);

  const [deletePassword, setDeletePassword] = useState("");
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [deleteError, setDeleteError] = useState("");
  const [deleteInfo, setDeleteInfo] = useState("");

  async function redirectToMerchantLogin() {
    router.replace(
      `/${locale}/merchant/login?next=${encodeURIComponent(`/${locale}/merchant`)}`
    );
  }

  async function loadStore() {
    try {
      setStoreError("");

      const res = await fetch("/api/merchant/store", { cache: "no-store" });
      const data = await res.json().catch(() => null);

      if (res.status === 401 || res.status === 403) {
        setStore(null);
        await signOut(auth).catch(() => null);
        await redirectToMerchantLogin();
        return;
      }

      if (!res.ok) {
        setStoreError(data?.error || t("errors.loadStore"));
        setStore(null);
        return;
      }

      setStore(data?.store || null);
    } catch (e: any) {
      setStoreError(e?.message || t("errors.network"));
      setStore(null);
    } finally {
      setStoreLoading(false);
    }
  }

  async function createStore() {
    try {
      setStoreError("");

      const cleanName = name.trim();

      if (!cleanName) {
        setStoreError(t("errors.nameRequired"));
        return;
      }

      setCreatingStore(true);

      const res = await fetch("/api/stores/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: cleanName }),
      });

      const data = await res.json().catch(() => null);

      if (res.status === 401 || res.status === 403) {
        await signOut(auth).catch(() => null);
        await redirectToMerchantLogin();
        return;
      }

      if (!res.ok) {
        setStoreError(data?.error || t("errors.createStore"));
        return;
      }

      setName("");
      await loadStore();
    } catch (e: any) {
      setStoreError(e?.message || t("errors.network"));
    } finally {
      setCreatingStore(false);
    }
  }

  async function generateToken(storeId: string) {
    try {
      setTokenError("");
      setTokenLoading(true);

      const res = await fetch("/api/claims/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ storeId }),
      });

      const data = await res.json().catch(() => null);

      if (res.status === 401 || res.status === 403) {
        await signOut(auth).catch(() => null);
        await redirectToMerchantLogin();
        return;
      }

      if (!res.ok) {
        setTokenError(data?.error || t("errors.token"));
        return;
      }

      setToken(data?.token || "");
    } catch (e: any) {
      setTokenError(e?.message || t("errors.network"));
    } finally {
      setTokenLoading(false);
    }
  }

  async function logout() {
    try {
      setLogoutLoading(true);
      setStoreError("");

      await signOut(auth).catch(() => null);

      const res = await fetch("/api/auth/sessionLogout", {
        method: "POST",
      });

      if (!res.ok) {
        setStoreError(t("errors.logout"));
        return;
      }

      window.location.href = `/${locale}/merchant/login`;
    } catch (e: any) {
      setStoreError(e?.message || t("errors.network"));
    } finally {
      setLogoutLoading(false);
    }
  }

  async function deleteMerchantAccount() {
    try {
      setDeleteError("");
      setDeleteInfo("");

      const cleanPassword = deletePassword.trim();

      if (!cleanPassword) {
        setDeleteError(deleteTexts.confirmFirst);
        return;
      }

      const user = auth.currentUser;
      const email = user?.email || "";

      if (!user || !email) {
        setDeleteError(deleteTexts.notAuthenticated);
        return;
      }

      setDeleteLoading(true);

      const credential = EmailAuthProvider.credential(email, cleanPassword);
      await reauthenticateWithCredential(user, credential);

      const deleteRes = await fetch("/api/merchant/delete", {
        method: "POST",
      });

      const deleteData = await deleteRes.json().catch(() => null);

      if (deleteRes.status === 401 || deleteRes.status === 403) {
        await signOut(auth).catch(() => null);
        await redirectToMerchantLogin();
        return;
      }

      if (!deleteRes.ok) {
        throw new Error(deleteData?.error || deleteTexts.deleteApiFailed);
      }

      await user.delete();

      await fetch("/api/auth/sessionLogout", {
        method: "POST",
      }).catch(() => null);

      setDeleteInfo(deleteTexts.successRedirect);
      setDeletePassword("");

      router.replace(`/${locale}/merchant/login`);
      router.refresh();
    } catch (e: any) {
      const message = e?.message || deleteTexts.deleteAuthFailed;
      setDeleteError(message);
    } finally {
      setDeleteLoading(false);
    }
  }

  useEffect(() => {
    loadStore();
  }, []);

  useEffect(() => {
    const storeId = String(store?.storeId ?? "").trim();

    if (storeId) {
      generateToken(storeId);
    } else {
      setToken("");
    }
  }, [store?.storeId]);

  const claimUrl = useMemo(() => {
    if (!token) return "";
    if (typeof window === "undefined") return "";
    return `${window.location.origin}/${locale}/add?token=${encodeURIComponent(token)}`;
  }, [locale, token]);

  const displayStoreName = useMemo(
    () => getDisplayStoreName(store, t("placeholder")),
    [store, t]
  );

  const deletePanel = (
    <section
      style={{
        width: "100%",
        maxWidth: 420,
        marginTop: 18,
        background: "#fff",
        borderRadius: 20,
        padding: 20,
        boxShadow: "0 10px 30px rgba(0,0,0,0.08)",
        border: "1px solid #fecaca",
      }}
    >
      <div
        style={{
          fontWeight: 800,
          fontSize: 16,
          color: "#991b1b",
          marginBottom: 8,
        }}
      >
        {deleteTexts.sectionTitle}
      </div>

      <p
        style={{
          margin: 0,
          marginBottom: 14,
          fontSize: 14,
          lineHeight: 1.45,
          color: "#7f1d1d",
        }}
      >
        {deleteTexts.sectionDescription}
      </p>

      <input
        type="password"
        value={deletePassword}
        onChange={(e) => setDeletePassword(e.target.value)}
        placeholder={deleteTexts.passwordPlaceholder}
        autoComplete="current-password"
        style={{
          width: "100%",
          padding: 12,
          marginBottom: 12,
          borderRadius: 12,
          border: "1px solid #fca5a5",
          fontSize: 14,
          color: "#111827",
          background: "#ffffff",
          boxSizing: "border-box",
        }}
      />

      <button
        type="button"
        onClick={deleteMerchantAccount}
        disabled={deleteLoading}
        style={{
          width: "100%",
          padding: 12,
          borderRadius: 12,
          border: "none",
          background: "#b91c1c",
          color: "#ffffff",
          fontWeight: 800,
          cursor: deleteLoading ? "not-allowed" : "pointer",
        }}
      >
        {deleteLoading ? `⏳ ${deleteTexts.loading}` : deleteTexts.button}
      </button>

      {deleteInfo ? (
        <div
          style={{
            marginTop: 12,
            background: "#dcfce7",
            color: "#166534",
            padding: 10,
            borderRadius: 10,
            fontSize: 13,
          }}
        >
          ✅ {deleteInfo}
        </div>
      ) : null}

      {deleteError ? (
        <div
          style={{
            marginTop: 12,
            background: "#fee2e2",
            color: "#991b1b",
            padding: 10,
            borderRadius: 10,
            fontSize: 13,
          }}
        >
          ❌ {deleteError}
        </div>
      ) : null}
    </section>
  );

  if (storeLoading) {
    return (
      <main style={{ textAlign: "center", padding: 40 }}>
        <div style={{ fontSize: 30 }}>⏳</div>
        <p>{t("loading")}</p>
      </main>
    );
  }

  if (!store) {
    return (
      <main
        style={{
          minHeight: "100vh",
          background:
            "linear-gradient(180deg, #fafaf9 0%, #f4f4f5 45%, #f8fafc 100%)",
          padding: 20,
          fontFamily:
            'Inter, Arial, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
        }}
      >
        <div
          style={{
            maxWidth: 920,
            margin: "0 auto",
            display: "grid",
            gap: 18,
          }}
        >
          <section
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: 12,
              flexWrap: "wrap",
            }}
          >
            <div>
              <div
                style={{
                  fontSize: 13,
                  fontWeight: 700,
                  letterSpacing: 0.6,
                  textTransform: "uppercase",
                  color: "#71717a",
                  marginBottom: 6,
                }}
              >
                FIDELITY WALLET
              </div>

              <h1
                style={{
                  fontSize: 32,
                  lineHeight: 1.05,
                  margin: 0,
                  color: "#18181b",
                }}
              >
                {t("createTitle")}
              </h1>

              <p
                style={{
                  margin: "8px 0 0",
                  color: "#52525b",
                  fontSize: 15,
                }}
              >
                {t("createDescription")}
              </p>
            </div>

            <button
              onClick={logout}
              disabled={logoutLoading}
              style={{
                height: 44,
                borderRadius: 16,
                border: "1px solid #a1a1aa",
                background: "#ffffff",
                color: "#18181b",
                padding: "0 16px",
                fontSize: 14,
                fontWeight: 700,
                cursor: logoutLoading ? "default" : "pointer",
              }}
            >
              {logoutLoading ? t("logoutLoading") : t("logout")}
            </button>
          </section>

          {storeError ? (
            <section
              style={{
                border: "1px solid #fecaca",
                background: "#fff1f2",
                color: "#881337",
                padding: 14,
                borderRadius: 18,
              }}
            >
              <div style={{ fontWeight: 800, marginBottom: 6 }}>
                {t("errors.createStore")}
              </div>
              <div style={{ whiteSpace: "pre-wrap" }}>{storeError}</div>
            </section>
          ) : null}

          <section
            style={{
              display: "grid",
              gridTemplateColumns: "minmax(0, 1.2fr) minmax(320px, 0.8fr)",
              gap: 18,
            }}
          >
            <div
              style={{
                background: "#ffffff",
                borderRadius: 28,
                padding: 28,
                boxShadow: "0 18px 40px rgba(24,24,27,0.08)",
                border: "1px solid #e5e7eb",
              }}
            >
              <div
                style={{
                  fontSize: 13,
                  fontWeight: 700,
                  letterSpacing: 0.8,
                  textTransform: "uppercase",
                  color: "#71717a",
                  marginBottom: 10,
                }}
              >
                Merchant
              </div>

              <h2
                style={{
                  margin: 0,
                  marginBottom: 10,
                  fontSize: 28,
                  lineHeight: 1.1,
                  color: "#111827",
                }}
              >
                {t("createTitle")}
              </h2>

              <p
                style={{
                  margin: 0,
                  marginBottom: 24,
                  color: "#6b7280",
                  fontSize: 15,
                  lineHeight: 1.55,
                }}
              >
                {t("createDescription")}
              </p>

              <div style={{ display: "grid", gap: 14 }}>
                <input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder={t("placeholder")}
                  type="text"
                  name="storeName"
                  autoComplete="organization"
                  enterKeyHint="done"
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
                  onClick={createStore}
                  disabled={creatingStore}
                  style={{
                    width: "100%",
                    padding: "18px 20px",
                    borderRadius: 18,
                    border: "none",
                    background: "#111827",
                    color: "#ffffff",
                    fontSize: 16,
                    fontWeight: 800,
                    cursor: creatingStore ? "default" : "pointer",
                    boxShadow: "0 10px 24px rgba(17,24,39,0.18)",
                  }}
                >
                  {creatingStore ? `⏳ ${t("creating")}` : t("createButton")}
                </button>
              </div>
            </div>

            <div
              style={{
                background:
                  "linear-gradient(135deg, #3f3f46 0%, #18181b 100%)",
                borderRadius: 28,
                padding: 24,
                color: "#ffffff",
                boxShadow: "0 18px 40px rgba(24,24,27,0.18)",
                overflow: "hidden",
                position: "relative",
              }}
            >
              <div
                style={{
                  position: "absolute",
                  inset: 0,
                  background:
                    "radial-gradient(circle at top left, rgba(255,255,255,0.14), transparent 36%)",
                  pointerEvents: "none",
                }}
              />

              <div style={{ position: "relative" }}>
                <div
                  style={{
                    fontSize: 12,
                    opacity: 0.82,
                    letterSpacing: 1.2,
                    textTransform: "uppercase",
                    marginBottom: 12,
                  }}
                >
                  Merchant setup
                </div>

                <div
                  style={{
                    fontSize: 28,
                    lineHeight: 1.05,
                    fontWeight: 800,
                    marginBottom: 10,
                  }}
                >
                  {name.trim() || t("placeholder")}
                </div>

                <div
                  style={{
                    fontSize: 14,
                    opacity: 0.88,
                    lineHeight: 1.5,
                    marginBottom: 18,
                  }}
                >
                  {t("qrDescription")}
                </div>

                <div
                  style={{
                    minHeight: 180,
                    borderRadius: 22,
                    background: "rgba(255,255,255,0.08)",
                    border: "1px solid rgba(255,255,255,0.12)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    padding: 20,
                    textAlign: "center",
                    fontSize: 14,
                    lineHeight: 1.5,
                    color: "rgba(255,255,255,0.86)",
                  }}
                >
                  {t("createDescription")}
                </div>
              </div>
            </div>
          </section>

          {deletePanel}
        </div>
      </main>
    );
  }

  return (
    <main
      style={{
        minHeight: "100vh",
        background: "#f9fafb",
        padding: 20,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        fontFamily:
          'Inter, Arial, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
      }}
    >
      <div
        style={{
          width: "100%",
          maxWidth: 420,
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: 20,
          gap: 12,
        }}
      >
        <strong
          style={{
            color: "#111827",
            fontSize: 16,
            lineHeight: 1.2,
            wordBreak: "break-word",
          }}
        >
          {displayStoreName}
        </strong>

        <button
          onClick={logout}
          disabled={logoutLoading}
          style={{
            padding: "8px 12px",
            borderRadius: 10,
            border: "1px solid #d1d5db",
            background: "#ffffff",
            color: "#111827",
            fontWeight: 600,
            cursor: logoutLoading ? "not-allowed" : "pointer",
            flexShrink: 0,
          }}
        >
          {logoutLoading ? `⏳ ${t("logoutLoading")}` : t("logout")}
        </button>
      </div>

      <div
        style={{
          width: "100%",
          maxWidth: 420,
          background: "#fff",
          borderRadius: 20,
          padding: 24,
          boxShadow: "0 10px 30px rgba(0,0,0,0.08)",
          textAlign: "center",
        }}
      >
        <p style={{ color: "#6b7280", marginTop: 0 }}>{t("qrDescription")}</p>

        {tokenError ? <div style={{ color: "red" }}>{tokenError}</div> : null}

        <div style={{ margin: 20 }}>
          {claimUrl ? <QRCodeCanvas value={claimUrl} size={260} /> : null}
        </div>

        <button
          onClick={() => {
            const storeId = String(store.storeId ?? "").trim();
            if (storeId) generateToken(storeId);
          }}
          disabled={tokenLoading}
          style={{
            width: "100%",
            padding: 12,
            borderRadius: 12,
            border: "1px solid #d1d5db",
            background: "#f3f4f6",
            color: "#111827",
            fontWeight: 600,
            cursor: tokenLoading ? "not-allowed" : "pointer",
            marginTop: 8,
          }}
        >
          {tokenLoading ? `⏳ ${t("regenerating")}` : t("regenerate")}
        </button>

        <div
          style={{
            marginTop: 16,
            display: "grid",
            gap: 10,
          }}
        >
          <a
            href={`/${locale}/scan`}
            style={{
              display: "block",
              padding: 12,
              borderRadius: 12,
              background: "#111827",
              color: "#ffffff",
              textDecoration: "none",
              fontWeight: 700,
            }}
          >
            {t("openScan")}
          </a>

          <a
            href={`/${locale}/merchant/template?storeId=${encodeURIComponent(
              String(store.storeId ?? "")
            )}`}
            style={{
              display: "block",
              padding: 12,
              borderRadius: 12,
              border: "1px solid #d1d5db",
              background: "#ffffff",
              color: "#111827",
              textDecoration: "none",
              fontWeight: 600,
            }}
          >
            {t("customize")}
          </a>
        </div>
      </div>

      {deletePanel}
    </main>
  );
}