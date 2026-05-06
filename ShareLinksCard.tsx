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

function norm(s: any) {
  return (s ?? "").toString().trim().toLowerCase();
}

function isFinalStatus(status: any) {
  const s = norm(status);
  if (!s) return false;
  if (s === "final") return true;
  if (s.includes("final")) return true;
  if (s === "finished") return true;
  if (s === "completed") return true;
  if (s === "complete") return true;
  if (s === "done") return true;
  return false;
}

export default function DashboardPage() {
  const [loading, setLoading] = useState(true);
  const [email, setEmail] = useState<string | null>(null);
  const [reports, setReports] = useState<ReportRow[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [tab, setTab] = useState<Tab>("all");

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

  function formatAddress(r: ReportRow) {
    return [r.address, r.city, r.state, r.zip].filter(Boolean).join(", ") || "—";
  }

  const filtered = useMemo(() => {
    if (tab === "all") return reports;
    if (tab === "draft") return reports.filter((r) => !isFinalStatus(r.status));
    return reports.filter((r) => isFinalStatus(r.status));
  }, [reports, tab]);

  if (loading) return <div style={{ padding: 40 }}>Loading…</div>;

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
      <div style={{ display: "flex", justifyContent: "space-between", gap: 12 }}>
        <div>
          <h1 style={{ fontSize: 26, fontWeight: 800, margin: 0 }}>My Reports</h1>
          <div style={{ marginTop: 6, fontSize: 13, color: "#666" }}>
            Logged in as <strong>{email}</strong>
          </div>
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

          <button
            onClick={handleLogout}
            style={{
              border: "none",
              background: "transparent",
              padding: 0,
              margin: 0,
              fontSize: 14,
              color: "#111",
              textDecoration: "underline",
              cursor: "pointer",
              marginTop: 2,
              fontWeight: 800,
            }}
          >
            Logout
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div style={{ marginTop: 26, display: "flex", gap: 18 }}>
        {[
          { key: "all", label: "All" },
          { key: "draft", label: "Draft" },
          { key: "final", label: "Final" },
        ].map((t) => (
          <span
            key={t.key}
            onClick={() => setTab(t.key as Tab)}
            style={{
              cursor: "pointer",
              fontSize: 14,
              fontWeight: tab === t.key ? 900 : 500,
              borderBottom:
                tab === t.key ? "2px solid #111" : "2px solid transparent",
              paddingBottom: 6,
            }}
          >
            {t.label}
          </span>
        ))}
      </div>

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
                    <div style={{ fontSize: 14, fontWeight: 800 }}>
                      {formatAddress(r)}
                    </div>
                    <div style={{ marginTop: 4, fontSize: 12, color: "#777" }}>
                      {new Date(r.created_at).toLocaleDateString()}
                      {" • "}
                      {final ? "FINAL" : "DRAFT"}
                    </div>
                  </div>

                  <div
                    style={{
                      display: "flex",
                      gap: 14,
                      alignItems: "center",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {/* ✅ Draft: Edit */}
                    {!final && (
                      <a
                        href={`/reports/${r.id}`}
                        style={{
                          fontSize: 13,
                          color: "#111",
                          textDecoration: "underline",
                          fontWeight: 900,
                        }}
                      >
                        Edit
                      </a>
                    )}

                    {/* ✅ Final: Manage (locked page) */}
                    {final && (
                      <a
                        href={`/reports/${r.id}`}
                        style={{
                          fontSize: 13,
                          color: "#111",
                          textDecoration: "underline",
                          fontWeight: 900,
                        }}
                      >
                        Manage
                      </a>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

