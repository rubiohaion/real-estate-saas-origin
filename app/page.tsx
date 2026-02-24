"use client";

import { useEffect, useMemo, useState } from "react";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

type ReportRow = {
  id: string;
  address: string | null;
  city: string | null;
  state: string | null;
  zip: string | null;
  status: string | null;
  created_at: string;
};

type Tab = "all" | "draft" | "final";

function norm(v: any) {
  return (v ?? "").toString().trim().toLowerCase();
}

function isFinalStatus(status: any) {
  const s = norm(status);
  if (!s) return false;
  return (
    s === "final" ||
    s.includes("final") ||
    s === "finished" ||
    s === "completed" ||
    s === "complete" ||
    s === "done"
  );
}

function formatAddress(r: ReportRow) {
  return [r.address, r.city, r.state, r.zip].filter(Boolean).join(", ") || "—";
}

export default function HomeDashboardPage() {
  const [loading, setLoading] = useState(true);
  const [email, setEmail] = useState<string | null>(null);
  const [reports, setReports] = useState<ReportRow[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [tab, setTab] = useState<Tab>("all");

  // Share UI
  const [shareUrl, setShareUrl] = useState<string | null>(null);
  const [sharing, setSharing] = useState(false);
  const [shareErr, setShareErr] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      setLoading(true);
      setError(null);

      const { data: sessionData, error: sessionErr } =
        await supabase.auth.getSession();

      if (sessionErr) {
        setError(sessionErr.message);
        setLoading(false);
        return;
      }

      if (!sessionData.session) {
        window.location.href = "/login";
        return;
      }

      setEmail(sessionData.session.user.email ?? null);

      const { data, error } = await supabase
        .from("reports")
        .select("id,address,city,state,zip,status,created_at")
        .order("created_at", { ascending: false });

      if (error) {
        setError(error.message);
        setReports([]);
        setLoading(false);
        return;
      }

      setReports((data as ReportRow[]) ?? []);
      setLoading(false);
    })();
  }, []);

  async function handleLogout() {
    await supabase.auth.signOut();
    window.location.href = "/login";
  }

  const filtered = useMemo(() => {
    if (tab === "all") return reports;
    if (tab === "draft") return reports.filter((r) => !isFinalStatus(r.status));
    return reports.filter((r) => isFinalStatus(r.status));
  }, [reports, tab]);

  async function createShare(reportId: string) {
    if (sharing) return;
    setSharing(true);
    setShareErr(null);

    try {
      const token =
        typeof crypto !== "undefined" && "randomUUID" in crypto
          ? (crypto as any).randomUUID()
          : `${Date.now()}-${Math.random().toString(16).slice(2)}`;

      const { data: sessionData } = await supabase.auth.getSession();
      const ownerId = sessionData?.session?.user?.id ?? null;

      const { error } = await supabase.from("report_shares").insert({
        token,
        report_id: reportId,
        owner_id: ownerId,
      });

      if (error) {
        setShareErr(error.message);
        setSharing(false);
        return;
      }

      const url = `${window.location.origin}/share/${token}`;
      setShareUrl(url);

      try {
        await navigator.clipboard.writeText(url);
      } catch {
        // ignore clipboard failure
      }
    } catch {
      setShareErr("Share failed");
    } finally {
      setSharing(false);
    }
  }

  async function copyToClipboard() {
    if (!shareUrl) return;
    try {
      await navigator.clipboard.writeText(shareUrl);
    } catch {
      // ignore
    }
  }

  if (loading) return <div style={{ padding: 40 }}>Loading…</div>;

  const tabItem = (key: Tab, label: string) => (
    <span
      onClick={() => setTab(key)}
      style={{
        cursor: "pointer",
        fontSize: 14,
        fontWeight: tab === key ? 800 : 500,
        borderBottom: tab === key ? "2px solid #111" : "2px solid transparent",
        paddingBottom: 6,
      }}
    >
      {label}
    </span>
  );

  const btnBase: React.CSSProperties = {
    border: "1px solid #e5e7eb",
    background: "white",
    padding: "8px 12px",
    borderRadius: 999,
    fontSize: 12,
    fontWeight: 800,
    cursor: "pointer",
    lineHeight: 1,
  };

  const btnPrimary: React.CSSProperties = {
    ...btnBase,
    border: "1px solid #111",
    background: "#111",
    color: "white",
  };

  const topLink: React.CSSProperties = {
    fontSize: 13,
    fontWeight: 800,
    color: "#111",
    textDecoration: "underline",
    cursor: "pointer",
    background: "transparent",
    border: "none",
    padding: 0,
    margin: 0,
  };

  return (
    <div
      style={{
        padding: 40,
        maxWidth: 980,
        margin: "0 auto",
        background: "white",
        fontFamily: "Arial, Helvetica, sans-serif",
        color: "#111",
      }}
    >
      {/* Top system bar */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          paddingBottom: 12,
          borderBottom: "1px solid #eee",
          marginBottom: 18,
        }}
      >
        <div style={{ fontSize: 13, color: "#666" }}>
          Logged in as <strong>{email}</strong>
        </div>

        <div style={{ display: "flex", gap: 14, alignItems: "center" }}>
          <a href="/profile" style={topLink as any}>
            Profile
          </a>

          <button onClick={handleLogout} style={topLink}>
            Logout
          </button>
        </div>
      </div>

      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", gap: 12 }}>
        <div>
          <h1 style={{ fontSize: 26, fontWeight: 800, margin: 0 }}>My Reports</h1>
        </div>

        <div style={{ display: "flex", gap: 14, alignItems: "flex-start" }}>
          <a
            href="/reports/new"
            style={{
              fontSize: 14,
              fontWeight: 800,
              color: "#111",
              textDecoration: "underline",
              marginTop: 2,
            }}
          >
            + New Report
          </a>
        </div>
      </div>

      {/* Tabs */}
      <div style={{ marginTop: 26, display: "flex", gap: 18 }}>
        {tabItem("all", "All")}
        {tabItem("draft", "Draft")}
        {tabItem("final", "Final")}
      </div>

      {/* Error */}
      {error && (
        <div style={{ marginTop: 18, fontSize: 14, color: "#b91c1c" }}>
          ❌ {error}
        </div>
      )}

      {/* List */}
      <div style={{ marginTop: 18 }}>
        {filtered.length === 0 ? (
          <div style={{ fontSize: 14, color: "#666" }}>No reports to display.</div>
        ) : (
          <div>
            {filtered.map((r) => {
              const final = isFinalStatus(r.status);

              return (
                <div
                  key={r.id}
                  style={{
                    display: "grid",
                    gridTemplateColumns: "1fr auto",
                    gap: 16,
                    padding: "14px 0",
                    borderBottom: "1px solid #eee",
                  }}
                >
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontSize: 14, fontWeight: 700 }}>
                      {formatAddress(r)}
                    </div>
                    <div style={{ marginTop: 4, fontSize: 12, color: "#777" }}>
                      {new Date(r.created_at).toLocaleDateString()}
                      {" • "}
                      {final ? "FINAL" : "DRAFT"}
                    </div>
                  </div>

                  {/* Actions */}
                  <div
                    style={{
                      display: "flex",
                      gap: 10,
                      alignItems: "center",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {!final && (
                      <a
                        href={`/reports/${r.id}`}
                        style={{
                          fontSize: 13,
                          color: "#111",
                          textDecoration: "underline",
                          fontWeight: 800,
                        }}
                      >
                        Edit
                      </a>
                    )}

                    {final && (
                      <>
                        <a
                          href={`/reports/${r.id}`}
                          style={{
                            fontSize: 13,
                            color: "#111",
                            textDecoration: "underline",
                            fontWeight: 800,
                          }}
                        >
                          Manage
                        </a>

                        <a
                          href={`/reports/${r.id}/view`}
                          style={{
                            fontSize: 13,
                            color: "#111",
                            textDecoration: "underline",
                            fontWeight: 800,
                          }}
                        >
                          View
                        </a>

                        <button
                          onClick={() => createShare(r.id)}
                          disabled={sharing}
                          style={{
                            ...btnPrimary,
                            opacity: sharing ? 0.75 : 1,
                            cursor: sharing ? "not-allowed" : "pointer",
                          }}
                        >
                          {sharing ? "Sharing…" : "Share"}
                        </button>
                      </>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Share modal */}
      {shareUrl && (
        <div
          onClick={() => {
            setShareUrl(null);
            setShareErr(null);
          }}
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.35)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: 16,
            zIndex: 50,
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              width: 520,
              maxWidth: "100%",
              background: "white",
              borderRadius: 16,
              padding: 18,
              border: "1px solid #e5e7eb",
              boxShadow: "0 18px 50px rgba(0,0,0,0.25)",
            }}
          >
            <div style={{ fontWeight: 900, fontSize: 14, marginBottom: 10 }}>
              Share link created
            </div>

            <div
              style={{
                fontSize: 12,
                padding: 12,
                background: "#f3f4f6",
                borderRadius: 12,
                border: "1px solid #e5e7eb",
                wordBreak: "break-all",
              }}
            >
              {shareUrl}
            </div>

            {shareErr && (
              <div style={{ marginTop: 10, fontSize: 12, color: "#b91c1c" }}>
                ❌ {shareErr}
              </div>
            )}

            <div
              style={{
                display: "flex",
                gap: 10,
                justifyContent: "flex-end",
                marginTop: 14,
                flexWrap: "wrap",
              }}
            >
              <button onClick={copyToClipboard} style={btnBase}>
                Copy
              </button>

              <a
                href={shareUrl}
                target="_blank"
                rel="noreferrer"
                style={{ ...btnBase, textDecoration: "none", color: "#111" }}
              >
                Open
              </a>

              <button
                onClick={() => {
                  setShareUrl(null);
                  setShareErr(null);
                }}
                style={btnBase}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

