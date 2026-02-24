"use client";

import { useEffect, useMemo, useState } from "react";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

type ShareRow = {
  id: string;
  token: string;
  created_at: string;
};

function generateTokenHex(bytes = 16) {
  try {
    const arr = new Uint8Array(bytes);
    crypto.getRandomValues(arr);
    return Array.from(arr)
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("");
  } catch {
    return `${Math.random().toString(16).slice(2)}${Date.now().toString(16)}`;
  }
}

function safeOrigin() {
  try {
    return window.location.origin; // ✅ correct domain (prod/stage/local)
  } catch {
    return "";
  }
}

function buildShareUrl(token: string) {
  const t = encodeURIComponent((token ?? "").toString().trim());
  const base = safeOrigin();
  // ✅ absolute link (best), fallback to relative
  return base ? `${base}/share/${t}` : `/share/${t}`;
}

const cardStyle: React.CSSProperties = {
  background: "white",
  border: "1px solid #e5e7eb",
  borderRadius: 14,
  padding: 16,
};

const btnBase: React.CSSProperties = {
  padding: "10px 12px",
  borderRadius: 12,
  border: "1px solid #e5e7eb",
  background: "white",
  cursor: "pointer",
  fontWeight: 800,
  fontSize: 13,
};

export default function ShareLinksCard(props: {
  reportId: string;
  ownerId: string | null;
  enabled: boolean; // only FINAL => true
}) {
  const { reportId, ownerId, enabled } = props;

  const [loading, setLoading] = useState(false);
  const [shares, setShares] = useState<ShareRow[]>([]);
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  async function loadShares() {
    setLoading(true);
    setErr(null);

    const { data, error } = await supabase
      .from("report_shares")
      .select("id,token,created_at")
      .eq("report_id", reportId)
      .order("created_at", { ascending: false });

    if (error) {
      setErr(error.message);
      setShares([]);
      setLoading(false);
      return;
    }

    setShares((data as ShareRow[]) ?? []);
    setLoading(false);
  }

  useEffect(() => {
    if (!reportId) return;
    loadShares();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reportId]);

  async function copy(text: string) {
    try {
      await navigator.clipboard.writeText(text);
      setMsg("✅ Copied");
      setErr(null);
    } catch {
      setErr("Copy failed");
    }
  }

  async function createLink() {
    setMsg(null);
    setErr(null);

    if (!enabled) {
      setErr("Sharing is available only for FINAL reports.");
      return;
    }
    if (!ownerId) {
      setErr("Missing user session (ownerId).");
      return;
    }

    setLoading(true);

    for (let attempt = 1; attempt <= 5; attempt++) {
      const token = generateTokenHex(16);

      const { error } = await supabase.from("report_shares").insert({
        owner_id: ownerId,
        report_id: reportId,
        token,
      });

      if (!error) {
        await loadShares();
        setMsg("✅ Share link created");
        setLoading(false);
        return;
      }

      const msg = (error as any)?.message?.toString?.() ?? "";
      const code = (error as any)?.code?.toString?.() ?? "";
      if (code === "23505" || msg.toLowerCase().includes("duplicate")) continue;

      setErr(error.message);
      setLoading(false);
      return;
    }

    setErr("Could not create unique token. Try again.");
    setLoading(false);
  }

  async function revoke(shareId: string) {
    setMsg(null);
    setErr(null);
    setLoading(true);

    const { error } = await supabase.from("report_shares").delete().eq("id", shareId);

    if (error) {
      setErr(error.message);
      setLoading(false);
      return;
    }

    await loadShares();
    setMsg("✅ Link revoked");
    setLoading(false);
  }

  const total = shares.length;

  const topLink = useMemo(() => {
    if (shares.length === 0) return null;
    return buildShareUrl(shares[0].token);
  }, [shares]);

  return (
    <div style={cardStyle}>
      <div style={{ display: "flex", justifyContent: "space-between", gap: 10 }}>
        <div style={{ fontWeight: 900, fontSize: 14 }}>Share Links</div>
        <button onClick={loadShares} disabled={loading} style={{ ...btnBase, padding: "8px 10px" }}>
          Refresh
        </button>
      </div>

      <div style={{ marginTop: 8, fontSize: 12, color: "#6b7280" }}>
        Total links created: <strong>{total}</strong>
      </div>

      {!enabled && (
        <div style={{ marginTop: 10, fontSize: 12, color: "#6b7280" }}>
          Available only when the report is <strong>FINAL</strong>.
        </div>
      )}

      <div style={{ marginTop: 12, display: "flex", gap: 10 }}>
        <button
          onClick={createLink}
          disabled={loading || !enabled}
          style={{
            ...btnBase,
            flex: 1,
            opacity: loading || !enabled ? 0.6 : 1,
            cursor: loading || !enabled ? "not-allowed" : "pointer",
          }}
        >
          {loading ? "Working…" : "Create Link"}
        </button>

        <button
          onClick={() => topLink && copy(topLink)}
          disabled={!topLink}
          style={{
            ...btnBase,
            opacity: !topLink ? 0.6 : 1,
            cursor: !topLink ? "not-allowed" : "pointer",
          }}
        >
          Copy Latest
        </button>
      </div>

      {msg && <div style={{ marginTop: 10, fontSize: 13 }}>{msg}</div>}
      {err && <div style={{ marginTop: 10, fontSize: 13, color: "#b91c1c" }}>❌ {err}</div>}

      <div style={{ marginTop: 12, display: "grid", gap: 10 }}>
        {shares.length === 0 ? (
          <div style={{ fontSize: 13, color: "#6b7280" }}>No share links yet.</div>
        ) : (
          shares.map((s) => {
            const url = buildShareUrl(s.token);

            return (
              <div
                key={s.id}
                style={{
                  border: "1px solid #eef2f7",
                  borderRadius: 14,
                  padding: 12,
                  background: "#fafafa",
                }}
              >
                <div style={{ fontSize: 12, color: "#6b7280" }}>
                  Created: {new Date(s.created_at).toLocaleString()}
                </div>

                <div
                  style={{
                    marginTop: 8,
                    fontSize: 12,
                    background: "white",
                    border: "1px solid #e5e7eb",
                    borderRadius: 12,
                    padding: "10px 12px",
                    wordBreak: "break-all",
                  }}
                >
                  {url}
                </div>

                <div style={{ display: "flex", gap: 10, marginTop: 10 }}>
                  <button onClick={() => copy(url)} style={{ ...btnBase, flex: 1 }}>
                    Copy
                  </button>

                  <button
                    onClick={() => window.open(url, "_blank", "noopener,noreferrer")}
                    style={{ ...btnBase }}
                  >
                    Open
                  </button>

                  <button
                    onClick={() => revoke(s.id)}
                    disabled={loading}
                    style={{
                      ...btnBase,
                      border: "1px solid #111",
                      background: "#111",
                      color: "white",
                      cursor: loading ? "not-allowed" : "pointer",
                      opacity: loading ? 0.6 : 1,
                    }}
                  >
                    REVOKE
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}

