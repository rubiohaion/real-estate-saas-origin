"use client";

import { useEffect, useState } from "react";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!);

type ProfileRow = {
  id: string;
  full_name: string | null;
  phone: string | null;
  company: string | null;
  license_number: string | null;
  years_of_experience: string | null;
  specialization: string | null;
  address: string | null;
  city: string | null;
  state: string | null;
  zip: string | null;
  signature_name: string | null;
  title: string | null;
  license_state: string | null;
  logo_url: string | null;
};

export default function ProfilePage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [email, setEmail] = useState<string | null>(null);
  const [form, setForm] = useState({
    full_name: "", phone: "", company: "", license_number: "", years_of_experience: "", specialization: "",
    address: "", city: "", state: "", zip: "", signature_name: "", title: "", license_state: "", logo_url: "",
  });
  const [msg, setMsg] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  function setField(key: keyof typeof form, value: string) { setForm((p) => ({ ...p, [key]: value })); }

  async function loadProfile() {
    setLoading(true); setMsg(null); setError(null);
    const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
    if (sessionError) { setError(sessionError.message); setLoading(false); return; }
    const session = sessionData.session;
    if (!session) { window.location.href = "/login"; return; }
    setEmail(session.user.email ?? null);

    const { data, error } = await supabase
      .from("profiles")
      .select("id,full_name,phone,company,license_number,years_of_experience,specialization,address,city,state,zip,signature_name,title,license_state,logo_url")
      .eq("id", session.user.id)
      .maybeSingle<ProfileRow>();

    if (error) { setError(error.message); setLoading(false); return; }
    setForm({
      full_name: data?.full_name ?? "", phone: data?.phone ?? "", company: data?.company ?? "",
      license_number: data?.license_number ?? "", years_of_experience: data?.years_of_experience ?? "",
      specialization: data?.specialization ?? "", address: data?.address ?? "", city: data?.city ?? "",
      state: data?.state ?? "", zip: data?.zip ?? "", signature_name: data?.signature_name ?? "",
      title: data?.title ?? "", license_state: data?.license_state ?? "", logo_url: data?.logo_url ?? "",
    });
    setLoading(false);
  }

  async function saveProfile(e?: React.FormEvent) {
    if (e) e.preventDefault();
    setSaving(true); setMsg(null); setError(null);
    const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
    if (sessionError) { setError(sessionError.message); setSaving(false); return; }
    const userId = sessionData.session?.user?.id;
    if (!userId) { window.location.href = "/login"; return; }

    const payload: any = { id: userId };
    Object.entries(form).forEach(([k, v]) => { payload[k] = v.trim() || null; });
    const { error: upsertError } = await supabase.from("profiles").upsert(payload, { onConflict: "id" });
    setSaving(false);
    if (upsertError) { setError(upsertError.message); return; }
    setMsg("Profile updated successfully.");
  }

  useEffect(() => { loadProfile(); }, []);

  const labelStyle: React.CSSProperties = { fontSize: 12, color: "#6b7280", fontWeight: 800, marginBottom: 6 };
  const inputStyle: React.CSSProperties = { padding: 10, borderRadius: 8, border: "1px solid #d1d5db", width: "100%", boxSizing: "border-box" };
  const btnBase: React.CSSProperties = { border: "1px solid #e5e7eb", background: "white", padding: "10px 12px", borderRadius: 10, fontSize: 13, fontWeight: 800, cursor: "pointer" };
  const btnPrimary: React.CSSProperties = { ...btnBase, border: "1px solid #111", background: "#111", color: "white" };
  const field = (key: keyof typeof form, label: string, placeholder = "") => (
    <div><div style={labelStyle}>{label}</div><input value={form[key]} onChange={(e) => setField(key, e.target.value)} placeholder={placeholder} style={inputStyle} /></div>
  );

  if (loading) return <div style={{ padding: 40 }}>Loading profile…</div>;

  return (
    <div style={{ minHeight: "100vh", background: "#f3f4f6", padding: 24, fontFamily: "Arial, Helvetica, sans-serif" }}>
      <form onSubmit={saveProfile} style={{ maxWidth: 920, margin: "0 auto", background: "white", padding: 24, borderRadius: 14, border: "1px solid #e5e7eb", display: "grid", gap: 18 }}>
        <div style={{ display: "flex", justifyContent: "space-between", gap: 12 }}>
          <div><h1 style={{ fontSize: 26, fontWeight: 900, margin: 0 }}>Appraiser Profile</h1><div style={{ marginTop: 6, fontSize: 13, color: "#666" }}>{email ? <>Logged in as <strong>{email}</strong></> : " "}</div></div>
          <div style={{ display: "flex", gap: 10, alignItems: "flex-start" }}><button type="button" onClick={() => (window.location.href = "/")} style={btnBase}>Back</button><button type="submit" disabled={saving} style={{ ...btnPrimary, opacity: saving ? 0.7 : 1 }}>{saving ? "Saving…" : "Save Profile"}</button></div>
        </div>

        <div style={{ border: "1px solid #e5e7eb", borderRadius: 12, padding: 14 }}>
          <div style={{ fontWeight: 900, marginBottom: 12 }}>Professional Details</div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 12 }}>
            {field("full_name", "Full Name", "Your full name")}{field("phone", "Phone")}{field("company", "Company")}{field("license_number", "License Number")}{field("years_of_experience", "Years of Experience")}{field("specialization", "Specialization")}{field("title", "Title", "Certified Residential Appraiser")}{field("license_state", "License State", "CA / NY / FL...")}
          </div>
        </div>

        <div style={{ border: "1px solid #e5e7eb", borderRadius: 12, padding: 14 }}>
          <div style={{ fontWeight: 900, marginBottom: 12 }}>Office Address</div>
          <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr 1fr 1fr", gap: 12 }}>{field("address", "Address")}{field("city", "City")}{field("state", "State")}{field("zip", "ZIP")}</div>
        </div>

        <div style={{ border: "1px solid #e5e7eb", borderRadius: 12, padding: 14 }}>
          <div style={{ fontWeight: 900, marginBottom: 12 }}>Report Branding</div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>{field("signature_name", "Signature Name", "/s/ Jane Doe")}{field("logo_url", "Logo URL", "https://...")}</div>
          {form.logo_url && <div style={{ marginTop: 12 }}><div style={labelStyle}>Logo Preview</div><img src={form.logo_url} alt="Logo preview" style={{ maxHeight: 70, maxWidth: 220, border: "1px solid #e5e7eb", borderRadius: 10, padding: 8 }} /></div>}
        </div>

        {msg && <div style={{ padding: 10, borderRadius: 8, background: "#ecfdf5", color: "#065f46", fontSize: 13, textAlign: "center" }}>{msg}</div>}
        {error && <div style={{ padding: 10, borderRadius: 8, background: "#fee2e2", color: "#991b1b", fontSize: 13, textAlign: "center" }}>{error}</div>}
      </form>
    </div>
  );
}
