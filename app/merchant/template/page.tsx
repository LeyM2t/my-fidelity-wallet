"use client";

import { useEffect, useMemo, useState } from "react";

const STORE_ID = "get-your-crepe";

type CardTemplate = {
  title: string;
  bgColor: string;
  textColor: string;
  font: "sans" | "serif" | "mono";
  logoUrl?: string;
  bgImageUrl?: string;
};

const DEFAULT: CardTemplate = {
  title: "Get Your Crêpe",
  bgColor: "#111827",
  textColor: "#ffffff",
  font: "sans",
  logoUrl: "",
  bgImageUrl: "",
};

function fontFamily(font: CardTemplate["font"]) {
  if (font === "serif") return "Georgia, serif";
  if (font === "mono") return "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace";
  return "system-ui, -apple-system, Segoe UI, Roboto, Arial, sans-serif";
}

export default function MerchantTemplatePage() {
  const [adminKey, setAdminKey] = useState("");
  const [tpl, setTpl] = useState<CardTemplate>(DEFAULT);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<string>("");
  const [err, setErr] = useState<string>("");

  const previewStyle = useMemo(() => {
    return {
      backgroundColor: tpl.bgColor,
      color: tpl.textColor,
      backgroundImage: tpl.bgImageUrl ? `url(${tpl.bgImageUrl})` : undefined,
      backgroundSize: "cover",
      backgroundPosition: "center",
      fontFamily: fontFamily(tpl.font),
    } as React.CSSProperties;
  }, [tpl]);

  async function load() {
    setLoading(true);
    setErr("");
    setMsg("");
    try {
      const res = await fetch(`/api/stores/${STORE_ID}`, { cache: "no-store" });
      const data = await res.json();

      if (!res.ok) {
        setErr(data?.error || "Erreur chargement template");
        setTpl(DEFAULT);
        return;
      }

      const merged = { ...DEFAULT, ...(data?.cardTemplate || {}) };
      setTpl(merged);
    } catch (e: any) {
      setErr(e?.message || "Erreur réseau");
      setTpl(DEFAULT);
    } finally {
      setLoading(false);
    }
  }

  async function save() {
    setSaving(true);
    setErr("");
    setMsg("");
    try {
      const res = await fetch(`/api/stores/${STORE_ID}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          "x-merchant-admin-key": adminKey,
        },
        body: JSON.stringify({ cardTemplate: tpl }),
      });

      const data = await res.json();
      if (!res.ok) {
        setErr(data?.error || "Erreur sauvegarde");
        return;
      }

      setMsg("Template sauvegardé ✅");
    } catch (e: any) {
      setErr(e?.message || "Erreur réseau");
    } finally {
      setSaving(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  return (
    <main style={{ padding: 24, maxWidth: 980, margin: "0 auto", fontFamily: "Arial" }}>
      <h1 style={{ fontSize: 28, marginBottom: 6 }}>Template carte — V2.5</h1>
      <div style={{ opacity: 0.8, marginBottom: 16 }}>
        StoreId: <b>{STORE_ID}</b>
      </div>

      <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginBottom: 16 }}>
        <a href="/merchant" style={{ alignSelf: "center" }}>
          ← Retour merchant (QR)
        </a>
        <button onClick={load} disabled={loading}>
          {loading ? "Chargement..." : "Reload"}
        </button>
        <button onClick={save} disabled={saving}>
          {saving ? "Saving..." : "Save"}
        </button>
      </div>

      {err ? <div style={{ marginBottom: 12, color: "crimson" }}>Erreur : {err}</div> : null}
      {msg ? <div style={{ marginBottom: 12, color: "green" }}>{msg}</div> : null}

      <div style={{ display: "grid", gridTemplateColumns: "1fr", gap: 16 }}>
        <div style={{ border: "1px solid #ddd", borderRadius: 14, padding: 16 }}>
          <div style={{ fontWeight: 800, marginBottom: 10 }}>Clé admin (temporaire)</div>
          <input
            value={adminKey}
            onChange={(e) => setAdminKey(e.target.value)}
            placeholder="Même valeur que MERCHANT_ADMIN_KEY"
            style={{ width: "100%", padding: 10, borderRadius: 10, border: "1px solid #ccc" }}
          />
          <div style={{ fontSize: 12, opacity: 0.7, marginTop: 8 }}>
            Sans la clé, le Save renverra 401.
          </div>
        </div>

        <div style={{ border: "1px solid #ddd", borderRadius: 14, padding: 16 }}>
          <div style={{ fontWeight: 800, marginBottom: 10 }}>Paramètres</div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <label style={{ display: "block" }}>
              <div style={{ fontSize: 13, fontWeight: 700 }}>Titre</div>
              <input
                value={tpl.title}
                onChange={(e) => setTpl({ ...tpl, title: e.target.value })}
                maxLength={40}
                style={{ width: "100%", padding: 10, borderRadius: 10, border: "1px solid #ccc" }}
              />
            </label>

            <label style={{ display: "block" }}>
              <div style={{ fontSize: 13, fontWeight: 700 }}>Police</div>
              <select
                value={tpl.font}
                onChange={(e) => setTpl({ ...tpl, font: e.target.value as any })}
                style={{ width: "100%", padding: 10, borderRadius: 10, border: "1px solid #ccc" }}
              >
                <option value="sans">Sans</option>
                <option value="serif">Serif</option>
                <option value="mono">Mono</option>
              </select>
            </label>

            <label style={{ display: "block" }}>
              <div style={{ fontSize: 13, fontWeight: 700 }}>Couleur fond</div>
              <input
                value={tpl.bgColor}
                onChange={(e) => setTpl({ ...tpl, bgColor: e.target.value })}
                placeholder="#111827"
                style={{ width: "100%", padding: 10, borderRadius: 10, border: "1px solid #ccc" }}
              />
            </label>

            <label style={{ display: "block" }}>
              <div style={{ fontSize: 13, fontWeight: 700 }}>Couleur texte</div>
              <input
                value={tpl.textColor}
                onChange={(e) => setTpl({ ...tpl, textColor: e.target.value })}
                placeholder="#ffffff"
                style={{ width: "100%", padding: 10, borderRadius: 10, border: "1px solid #ccc" }}
              />
            </label>

            <label style={{ display: "block", gridColumn: "1 / -1" }}>
              <div style={{ fontSize: 13, fontWeight: 700 }}>Logo URL (optionnel)</div>
              <input
                value={tpl.logoUrl || ""}
                onChange={(e) => setTpl({ ...tpl, logoUrl: e.target.value })}
                placeholder="https://..."
                style={{ width: "100%", padding: 10, borderRadius: 10, border: "1px solid #ccc" }}
              />
            </label>

            <label style={{ display: "block", gridColumn: "1 / -1" }}>
              <div style={{ fontSize: 13, fontWeight: 700 }}>Background image URL (optionnel)</div>
              <input
                value={tpl.bgImageUrl || ""}
                onChange={(e) => setTpl({ ...tpl, bgImageUrl: e.target.value })}
                placeholder="https://..."
                style={{ width: "100%", padding: 10, borderRadius: 10, border: "1px solid #ccc" }}
              />
            </label>
          </div>
        </div>

        <div style={{ border: "1px solid #ddd", borderRadius: 14, padding: 16 }}>
          <div style={{ fontWeight: 800, marginBottom: 10 }}>Preview</div>

          <div
            style={{
              ...previewStyle,
              height: 180,
              borderRadius: 18,
              border: "1px solid rgba(255,255,255,0.15)",
              overflow: "hidden",
              position: "relative",
              padding: 16,
              boxShadow: "0 8px 24px rgba(0,0,0,0.12)",
            }}
          >
            <div
              style={{
                position: "absolute",
                inset: 0,
                background: tpl.bgImageUrl ? "rgba(0,0,0,0.35)" : "transparent",
              }}
            />
            <div style={{ position: "relative", display: "flex", justifyContent: "space-between" }}>
              <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
                {tpl.logoUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={tpl.logoUrl}
                    alt="logo"
                    style={{ height: 44, width: 44, borderRadius: 10, objectFit: "cover", background: "rgba(255,255,255,0.12)" }}
                  />
                ) : (
                  <div style={{ height: 44, width: 44, borderRadius: 10, background: "rgba(255,255,255,0.12)" }} />
                )}

                <div style={{ fontSize: 22, fontWeight: 900 }}>{tpl.title}</div>
              </div>

              <div style={{ fontWeight: 900, opacity: 0.95 }}>8/10</div>
            </div>

            <div style={{ position: "relative", marginTop: 70, fontSize: 13, opacity: 0.9 }}>
              ownerId (temp) • fw_ownerId
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
