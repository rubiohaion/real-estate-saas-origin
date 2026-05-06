"use client";

import { useEffect, useState } from "react";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export default function NewReportPage() {
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      const { data } = await supabase.auth.getSession();
      if (!data.session) {
        window.location.href = "/login";
        return;
      }
      setLoading(false);
    })();
  }, []);

  async function createReport() {
    setCreating(true);
    setError(null);

    const { data: sessionData } = await supabase.auth.getSession();
    const user = sessionData.session?.user;

    if (!user) {
      window.location.href = "/login";
      return;
    }

    const { data, error } = await supabase
      .from("reports")
      .insert({
        user_id: user.id,
        status: "draft",
      })
      .select("id")
      .single();

    if (error || !data) {
      setError(error?.message || "Failed to create report");
      setCreating(false);
      return;
    }

    window.location.href = `/reports/${data.id}`;
  }

  if (loading) return <div style={{ padding: 40 }}>Loading…</div>;

  return (
    <div style={{ padding: 40, maxWidth: 700 }}>
      <h1 style={{ fontSize: 34, fontWeight: 800, marginBottom: 10 }}>
        Create New Report
      </h1>

      <p style={{ color: "#555", fontSize: 16 }}>
        A new <strong>draft</strong> report will be created and opened for editing.
      </p>

      <div style={{ marginTop: 24, display: "flex", gap: 12 }}>
        <button
          onClick={createReport}
          disabled={creating}
          style={{
            padding: "12px 18px",
            borderRadius: 10,
            border: "1px solid #111",
            background: "#111",
            color: "white",
            fontWeight: 800,
            cursor: creating ? "not-allowed" : "pointer",
            opacity: creating ? 0.7 : 1,
            minWidth: 180,
          }}
        >
          {creating ? "Creating…" : "Create Report"}
        </button>

        <a
          href="/"
          style={{
            padding: "12px 18px",
            borderRadius: 10,
            border: "1px solid #ccc",
            background: "white",
            color: "#111",
            textDecoration: "none",
            fontWeight: 700,
            display: "inline-block",
          }}
        >
          Back to Dashboard
        </a>
      </div>

      {error && (
        <div
          style={{
            marginTop: 16,
            padding: 12,
            borderRadius: 10,
            background: "#fee2e2",
            color: "#991b1b",
            border: "1px solid #fecaca",
          }}
        >
          ❌ {error}
        </div>
      )}
    </div>
  );
}

