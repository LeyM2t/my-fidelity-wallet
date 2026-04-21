"use client";

import { useEffect, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import QrScanner from "qr-scanner";
import { useTranslations } from "next-intl";

export default function WalletScanPage() {
  const router = useRouter();
  const params = useParams<{ locale: string }>();
  const locale = String(params?.locale ?? "en");
  const t = useTranslations("scan");

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const scannerRef = useRef<QrScanner | null>(null);

  const [checkingAuth, setCheckingAuth] = useState(true);
  const [authorized, setAuthorized] = useState(false);
  const [err, setErr] = useState("");
  const [status, setStatus] = useState("");
  const [hasCamera, setHasCamera] = useState<boolean | null>(null);
  const [startingCamera, setStartingCamera] = useState(false);
  const [detected, setDetected] = useState(false);

  function goToLogin() {
    router.replace(
      `/${locale}/client/login?next=${encodeURIComponent(`/${locale}/wallet/scan`)}`
    );
  }

  function handleRaw(rawInput: string) {
    const raw = (rawInput || "").trim();
    if (!raw) return;

    setDetected(true);
    setStatus(t("status.detected"));
    setErr("");

    if (
      raw.startsWith("http://") ||
      raw.startsWith("https://") ||
      raw.startsWith("/")
    ) {
      window.location.href = raw;
      return;
    }

    try {
      const obj = JSON.parse(raw);

      if (obj?.token) {
        setStatus(t("checkingSession"));
        window.location.href = `/${locale}/add?token=${encodeURIComponent(obj.token)}`;
        return;
      }
    } catch {}

    setDetected(false);
    setErr(t("errors.invalidQR"));
    setStatus(t("status.invalid"));
  }

  useEffect(() => {
    setStatus(t("checkingSession"));
  }, [t]);

  useEffect(() => {
    let cancelled = false;

    async function checkAuth() {
      try {
        setCheckingAuth(true);
        setErr("");
        setStatus(t("checkingSession"));

        const res = await fetch("/api/auth/client/me", {
          method: "GET",
          cache: "no-store",
        });

        if (cancelled) return;

        if (res.status === 401 || res.status === 403) {
          goToLogin();
          return;
        }

        if (!res.ok) {
          throw new Error(t("errors.sessionCheckFailed"));
        }

        const data = await res.json();

        if (!data?.authenticated) {
          goToLogin();
          return;
        }

        setAuthorized(true);
        setStatus(t("status.pending"));
      } catch (e: any) {
        if (cancelled) return;
        setErr(e?.message || t("errors.sessionError"));
        setStatus(t("status.invalid"));
      } finally {
        if (!cancelled) {
          setCheckingAuth(false);
        }
      }
    }

    checkAuth();

    return () => {
      cancelled = true;
    };
  }, [locale, router, t]);

  useEffect(() => {
    if (!authorized) return;

    let cancelled = false;

    async function startScanner() {
      try {
        setErr("");
        setDetected(false);
        setStartingCamera(true);
        setStatus(t("startingCamera"));

        const video = videoRef.current;
        if (!video) return;

        const camAvailable = await QrScanner.hasCamera();
        if (cancelled) return;

        setHasCamera(camAvailable);

        if (!camAvailable) {
          setErr(t("errors.cameraUnavailable"));
          setStatus(t("errors.cameraUnavailable"));
          return;
        }

        if (scannerRef.current) {
          try {
            await scannerRef.current.stop();
          } catch {}
          scannerRef.current.destroy();
          scannerRef.current = null;
        }

        const scanner = new QrScanner(
          video,
          async (result) => {
            if (cancelled || detected) return;

            const raw = typeof result === "string" ? result : result?.data;
            if (!raw) return;

            try {
              await scanner.stop();
            } catch {}

            handleRaw(raw);
          },
          {
            preferredCamera: "environment",
            highlightScanRegion: true,
            highlightCodeOutline: true,
            returnDetailedScanResult: true,
          }
        );

        scannerRef.current = scanner;
        await scanner.start();

        if (cancelled) return;

        setStatus(t("status.pending"));
      } catch (e: any) {
        if (cancelled) return;
        setErr(e?.message || t("errors.cameraError"));
        setStatus(t("status.cameraError"));
      } finally {
        if (!cancelled) {
          setStartingCamera(false);
        }
      }
    }

    startScanner();

    return () => {
      cancelled = true;
      try {
        scannerRef.current?.stop();
      } catch {}
      scannerRef.current?.destroy();
      scannerRef.current = null;
    };
  }, [authorized, detected, t]);

  if (checkingAuth) {
    return (
      <main
        style={{
          minHeight: "100dvh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: 24,
          background:
            "linear-gradient(180deg, #fafaf9 0%, #f4f4f5 45%, #f8fafc 100%)",
          fontFamily:
            'Inter, Arial, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
        }}
      >
        {t("checkingSession")}
      </main>
    );
  }

  return (
    <main
      style={{
        minHeight: "100dvh",
        background:
          "linear-gradient(180deg, #fafaf9 0%, #f4f4f5 45%, #f8fafc 100%)",
        padding: 18,
        fontFamily:
          'Inter, Arial, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
      }}
    >
      <div
        style={{
          maxWidth: 760,
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
          }}
        >
          <button
            onClick={() => router.push(`/${locale}/wallet`)}
            style={{
              height: 44,
              borderRadius: 16,
              border: "none",
              background: "#18181b",
              color: "#fff",
              padding: "0 16px",
              fontWeight: 700,
              cursor: "pointer",
            }}
          >
            ← {t("back")}
          </button>
        </section>

        <section
          style={{
            borderRadius: 28,
            padding: 22,
            background: "linear-gradient(135deg, #3f3f46 0%, #18181b 100%)",
            color: "#fff",
          }}
        >
          <h1 style={{ margin: 0, fontSize: 28, fontWeight: 800 }}>
            {t("title")}
          </h1>
          <p style={{ marginTop: 8, opacity: 0.9 }}>{t("description")}</p>
        </section>

        <section
          style={{
            borderRadius: 20,
            padding: 14,
            background: "#fff",
            border: "1px solid #e4e4e7",
            textAlign: "center",
            fontWeight: 700,
            color: "#374151",
            wordBreak: "break-word",
          }}
        >
          {status}
        </section>

        {err ? (
          <section
            style={{
              border: "1px solid #fecaca",
              background: "#fff1f2",
              color: "#881337",
              padding: 14,
              borderRadius: 18,
            }}
          >
            <strong>{t("errorTitle")}</strong>
            <div>{err}</div>
          </section>
        ) : null}

        <section
          style={{
            borderRadius: 28,
            background: "#fff",
            padding: 18,
            border: "1px solid #e4e4e7",
          }}
        >
          <div
            style={{
              borderRadius: 24,
              overflow: "hidden",
              background: "#18181b",
              aspectRatio: "3 / 4",
              position: "relative",
            }}
          >
            <video
              ref={videoRef}
              style={{
                width: "100%",
                height: "100%",
                objectFit: "cover",
                display: hasCamera === false ? "none" : "block",
              }}
              playsInline
              muted
            />

            {hasCamera !== false ? (
              <div
                style={{
                  position: "absolute",
                  inset: "15%",
                  border: "2px solid white",
                  borderRadius: 20,
                  boxShadow: "0 0 0 9999px rgba(0,0,0,0.3)",
                }}
              />
            ) : null}

            {startingCamera ? (
              <div
                style={{
                  position: "absolute",
                  inset: 0,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  color: "#fff",
                  fontWeight: 700,
                  background: "rgba(0,0,0,0.4)",
                }}
              >
                {t("startingCamera")}
              </div>
            ) : null}

            {detected ? (
              <div
                style={{
                  position: "absolute",
                  inset: 0,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  color: "#fff",
                  fontWeight: 800,
                  textAlign: "center",
                  padding: 20,
                  background: "rgba(0,0,0,0.4)",
                }}
              >
                {t("status.detected")}
              </div>
            ) : null}

            {hasCamera === false ? (
              <div
                style={{
                  position: "absolute",
                  inset: 0,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  color: "#fff",
                  fontWeight: 700,
                  textAlign: "center",
                  padding: 20,
                }}
              >
                {t("errors.cameraUnavailable")}
              </div>
            ) : null}
          </div>
        </section>
      </div>
    </main>
  );
}