"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { signOut } from "firebase/auth";
import { auth } from "@/lib/firebaseClient";
import { useTranslations } from "next-intl";
import {
  EmailAuthProvider,
  reauthenticateWithCredential,
} from "firebase/auth";

type FirestoreCard = {
  id: string;
  storeId: string;
  stamps: number;
  goal: number;
  status: "active" | "reward";
  rewardAvailable?: boolean;
  rewardsUsed?: number;
  sourceToken?: string;
  createdAt?: any;
  updatedAt?: any;
};

type LocalWallet = {
  id: string;
  name: string;
  createdAt: number;
};

const LOCAL_WALLETS_KEY = "fw_custom_wallets_v1";
const DEFAULT_WALLET_ID = "__all_cards__";

function loadLocalWallets(): LocalWallet[] {
  if (typeof window === "undefined") return [];

  try {
    const raw = window.localStorage.getItem(LOCAL_WALLETS_KEY);
    if (!raw) return [];

    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];

    return parsed
      .map((item) => ({
        id: String(item?.id || ""),
        name: String(item?.name || "").trim(),
        createdAt: Number(item?.createdAt || Date.now()),
      }))
      .filter((item) => item.id && item.name);
  } catch {
    return [];
  }
}

function saveLocalWallets(wallets: LocalWallet[]) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(LOCAL_WALLETS_KEY, JSON.stringify(wallets));
}

function clearLocalWallets() {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(LOCAL_WALLETS_KEY);
}

function getDeleteTexts(locale: string) {
  if (locale === "fr") {
    return {
      sectionTitle: "Zone dangereuse",
      sectionDescription:
        "Supprime définitivement ton compte client, tes cartes et tes wallets locaux.",
      passwordPlaceholder: "Confirme ton mot de passe",
      button: "Supprimer mon compte",
      loading: "Suppression...",
      confirmFirst: "Entre ton mot de passe pour confirmer la suppression.",
      notAuthenticated: "Compte client non connecté.",
      deleteApiFailed: "Impossible de supprimer les données du compte.",
      deleteAuthFailed: "Impossible de supprimer le compte client.",
      successRedirect: "Compte supprimé. Redirection...",
    };
  }

  if (locale === "es") {
    return {
      sectionTitle: "Zona peligrosa",
      sectionDescription:
        "Elimina definitivamente tu cuenta de cliente, tus tarjetas y tus wallets locales.",
      passwordPlaceholder: "Confirma tu contraseña",
      button: "Eliminar mi cuenta",
      loading: "Eliminando...",
      confirmFirst: "Introduce tu contraseña para confirmar la eliminación.",
      notAuthenticated: "Cuenta de cliente no conectada.",
      deleteApiFailed: "No se pudieron eliminar los datos de la cuenta.",
      deleteAuthFailed: "No se pudo eliminar la cuenta de cliente.",
      successRedirect: "Cuenta eliminada. Redirigiendo...",
    };
  }

  return {
    sectionTitle: "Danger zone",
    sectionDescription:
      "Permanently delete your client account, your cards, and your local wallets.",
    passwordPlaceholder: "Confirm your password",
    button: "Delete my account",
    loading: "Deleting...",
    confirmFirst: "Enter your password to confirm deletion.",
    notAuthenticated: "Client account is not signed in.",
    deleteApiFailed: "Could not delete account data.",
    deleteAuthFailed: "Could not delete client account.",
    successRedirect: "Account deleted. Redirecting...",
  };
}

export default function WalletPage() {
  const router = useRouter();
  const params = useParams<{ locale: string }>();
  const locale = String(params?.locale ?? "en");
  const t = useTranslations("wallet");
  const deleteTexts = useMemo(() => getDeleteTexts(locale), [locale]);

  const [cards, setCards] = useState<FirestoreCard[]>([]);
  const [customWallets, setCustomWallets] = useState<LocalWallet[]>([]);
  const [loading, setLoading] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);
  const [creatingWallet, setCreatingWallet] = useState(false);
  const [error, setError] = useState("");

  const [deletePassword, setDeletePassword] = useState("");
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [deleteError, setDeleteError] = useState("");
  const [deleteInfo, setDeleteInfo] = useState("");

  function formatWalletSubtitle(cardCount: number) {
    if (cardCount <= 0) return t("cards.zero");
    if (cardCount === 1) return t("cards.one");
    return t("cards.many", { count: cardCount });
  }

  async function redirectToClientLogin() {
    router.replace(
      `/${locale}/client/login?next=${encodeURIComponent(`/${locale}/wallet`)}`
    );
  }

  const fetchCards = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const res = await fetch("/api/cards", {
        method: "GET",
        cache: "no-store",
      });

      if (res.status === 401 || res.status === 403) {
        setCards([]);
        await signOut(auth).catch(() => null);
        await redirectToClientLogin();
        return;
      }

      if (!res.ok) {
        const txt = await res.text().catch(() => "");
        throw new Error(`GET /api/cards failed (${res.status}) ${txt}`);
      }

      const data = await res.json();
      const list: any[] = Array.isArray(data)
        ? data
        : Array.isArray(data?.cards)
          ? data.cards
          : [];

      const normalized: FirestoreCard[] = list.map((c) => ({
        id: String(c.id ?? ""),
        storeId: String(c.storeId ?? ""),
        stamps: Number(c.stamps ?? 0),
        goal: Number(c.goal ?? 10),
        status: c.status === "reward" ? "reward" : "active",
        rewardAvailable: Boolean(c.rewardAvailable ?? c.status === "reward"),
        rewardsUsed:
          typeof c.rewardsUsed === "number" ? c.rewardsUsed : undefined,
        sourceToken:
          typeof c.sourceToken === "string" ? c.sourceToken : undefined,
        createdAt: c.createdAt,
        updatedAt: c.updatedAt,
      }));

      normalized.sort((a, b) => {
        const sa = a.status === "reward" ? 0 : 1;
        const sb = b.status === "reward" ? 0 : 1;
        if (sa !== sb) return sa - sb;

        return String(b.updatedAt ?? b.createdAt ?? "").localeCompare(
          String(a.updatedAt ?? a.createdAt ?? "")
        );
      });

      setCards(normalized);
    } catch (e: any) {
      setError(e?.message ?? "Unknown error");
      setCards([]);
    } finally {
      setLoading(false);
    }
  }, [locale, router]);

  useEffect(() => {
    setCustomWallets(loadLocalWallets());
  }, []);

  useEffect(() => {
    fetchCards();

    const onFocus = () => fetchCards();
    const onVisibility = () => {
      if (document.visibilityState === "visible") fetchCards();
    };

    window.addEventListener("focus", onFocus);
    document.addEventListener("visibilitychange", onVisibility);

    return () => {
      window.removeEventListener("focus", onFocus);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [fetchCards]);

  async function handleLogout() {
    setLoggingOut(true);
    setError("");

    try {
      await signOut(auth).catch(() => null);

      await fetch("/api/auth/client/sessionLogout", {
        method: "POST",
      }).catch(() => null);

      router.replace(`/${locale}/client/login`);
      router.refresh();
    } catch (e: any) {
      setError(e?.message ?? "Logout failed");
      setLoggingOut(false);
    }
  }

  async function handleDeleteAccount() {
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

      const deleteRes = await fetch("/api/client/delete", {
        method: "POST",
      });

      const deleteData = await deleteRes.json().catch(() => ({}));

      if (deleteRes.status === 401 || deleteRes.status === 403) {
        await signOut(auth).catch(() => null);
        await redirectToClientLogin();
        return;
      }

      if (!deleteRes.ok) {
        throw new Error(deleteData?.error || deleteTexts.deleteApiFailed);
      }

      await user.delete();

      await fetch("/api/auth/client/sessionLogout", {
        method: "POST",
      }).catch(() => null);

      clearLocalWallets();
      setCustomWallets([]);
      setDeletePassword("");
      setDeleteInfo(deleteTexts.successRedirect);

      router.replace(`/${locale}/client/login`);
      router.refresh();
    } catch (e: any) {
      const message = e?.message || deleteTexts.deleteAuthFailed;
      setDeleteError(message);
    } finally {
      setDeleteLoading(false);
    }
  }

  function handleCreateWallet() {
    setCreatingWallet(true);
    setError("");

    try {
      const name = window.prompt(t("prompt.createWallet"));
      const trimmed = (name || "").trim();

      if (!trimmed) return;

      const nextWallet: LocalWallet = {
        id: `local_${Date.now()}`,
        name: trimmed,
        createdAt: Date.now(),
      };

      const next = [...customWallets, nextWallet];
      setCustomWallets(next);
      saveLocalWallets(next);

      router.push(`/${locale}/wallet/${encodeURIComponent(nextWallet.id)}`);
    } catch (e: any) {
      setError(e?.message ?? "Could not create wallet");
    } finally {
      setCreatingWallet(false);
    }
  }

  function handleDeleteCustomWallet(walletId: string) {
    const confirmed = window.confirm(t("confirm.deleteWallet"));
    if (!confirmed) return;

    const next = customWallets.filter((w) => w.id !== walletId);
    setCustomWallets(next);
    saveLocalWallets(next);
  }

  const walletEntries = useMemo(() => {
    const base = [
      {
        id: DEFAULT_WALLET_ID,
        name: t("main"),
        subtitle: formatWalletSubtitle(cards.length),
        cardCount: cards.length,
        isDefault: true,
      },
    ];

    const customs = customWallets.map((wallet) => ({
      id: wallet.id,
      name: wallet.name,
      subtitle: t("custom"),
      cardCount: 0,
      isDefault: false,
    }));

    return [...base, ...customs];
  }, [cards.length, customWallets, t]);

  const deletePanel = (
    <section
      style={{
        border: "1px solid #fecaca",
        background: "#fff1f2",
        color: "#881337",
        padding: 18,
        borderRadius: 22,
      }}
    >
      <div style={{ fontWeight: 800, marginBottom: 8 }}>
        {deleteTexts.sectionTitle}
      </div>

      <div
        style={{
          fontSize: 14,
          lineHeight: 1.45,
          marginBottom: 12,
        }}
      >
        {deleteTexts.sectionDescription}
      </div>

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
          border: "1px solid #fda4af",
          fontSize: 14,
          color: "#111827",
          background: "#ffffff",
          boxSizing: "border-box",
        }}
      />

      <button
        type="button"
        onClick={handleDeleteAccount}
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
              {t("title")}
            </h1>

            <p
              style={{
                margin: "8px 0 0",
                color: "#52525b",
                fontSize: 15,
              }}
            >
              {t("subtitle")}
            </p>
          </div>

          <button
            onClick={handleLogout}
            disabled={loggingOut}
            style={{
              height: 44,
              borderRadius: 16,
              border: "1px solid #a1a1aa",
              background: "#ffffff",
              color: "#18181b",
              padding: "0 16px",
              fontSize: 14,
              fontWeight: 700,
              cursor: loggingOut ? "default" : "pointer",
            }}
          >
            {loggingOut ? t("logoutLoading") : t("logout")}
          </button>
        </section>

        <section
          style={{
            display: "flex",
            gap: 10,
            flexWrap: "wrap",
          }}
        >
          <button
            onClick={() => router.push(`/${locale}/wallet/scan`)}
            style={{
              height: 48,
              borderRadius: 18,
              border: "none",
              background: "#18181b",
              color: "#fff",
              padding: "0 18px",
              fontSize: 14,
              fontWeight: 700,
              cursor: "pointer",
              boxShadow: "0 10px 24px rgba(24,24,27,0.22)",
            }}
          >
            {t("scan")}
          </button>

          <button
            onClick={fetchCards}
            disabled={loading}
            style={{
              height: 48,
              borderRadius: 18,
              border: "1px solid #d4d4d8",
              background: "#f4f4f5",
              color: "#18181b",
              padding: "0 18px",
              fontSize: 14,
              fontWeight: 700,
              cursor: loading ? "default" : "pointer",
            }}
          >
            {loading ? t("refreshing") : t("refresh")}
          </button>

          <button
            onClick={handleCreateWallet}
            disabled={creatingWallet}
            style={{
              height: 48,
              borderRadius: 18,
              border: "1px dashed #a1a1aa",
              background: "#fff",
              color: "#18181b",
              padding: "0 18px",
              fontSize: 14,
              fontWeight: 700,
              cursor: creatingWallet ? "default" : "pointer",
            }}
          >
            {creatingWallet ? t("creating", { defaultValue: "..." }) : t("create")}
          </button>
        </section>

        {error ? (
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
              {t("error")}
            </div>
            <div style={{ whiteSpace: "pre-wrap", fontFamily: "monospace" }}>
              {error}
            </div>
          </section>
        ) : null}

        <section
          style={{
            display: "grid",
            gap: 14,
          }}
        >
          {walletEntries.map((wallet) => {
            const isCustom = !wallet.isDefault;

            return (
              <div
                key={wallet.id}
                onClick={() =>
                  router.push(`/${locale}/wallet/${encodeURIComponent(wallet.id)}`)
                }
                style={{
                  position: "relative",
                  borderRadius: 28,
                  padding: 22,
                  cursor: "pointer",
                  background: wallet.isDefault
                    ? "linear-gradient(135deg, #3f3f46 0%, #18181b 100%)"
                    : "linear-gradient(135deg, #a16207 0%, #854d0e 100%)",
                  boxShadow: wallet.isDefault
                    ? "0 18px 40px rgba(24,24,27,0.28)"
                    : "0 14px 32px rgba(133,77,14,0.22)",
                  color: "#fff",
                  overflow: "hidden",
                }}
              >
                <div
                  style={{
                    position: "absolute",
                    inset: 0,
                    background:
                      "radial-gradient(circle at top left, rgba(255,255,255,0.16), transparent 35%)",
                    pointerEvents: "none",
                  }}
                />

                <div
                  style={{
                    position: "relative",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    gap: 14,
                  }}
                >
                  <div>
                    <div
                      style={{
                        fontSize: 12,
                        opacity: 0.82,
                        letterSpacing: 1.2,
                        textTransform: "uppercase",
                        marginBottom: 10,
                      }}
                    >
                      {wallet.isDefault ? t("main") : t("custom")}
                    </div>

                    <div
                      style={{
                        fontSize: 28,
                        lineHeight: 1,
                        fontWeight: 800,
                        marginBottom: 8,
                        textShadow: "0 1px 0 rgba(255,255,255,0.1)",
                      }}
                    >
                      {wallet.name}
                    </div>

                    <div
                      style={{
                        fontSize: 14,
                        opacity: 0.88,
                      }}
                    >
                      {wallet.subtitle}
                    </div>
                  </div>

                  <div
                    style={{
                      minWidth: 76,
                      height: 76,
                      borderRadius: 20,
                      background: "rgba(255,255,255,0.14)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontSize: 18,
                      fontWeight: 800,
                      backdropFilter: "blur(4px)",
                    }}
                  >
                    {wallet.cardCount}
                  </div>
                </div>

                {isCustom ? (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDeleteCustomWallet(wallet.id);
                    }}
                    style={{
                      position: "absolute",
                      top: 14,
                      right: 14,
                      height: 34,
                      borderRadius: 12,
                      border: "1px solid rgba(255,255,255,0.24)",
                      background: "rgba(255,255,255,0.08)",
                      color: "#fff",
                      padding: "0 10px",
                      fontSize: 12,
                      fontWeight: 700,
                      cursor: "pointer",
                    }}
                  >
                    {t("buttons.delete")}
                  </button>
                ) : null}
              </div>
            );
          })}
        </section>

        {!loading && walletEntries.length === 0 ? (
          <section
            style={{
              borderRadius: 22,
              border: "1px dashed #d4d4d8",
              padding: 24,
              background: "#fafafa",
              textAlign: "center",
            }}
          >
            <div
              style={{
                fontSize: 18,
                fontWeight: 700,
                color: "#18181b",
                marginBottom: 8,
              }}
            >
              {t("noWallet")}
            </div>
            <div
              style={{
                color: "#71717a",
                fontSize: 14,
              }}
            >
              {t("noWalletDesc")}
            </div>
          </section>
        ) : null}

        {deletePanel}
      </div>
    </main>
  );
}