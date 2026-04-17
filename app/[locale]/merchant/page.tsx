"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import { QRCodeCanvas } from "qrcode.react";
import { useTranslations } from "next-intl";

type MerchantStore = {
  storeId: string;
  name: string;
};

export default function MerchantPage() {
  const params = useParams<{ locale: string }>();
  const locale = String(params?.locale ?? "en");
  const t = useTranslations("merchant");

  const [store, setStore] = useState<MerchantStore | null>(null);
  const [storeLoading, setStoreLoading] = useState(true);
  const [storeError, setStoreError] = useState("");

  const [name, setName] = useState("");
  const [creatingStore, setCreatingStore] = useState(false);

  const [token, setToken] = useState("");
  const [tokenLoading, setTokenLoading] = useState(false);
  const [tokenError, setTokenError] = useState("");

  const [logoutLoading, setLogoutLoading] = useState(false);

  async function loadStore() {
    try {
      setStoreError("");
      const res = await fetch("/api/merchant/store", { cache: "no-store" });
      const data = await res.json();

      if (!res.ok) {
        setStoreError(data?.error || t("errors.loadStore"));
        setStore(null);
        return;
      }

      setStore(data.store || null);
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

      const data = await res.json();

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

      const data = await res.json();

      if (!res.ok) {
        setTokenError(data?.error || t("errors.token"));
        return;
      }

      setToken(data.token);
    } catch (e: any) {
      setTokenError(e?.message || t("errors.network"));
    } finally {
      setTokenLoading(false);
    }
  }

  async function logout() {
    try {
      setLogoutLoading(true);

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

  // 🔥 LOADING
  if (storeLoading) {
    return (
      <main style={{ textAlign: "center", padding: 40 }}>
        <div style={{ fontSize: 30 }}>⏳</div>
        <p>{t("loading")}</p>
      </main>
    );
  }

  // 🔥 CREATE STORE
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
      </main>
    );
  }

  // 🔥 MAIN VIEW
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

        {tokenError && <div style={{ color: "red" }}>{tokenError}</div>}

        <div style={{ margin: 20 }}>
          {claimUrl && <QRCodeCanvas value={claimUrl} size={260} />}
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
    </main>
  );
}