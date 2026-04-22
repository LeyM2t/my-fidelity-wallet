"use client";

import { useEffect, useMemo, useState } from "react";
import { useTranslations } from "next-intl";

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{
    outcome: "accepted" | "dismissed";
    platform: string;
  }>;
};

function isIos() {
  if (typeof window === "undefined") return false;
  const ua = window.navigator.userAgent.toLowerCase();
  return /iphone|ipad|ipod/.test(ua);
}

function isInStandaloneMode() {
  if (typeof window === "undefined") return false;

  const mediaStandalone = window.matchMedia?.("(display-mode: standalone)")?.matches;
  const navStandalone =
    "standalone" in window.navigator &&
    Boolean((window.navigator as Navigator & { standalone?: boolean }).standalone);

  return Boolean(mediaStandalone || navStandalone);
}

export default function PwaInstallPrompt() {
  const t = useTranslations("pwaInstall");

  const [deferredPrompt, setDeferredPrompt] =
    useState<BeforeInstallPromptEvent | null>(null);
  const [installed, setInstalled] = useState(false);
  const [dismissed, setDismissed] = useState(false);
  const [iosStandalone, setIosStandalone] = useState(false);
  const [isIosDevice, setIsIosDevice] = useState(false);
  const [installing, setInstalling] = useState(false);

  useEffect(() => {
    setInstalled(isInStandaloneMode());
    setIosStandalone(isInStandaloneMode());
    setIsIosDevice(isIos());

    function handleBeforeInstallPrompt(e: Event) {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      setDismissed(false);
    }

    function handleAppInstalled() {
      setInstalled(true);
      setDeferredPrompt(null);
      setDismissed(true);
    }

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
    window.addEventListener("appinstalled", handleAppInstalled);

    return () => {
      window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
      window.removeEventListener("appinstalled", handleAppInstalled);
    };
  }, []);

  const showAndroidPrompt = useMemo(() => {
    return !installed && !dismissed && !!deferredPrompt;
  }, [installed, dismissed, deferredPrompt]);

  const showIosHelp = useMemo(() => {
    return !installed && !dismissed && isIosDevice && !iosStandalone;
  }, [installed, dismissed, isIosDevice, iosStandalone]);

  async function handleInstall() {
    if (!deferredPrompt) return;

    try {
      setInstalling(true);
      await deferredPrompt.prompt();
      const choice = await deferredPrompt.userChoice;

      if (choice.outcome === "accepted") {
        setInstalled(true);
      } else {
        setDismissed(true);
      }
    } catch {
      setDismissed(true);
    } finally {
      setDeferredPrompt(null);
      setInstalling(false);
    }
  }

  if (!showAndroidPrompt && !showIosHelp) {
    return null;
  }

  return (
    <div
      style={{
        position: "fixed",
        left: 16,
        right: 16,
        bottom: 16,
        zIndex: 3000,
        display: "flex",
        justifyContent: "center",
        pointerEvents: "none",
      }}
    >
      <div
        style={{
          width: "100%",
          maxWidth: 520,
          borderRadius: 20,
          background: "#111827",
          color: "#ffffff",
          boxShadow: "0 18px 40px rgba(0,0,0,0.28)",
          padding: 16,
          pointerEvents: "auto",
        }}
      >
        <div
          style={{
            fontSize: 16,
            fontWeight: 800,
            marginBottom: 6,
          }}
        >
          {t("title")}
        </div>

        <div
          style={{
            fontSize: 14,
            lineHeight: 1.45,
            color: "rgba(255,255,255,0.88)",
            marginBottom: 14,
          }}
        >
          {showAndroidPrompt ? t("description") : t("iosDescription")}
        </div>

        <div
          style={{
            display: "flex",
            gap: 10,
            flexWrap: "wrap",
          }}
        >
          {showAndroidPrompt ? (
            <button
              type="button"
              onClick={handleInstall}
              disabled={installing}
              style={{
                height: 44,
                borderRadius: 14,
                border: "none",
                background: "#ffffff",
                color: "#111827",
                padding: "0 16px",
                fontSize: 14,
                fontWeight: 800,
                cursor: installing ? "default" : "pointer",
              }}
            >
              {installing ? t("installing") : t("install")}
            </button>
          ) : null}

          <button
            type="button"
            onClick={() => setDismissed(true)}
            style={{
              height: 44,
              borderRadius: 14,
              border: "1px solid rgba(255,255,255,0.18)",
              background: "transparent",
              color: "#ffffff",
              padding: "0 16px",
              fontSize: 14,
              fontWeight: 700,
              cursor: "pointer",
            }}
          >
            {t("later")}
          </button>
        </div>
      </div>
    </div>
  );
}