"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { QRCodeCanvas } from "qrcode.react";
import { useTranslations } from "next-intl";
import { auth } from "@/lib/firebaseClient";
import LanguageSwitcher from "@/components/LanguageSwitcher";
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

function ProfileIcon() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      width="18"
      height="18"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.9"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M20 21a8 8 0 0 0-16 0" />
      <circle cx="12" cy="8" r="4" />
    </svg>
  );
}

export default function MerchantPage() {
  const router = useRouter();
  const params = useParams<{ locale: string }>();
  const locale = String(params?.locale ?? "en");
  const t = useTranslations("merchant");
  const tProfile = useTranslations("profileMenu");
  const tDanger = useTranslations("merchantDanger");
  const tWalletEditor = useTranslations("walletEditor");

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
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);

  const [profileMenuOpen, setProfileMenuOpen] = useState(false);
  const profileMenuRef = useRef<HTMLDivElement | null>(null);

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
      setProfileMenuOpen(false);

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
        setDeleteError(tDanger("confirmFirst"));
        return;
      }

      const user = auth.currentUser;
      const email = user?.email || "";

      if (!user || !email) {
        setDeleteError(tDanger("notAuthenticated"));
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
        throw new Error(deleteData?.error || tDanger("deleteApiFailed"));
      }

      await user.delete();

      await fetch("/api/auth/sessionLogout", {
        method: "POST",
      }).catch(() => null);

      setDeleteInfo(tDanger("successRedirect"));
      setDeletePassword("");

      router.replace(`/${locale}/merchant/login`);
      router.refresh();
    } catch (e: any) {
      const message = e?.message || tDanger("deleteAuthFailed");
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

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (!profileMenuRef.current) return;
      if (!profileMenuRef.current.contains(event.target as Node)) {
        setProfileMenuOpen(false);
      }
    }

    function handleEscape(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setProfileMenuOpen(false);
        setDeleteModalOpen(false);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleEscape);

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleEscape);
    };
  }, []);

  const claimUrl = useMemo(() => {
    if (!token) return "";
    if (typeof window === "undefined") return "";
    return `${window.location.origin}/${locale}/add?token=${encodeURIComponent(token)}`;
  }, [locale, token]);

  const displayStoreName = useMemo(
    () => getDisplayStoreName(store, t("placeholder")),
    [store, t]
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
      <>
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
                alignItems: "flex-start",
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
                  {t("brand")}
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

              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 10,
                }}
              >
                <LanguageSwitcher />

                <div
                  ref={profileMenuRef}
                  style={{
                    position: "relative",
                  }}
                >
                  <button
                    type="button"
                    aria-label={tProfile("aria")}
                    title={tProfile("aria")}
                    onClick={() => setProfileMenuOpen((prev) => !prev)}
                    style={{
                      width: 44,
                      height: 44,
                      borderRadius: 16,
                      border: "1px solid #d4d4d8",
                      background: "#ffffff",
                      color: "#18181b",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      cursor: "pointer",
                    }}
                  >
                    <ProfileIcon />
                  </button>

                  {profileMenuOpen ? (
                    <div
                      style={{
                        position: "absolute",
                        top: 52,
                        right: 0,
                        minWidth: 220,
                        borderRadius: 18,
                        border: "1px solid #e4e4e7",
                        background: "#ffffff",
                        boxShadow: "0 24px 60px rgba(0,0,0,0.16)",
                        padding: 8,
                        zIndex: 2000,
                      }}
                    >
                      <div
                        style={{
                          padding: "8px 10px 6px",
                          fontSize: 12,
                          fontWeight: 800,
                          textTransform: "uppercase",
                          letterSpacing: 0.7,
                          color: "#71717a",
                        }}
                      >
                        {tProfile("title")}
                      </div>

                      <button
                        type="button"
                        onClick={logout}
                        disabled={logoutLoading}
                        style={{
                          width: "100%",
                          height: 42,
                          borderRadius: 12,
                          border: "none",
                          background: "#ffffff",
                          color: "#18181b",
                          textAlign: "left",
                          padding: "0 12px",
                          cursor: logoutLoading ? "default" : "pointer",
                          fontSize: 14,
                          fontWeight: 700,
                        }}
                      >
                        {logoutLoading ? t("logoutLoading") : tProfile("logout")}
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          setProfileMenuOpen(false);
                          setDeleteModalOpen(true);
                          setDeleteError("");
                          setDeleteInfo("");
                        }}
                        style={{
                          width: "100%",
                          height: 42,
                          borderRadius: 12,
                          border: "none",
                          background: "#ffffff",
                          color: "#b91c1c",
                          textAlign: "left",
                          padding: "0 12px",
                          cursor: "pointer",
                          fontSize: 14,
                          fontWeight: 800,
                        }}
                      >
                        {tProfile("deleteAccount")}
                      </button>
                    </div>
                  ) : null}
                </div>
              </div>
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
                  {t("sectionMerchant")}
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
                    {t("setupTitle")}
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
          </div>
        </main>

        {deleteModalOpen ? (
          <div
            onClick={() => {
              if (deleteLoading) return;
              setDeleteModalOpen(false);
              setDeleteError("");
              setDeleteInfo("");
              setDeletePassword("");
            }}
            style={{
              position: "fixed",
              inset: 0,
              zIndex: 2200,
              background: "rgba(24,24,27,0.56)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              padding: 16,
            }}
          >
            <div
              onClick={(e) => e.stopPropagation()}
              style={{
                width: "100%",
                maxWidth: 460,
                borderRadius: 28,
                background: "#ffffff",
                boxShadow: "0 30px 80px rgba(0,0,0,0.25)",
                overflow: "hidden",
              }}
            >
              <div
                style={{
                  padding: 22,
                  borderBottom: "1px solid #e4e4e7",
                }}
              >
                <div
                  style={{
                    fontSize: 22,
                    lineHeight: 1.1,
                    fontWeight: 900,
                    color: "#991b1b",
                    marginBottom: 8,
                  }}
                >
                  {tDanger("sectionTitle")}
                </div>

                <div
                  style={{
                    fontSize: 14,
                    lineHeight: 1.45,
                    color: "#52525b",
                  }}
                >
                  {tDanger("sectionDescription")}
                </div>
              </div>

              <div
                style={{
                  padding: 22,
                  display: "grid",
                  gap: 12,
                }}
              >
                <input
                  type="password"
                  value={deletePassword}
                  onChange={(e) => setDeletePassword(e.target.value)}
                  placeholder={tDanger("passwordPlaceholder")}
                  autoComplete="current-password"
                  style={{
                    width: "100%",
                    padding: 12,
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
                  {deleteLoading ? `⏳ ${tDanger("loading")}` : tDanger("button")}
                </button>

                {deleteInfo ? (
                  <div
                    style={{
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

                <button
                  type="button"
                  onClick={() => {
                    if (deleteLoading) return;
                    setDeleteModalOpen(false);
                    setDeleteError("");
                    setDeleteInfo("");
                    setDeletePassword("");
                  }}
                  style={{
                    width: "100%",
                    padding: 12,
                    borderRadius: 12,
                    border: "1px solid #d4d4d8",
                    background: "#ffffff",
                    color: "#18181b",
                    fontWeight: 700,
                    cursor: "pointer",
                  }}
                >
                  {tWalletEditor("modalCancel")}
                </button>
              </div>
            </div>
          </div>
        ) : null}
      </>
    );
  }

  return (
    <>
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
            alignItems: "flex-start",
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

          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 10,
              flexShrink: 0,
            }}
          >
            <LanguageSwitcher />

            <div
              ref={profileMenuRef}
              style={{
                position: "relative",
              }}
            >
              <button
                type="button"
                aria-label={tProfile("aria")}
                title={tProfile("aria")}
                onClick={() => setProfileMenuOpen((prev) => !prev)}
                style={{
                  width: 44,
                  height: 44,
                  borderRadius: 16,
                  border: "1px solid #d4d4d8",
                  background: "#ffffff",
                  color: "#18181b",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  cursor: "pointer",
                }}
              >
                <ProfileIcon />
              </button>

              {profileMenuOpen ? (
                <div
                  style={{
                    position: "absolute",
                    top: 52,
                    right: 0,
                    minWidth: 220,
                    borderRadius: 18,
                    border: "1px solid #e4e4e7",
                    background: "#ffffff",
                    boxShadow: "0 24px 60px rgba(0,0,0,0.16)",
                    padding: 8,
                    zIndex: 2000,
                  }}
                >
                  <div
                    style={{
                      padding: "8px 10px 6px",
                      fontSize: 12,
                      fontWeight: 800,
                      textTransform: "uppercase",
                      letterSpacing: 0.7,
                      color: "#71717a",
                    }}
                  >
                    {tProfile("title")}
                  </div>

                  <button
                    type="button"
                    onClick={logout}
                    disabled={logoutLoading}
                    style={{
                      width: "100%",
                      height: 42,
                      borderRadius: 12,
                      border: "none",
                      background: "#ffffff",
                      color: "#18181b",
                      textAlign: "left",
                      padding: "0 12px",
                      cursor: logoutLoading ? "default" : "pointer",
                      fontSize: 14,
                      fontWeight: 700,
                    }}
                  >
                    {logoutLoading ? t("logoutLoading") : tProfile("logout")}
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setProfileMenuOpen(false);
                      setDeleteModalOpen(true);
                      setDeleteError("");
                      setDeleteInfo("");
                    }}
                    style={{
                      width: "100%",
                      height: 42,
                      borderRadius: 12,
                      border: "none",
                      background: "#ffffff",
                      color: "#b91c1c",
                      textAlign: "left",
                      padding: "0 12px",
                      cursor: "pointer",
                      fontSize: 14,
                      fontWeight: 800,
                    }}
                  >
                    {tProfile("deleteAccount")}
                  </button>
                </div>
              ) : null}
            </div>
          </div>
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
      </main>

      {deleteModalOpen ? (
        <div
          onClick={() => {
            if (deleteLoading) return;
            setDeleteModalOpen(false);
            setDeleteError("");
            setDeleteInfo("");
            setDeletePassword("");
          }}
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 2200,
            background: "rgba(24,24,27,0.56)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: 16,
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              width: "100%",
              maxWidth: 460,
              borderRadius: 28,
              background: "#ffffff",
              boxShadow: "0 30px 80px rgba(0,0,0,0.25)",
              overflow: "hidden",
            }}
          >
            <div
              style={{
                padding: 22,
                borderBottom: "1px solid #e4e4e7",
              }}
            >
              <div
                style={{
                  fontSize: 22,
                  lineHeight: 1.1,
                  fontWeight: 900,
                  color: "#991b1b",
                  marginBottom: 8,
                }}
              >
                {tDanger("sectionTitle")}
              </div>

              <div
                style={{
                  fontSize: 14,
                  lineHeight: 1.45,
                  color: "#52525b",
                }}
              >
                {tDanger("sectionDescription")}
              </div>
            </div>

            <div
              style={{
                padding: 22,
                display: "grid",
                gap: 12,
              }}
            >
              <input
                type="password"
                value={deletePassword}
                onChange={(e) => setDeletePassword(e.target.value)}
                placeholder={tDanger("passwordPlaceholder")}
                autoComplete="current-password"
                style={{
                  width: "100%",
                  padding: 12,
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
                {deleteLoading ? `⏳ ${tDanger("loading")}` : tDanger("button")}
              </button>

              {deleteInfo ? (
                <div
                  style={{
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

              <button
                type="button"
                onClick={() => {
                  if (deleteLoading) return;
                  setDeleteModalOpen(false);
                  setDeleteError("");
                  setDeleteInfo("");
                  setDeletePassword("");
                }}
                style={{
                  width: "100%",
                  padding: 12,
                  borderRadius: 12,
                  border: "1px solid #d4d4d8",
                  background: "#ffffff",
                  color: "#18181b",
                  fontWeight: 700,
                  cursor: "pointer",
                }}
              >
                {tWalletEditor("modalCancel")}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}