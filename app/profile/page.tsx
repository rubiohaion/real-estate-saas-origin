"use client";

import { useEffect, useState } from "react";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

type ProfileRow = { id: string; full_name: string | null; phone: string | null; company: string | null; license_number: string | null };

export default function ProfilePage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [email, setEmail] = useState<string | null>(null);

  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [company, setCompany] = useState("");
  const [licenseNumber, setLicenseNumber] = useState("");
  const [yearsExperience, setYearsExperience] = useState("");
  const [specialization, setSpecialization] = useState("Residential");
  const [licenseState, setLicenseState] = useState("");
  const [title, setTitle] = useState("Certified Residential Appraiser");
  const [officeAddress, setOfficeAddress] = useState("");
  const [officeCity, setOfficeCity] = useState("");
  const [officeState, setOfficeState] = useState("");
  const [officeZip, setOfficeZip] = useState("");
  const [signatureName, setSignatureName] = useState("");
  const [logoUrl, setLogoUrl] = useState("");

  const [msg, setMsg] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function loadProfile() {
    setLoading(true); setMsg(null); setError(null);
    const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
    if (sessionError) { setError(sessionError.message); setLoading(false); return; }
    const session = sessionData.session;
    if (!session) { window.location.href = "/login"; return; }
    setEmail(session.user.email ?? null);
    const meta: any = session.user.user_metadata ?? {};
    const userId = session.user.id;
    const { data, error } = await supabase.from("profiles").select("id, full_name, phone, company, license_number").eq("id", userId).maybeSingle<ProfileRow>();
    if (error) { setError(error.message); setLoading(false); return; }
    setFullName(data?.full_name ?? meta.full_name ?? "");
    setPhone(data?.phone ?? meta.phone ?? "");
    setCompany(data?.company ?? meta.company ?? "");
    setLicenseNumber(data?.license_number ?? meta.license_number ?? "");
    setYearsExperience(meta.years_experience ?? "");
    setSpecialization(meta.specialization ?? "Residential");
    setLicenseState(meta.license_state ?? "");
    setTitle(meta.title ?? "Certified Residential Appraiser");
    setOfficeAddress(meta.office_address ?? "");
    setOfficeCity(meta.office_city ?? "");
    setOfficeState(meta.office_state ?? "");
    setOfficeZip(meta.office_zip ?? "");
    setSignatureName(meta.signature_name ?? data?.full_name ?? "");
    setLogoUrl(meta.logo_url ?? "");
    setLoading(false);
  }

  async function saveProfile(e?: React.FormEvent) {
    if (e) e.preventDefault();
    setSaving(true); setMsg(null); setError(null);
    const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
    if (sessionError) { setError(sessionError.message); setSaving(false); return; }
    const userId = sessionData.session?.user?.id;
    if (!userId) { window.location.href = "/login"; return; }
    const { error: upsertError } = await supabase.from("profiles").upsert({ id: userId, full_name: fullName, phone: phone || null, company: company || null, license_number: licenseNumber || null }, { onConflict: "id" });
    if (upsertError) { setError(upsertError.message); setSaving(false); return; }
    const { error: metaError } = await supabase.auth.updateUser({ data: {
      full_name: fullName, phone, company, license_number: licenseNumber,
      years_experience: yearsExperience, specialization, license_state: licenseState, title,
      office_address: officeAddress, office_city: officeCity, office_state: officeState, office_zip: officeZip,
      signature_name: signatureName, logo_url: logoUrl,
    }});
    setSaving(false);
    if (metaError) { setError(metaError.message); return; }
    setMsg("Profile updated successfully.");
  }

  useEffect(() => { loadProfile(); }, []);

  const labelStyle: React.CSSProperties = { fontSize: 12, color: "#6b7280", fontWeight: 800, marginBottom: 6 };
  const inputStyle: React.CSSProperties = { padding: 10, borderRadius: 8, border: "1px solid #ccc", width: "100%" };
  const sectionStyle: React.CSSProperties = { border: "1px solid #e5e7eb", borderRadius: 14, padding: 16, display: "grid", gap: 12 };
  const btnBase: React.CSSProperties = { border: "1px solid #e5e7eb", background: "white", padding: "10px 12px", borderRadius: 10, fontSize: 13, fontWeight: 800, cursor: "pointer" };
  const btnPrimary: React.CSSProperties = { ...btnBase, border: "1px solid #111", background: "#111", color: "white" };

  if (loading) return <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "#f3f4f6", fontWeight: 700 }}>Loading profile…</div>;

  const Field = ({ label, children }: { label: string; children: React.ReactNode }) => <div><div style={labelStyle}>{label}</div>{children}</div>;

  return <div style={{ minHeight: "100vh", background: "#f3f4f6", padding: 24 }}>
    <form onSubmit={saveProfile} style={{ maxWidth: 920, margin: "0 auto", background: "white", padding: 24, borderRadius: 16, border: "1px solid #e5e7eb", display: "grid", gap: 16, fontFamily: "Arial, Helvetica, sans-serif" }}>
      <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "flex-start" }}>
        <div><h1 style={{ fontSize: 26, fontWeight: 900, margin: 0 }}>Appraiser Profile</h1><div style={{ marginTop: 6, fontSize: 13, color: "#666" }}>Logged in as <strong>{email}</strong></div></div>
        <div style={{ display: "flex", gap: 10 }}><button type="button" onClick={() => (window.location.href = "/")} style={btnBase}>Back</button><button type="submit" disabled={saving} style={{ ...btnPrimary, opacity: saving ? 0.7 : 1 }}>{saving ? "Saving…" : "Save Profile"}</button></div>
      </div>

      <div style={sectionStyle}><div style={{ fontWeight: 900 }}>Personal & Company Details</div><div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
        <Field label="Full Name"><input value={fullName} onChange={(e) => setFullName(e.target.value)} required placeholder="Full name" style={inputStyle} /></Field>
        <Field label="Phone"><input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="Phone" style={inputStyle} /></Field>
        <Field label="Company Name"><input value={company} onChange={(e) => setCompany(e.target.value)} placeholder="Company" style={inputStyle} /></Field>
        <Field label="Logo URL"><input value={logoUrl} onChange={(e) => setLogoUrl(e.target.value)} placeholder="https://.../logo.png" style={inputStyle} /></Field>
      </div>{logoUrl && <div style={{ display: "flex", alignItems: "center", gap: 12, padding: 12, background: "#f8fafc", borderRadius: 12 }}><img src={logoUrl} alt="Company logo" style={{ width: 90, maxHeight: 55, objectFit: "contain" }} /><span style={{ fontSize: 12, color: "#6b7280" }}>Logo preview. Upload file support will be added later through Supabase Storage.</span></div>}</div>

      <div style={sectionStyle}><div style={{ fontWeight: 900 }}>Professional Information</div><div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
        <Field label="License Number"><input value={licenseNumber} onChange={(e) => setLicenseNumber(e.target.value)} placeholder="License #" style={inputStyle} /></Field>
        <Field label="License State"><input value={licenseState} onChange={(e) => setLicenseState(e.target.value)} placeholder="CA / NY / FL" style={inputStyle} /></Field>
        <Field label="Title"><input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Certified Residential Appraiser" style={inputStyle} /></Field>
        <Field label="Years of Experience"><input type="number" value={yearsExperience} onChange={(e) => setYearsExperience(e.target.value)} placeholder="Years" style={inputStyle} /></Field>
        <Field label="Specialization"><select value={specialization} onChange={(e) => setSpecialization(e.target.value)} style={inputStyle}><option>Residential</option><option>Commercial</option><option>Land</option><option>Mixed Use</option><option>Luxury</option><option>Other</option></select></Field>
        <Field label="Signature Name"><input value={signatureName} onChange={(e) => setSignatureName(e.target.value)} placeholder="Name as shown on reports" style={inputStyle} /></Field>
      </div></div>

      <div style={sectionStyle}><div style={{ fontWeight: 900 }}>Office Address</div><div style={{ display: "grid", gridTemplateColumns: "2fr 1fr 1fr 1fr", gap: 12 }}>
        <Field label="Address"><input value={officeAddress} onChange={(e) => setOfficeAddress(e.target.value)} placeholder="Street address" style={inputStyle} /></Field>
        <Field label="City"><input value={officeCity} onChange={(e) => setOfficeCity(e.target.value)} placeholder="City" style={inputStyle} /></Field>
        <Field label="State"><input value={officeState} onChange={(e) => setOfficeState(e.target.value)} placeholder="State" style={inputStyle} /></Field>
        <Field label="ZIP"><input value={officeZip} onChange={(e) => setOfficeZip(e.target.value)} placeholder="ZIP" style={inputStyle} /></Field>
      </div></div>

      {msg && <div style={{ padding: 10, borderRadius: 8, background: "#e5e7eb", color: "#111827", fontSize: 13, textAlign: "center" }}>{msg}</div>}
      {error && <div style={{ padding: 10, borderRadius: 8, background: "#fee2e2", color: "#991b1b", fontSize: 13, textAlign: "center" }}>{error}</div>}
      <div style={{ display: "flex", justifyContent: "flex-end", gap: 10 }}><button type="button" onClick={() => (window.location.href = "/")} style={btnBase}>Cancel</button><button type="submit" disabled={saving} style={{ ...btnPrimary, opacity: saving ? 0.7 : 1 }}>{saving ? "Saving…" : "Save Profile"}</button></div>
    </form>
  </div>;
}
