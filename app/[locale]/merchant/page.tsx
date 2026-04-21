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
  storeId: string;
  name: string;
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

      if (!name.trim()) {
        setStoreError(t("errors.nameRequired"));
        return;
      }

      setCreatingStore(true);

      const res = await fetch("/api/stores/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name.trim() }),
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
    if (store?.storeId) {
      generateToken(store.storeId);
    } else {
      setToken("");
    }
  }, [store?.storeId]);

  const claimUrl = useMemo(() => {
    if (!token) return "";
    if (typeof window === "undefined") return "";
    return `${window.location.origin}/${locale}/add?token=${encodeURIComponent(token)}`;
  }, [locale, token]);

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
      <main style={{ maxWidth: 420, margin: "60px auto", padding: 20 }}>
        <button onClick={logout} disabled={logoutLoading}>
          {logoutLoading ? t("logoutLoading") : t("logout")}
        </button>

        <h1 style={{ marginTop: 20 }}>{t("createTitle")}</h1>
        <p>{t("createDescription")}</p>

        {storeError && (
          <div style={{ color: "red", marginBottom: 10 }}>{storeError}</div>
        )}

        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder={t("placeholder")}
          style={{ width: "100%", padding: 10, marginBottom: 10 }}
        />

        <button onClick={createStore} disabled={creatingStore}>
          {creatingStore ? t("creating") : t("createButton")}
        </button>

        {deletePanel}
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
        }}
      >
        <strong style={{ color: "#111827", fontSize: 16 }}>
          {store.name}
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
        <h1>{store.name}</h1>

        <p style={{ color: "#6b7280" }}>{t("qrDescription")}</p>

        {tokenError ? <div style={{ color: "red" }}>{tokenError}</div> : null}

        <div style={{ margin: 20 }}>
          {claimUrl ? <QRCodeCanvas value={claimUrl} size={260} /> : null}
        </div>

        <button
          onClick={() => generateToken(store.storeId)}
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
            href={`/${locale}/merchant/template?storeId=${store.storeId}`}
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