"use client";

import { useEffect, useState } from "react";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

type ProfileRow = {
  id: string;
  full_name: string | null;
  phone: string | null;
  company: string | null;
  license_number: string | null;
};

export default function ProfilePage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [email, setEmail] = useState<string | null>(null);

  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [company, setCompany] = useState("");
  const [licenseNumber, setLicenseNumber] = useState("");

  const [msg, setMsg] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function loadProfile() {
    setLoading(true);
    setMsg(null);
    setError(null);

    const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
    if (sessionError) {
      setError(sessionError.message);
      setLoading(false);
      return;
    }

    const session = sessionData.session;
    if (!session) {
      window.location.href = "/login";
      return;
    }

    setEmail(session.user.email ?? null);

    const userId = session.user.id;

    const { data, error } = await supabase
      .from("profiles")
      .select("id, full_name, phone, company, license_number")
      .eq("id", userId)
      .maybeSingle<ProfileRow>();

    if (error) {
      setError(error.message);
      setLoading(false);
      return;
    }

    setFullName(data?.full_name ?? "");
    setPhone(data?.phone ?? "");
    setCompany(data?.company ?? "");
    setLicenseNumber(data?.license_number ?? "");

    setLoading(false);
  }

  async function saveProfile(e?: React.FormEvent) {
    if (e) e.preventDefault();
    setSaving(true);
    setMsg(null);
    setError(null);

    const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
    if (sessionError) {
      setError(sessionError.message);
      setSaving(false);
      return;
    }

    const userId = sessionData.session?.user?.id;
    if (!userId) {
      window.location.href = "/login";
      return;
    }

    const { error: upsertError } = await supabase.from("profiles").upsert(
      {
        id: userId,
        full_name: fullName,
        phone: phone || null,
        company: company || null,
        license_number: licenseNumber || null,
      },
      { onConflict: "id" }
    );

    setSaving(false);

    if (upsertError) {
      setError(upsertError.message);
      return;
    }

    setMsg("Profile updated successfully.");
  }

  useEffect(() => {
    loadProfile();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const labelStyle: React.CSSProperties = {
    fontSize: 12,
    color: "#6b7280",
    fontWeight: 700,
    marginBottom: 6,
  };

  const inputStyle: React.CSSProperties = {
    padding: 10,
    borderRadius: 8,
    border: "1px solid #ccc",
    width: "100%",
  };

  const btnBase: React.CSSProperties = {
    border: "1px solid #e5e7eb",
    background: "white",
    padding: "10px 12px",
    borderRadius: 10,
    fontSize: 13,
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

  if (loading) {
    return (
      <div
        style={{
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#f3f4f6",
          fontWeight: 700,
        }}
      >
        Loading profile…
      </div>
    );
  }

  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "#f3f4f6",
        padding: 16,
      }}
    >
      <form
        onSubmit={saveProfile}
        style={{
          width: 560,
          maxWidth: "100%",
          background: "white",
          padding: 24,
          borderRadius: 12,
          border: "1px solid #e5e7eb",
          display: "grid",
          gap: 14,
        }}
      >
        {/* Header row */}
        <div style={{ display: "flex", justifyContent: "space-between", gap: 12 }}>
          <div>
            <h1 style={{ fontSize: 22, fontWeight: 800, margin: 0 }}>Profile</h1>
            <div style={{ marginTop: 6, fontSize: 13, color: "#666" }}>
              {email ? (
                <>
                  Logged in as <strong>{email}</strong>
                </>
              ) : (
                " "
              )}
            </div>
          </div>

          <div style={{ display: "flex", gap: 10, alignItems: "flex-start" }}>
            <button
              type="button"
              onClick={() => (window.location.href = "/")}
              style={btnBase}
            >
              Back
            </button>

            <button type="submit" disabled={saving} style={{ ...btnPrimary, opacity: saving ? 0.7 : 1 }}>
              {saving ? "Saving…" : "Save"}
            </button>
          </div>
        </div>

        {/* Fields */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: 12,
          }}
        >
          <div>
            <div style={labelStyle}>Full name</div>
            <input
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              required
              placeholder="Your full name"
              style={inputStyle}
            />
          </div>

          <div>
            <div style={labelStyle}>Phone</div>
            <input
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="Optional"
              style={inputStyle}
            />
          </div>

          <div>
            <div style={labelStyle}>Company</div>
            <input
              value={company}
              onChange={(e) => setCompany(e.target.value)}
              placeholder="Optional"
              style={inputStyle}
            />
          </div>

          <div>
            <div style={labelStyle}>License number</div>
            <input
              value={licenseNumber}
              onChange={(e) => setLicenseNumber(e.target.value)}
              placeholder="Optional"
              style={inputStyle}
            />
          </div>
        </div>

        {msg && (
          <div
            style={{
              marginTop: 2,
              padding: 10,
              borderRadius: 8,
              background: "#e5e7eb",
              color: "#111827",
              fontSize: 13,
              textAlign: "center",
            }}
          >
            {msg}
          </div>
        )}

        <div style={{ padding: 10, borderRadius: 8, background: "#f8fafc", color: "#374151", fontSize: 12, lineHeight: 1.5 }}>Professional profile upgrade ready: company, license number, signature name, title and logo fields are planned for the next database migration. Current editable fields are stored in your existing Supabase profile table.</div>

        {error && (
          <div
            style={{
              marginTop: 2,
              padding: 10,
              borderRadius: 8,
              background: "#fee2e2",
              color: "#991b1b",
              fontSize: 13,
              textAlign: "center",
            }}
          >
            {error}
          </div>
        )}

        {/* Mobile fallback */}
        <div style={{ fontSize: 11, color: "#6b7280", textAlign: "center" }}>
          Tip: On small screens the fields may wrap to one column.
        </div>
      </form>
    </div>
  );
}

