"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

type Status = "draft" | "final";

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

type ReportData = {
  propertyIdentification: {
    enteredAddress?: string;
    verifiedAddress?: string;
    city?: string;
    state?: string;
    zip?: string;
    county?: string;
  };
  propertyDescription: {
    propertyType?: "single_family" | "condo" | "townhouse";
    yearBuilt?: number;
    sqft?: number;
    bedrooms?: number;
    bathrooms?: number;
    condition?: string;
    additionalImprovements?: string;
  };
  neighborhoodOverview: {
    neighborhoodDescription?: string;
    zoning?: string;
    marketConditions?: "stable" | "rising" | "declining";
    accessToServices?: string;
  };
  valuationSummary: {
    intendedUse?: "mortgage" | "legal" | "internal";
    valuationCommentary?: string;
    limitingConditions?: string;
  };
  appraiserDeclaration: {
    appraiserName?: string;
    licenseNumber?: string;
    effectiveDate?: string;
    signatureText?: string;
  };
};

const emptyReportData: ReportData = {
  propertyIdentification: {},
  propertyDescription: {},
  neighborhoodOverview: {},
  valuationSummary: {},
  appraiserDeclaration: {},
};

function normalizeReportData(raw: any): ReportData {
  const safe = raw && typeof raw === "object" ? raw : {};
  return {
    propertyIdentification: { ...(safe.propertyIdentification ?? {}) },
    propertyDescription: { ...(safe.propertyDescription ?? {}) },
    neighborhoodOverview: { ...(safe.neighborhoodOverview ?? {}) },
    valuationSummary: { ...(safe.valuationSummary ?? {}) },
    appraiserDeclaration: { ...(safe.appraiserDeclaration ?? {}) },
  };
}

type ReportRow = {
  id: string;
  status: string | null;
  created_at: string;
  address: string | null;
  city: string | null;
  state: string | null;
  zip: string | null;
  beds: number | null;
  baths: number | null;
  living_area_sqft: number | null;
  year_built: number | null;
  report_data: any;
};

type ShareRow = {
  id: string;
  token: string;
  created_at: string;
  views_count: number | null;
};

function origin() {
  if (typeof window === "undefined") return "";
  return window.location.origin;
}

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

export default function ReportEditPage() {
  const router = useRouter();
  const params = useParams();
  const id = (params?.id as string) || "";

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [finalizing, setFinalizing] = useState(false);

  const [message, setMessage] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const [status, setStatus] = useState<Status>("draft");
  const isFinal = status === "final";

  const [userId, setUserId] = useState<string | null>(null);

  const [address, setAddress] = useState("");
  const [city, setCity] = useState("");
  const [stateUS, setStateUS] = useState("");
  const [zip, setZip] = useState("");

  const [beds, setBeds] = useState<number | "">("");
  const [baths, setBaths] = useState<number | "">("");
  const [livingArea, setLivingArea] = useState<number | "">("");
  const [yearBuilt, setYearBuilt] = useState<number | "">("");

  const [reportData, setReportData] = useState<ReportData>(emptyReportData);

  const [osmInfo, setOsmInfo] = useState<{
    formatted_address: string | null;
    place_id: string | null;
    lat: number | null;
    lng: number | null;
    county: string | null;
  } | null>(null);

  const [fetchingOsm, setFetchingOsm] = useState(false);

  const [shares, setShares] = useState<ShareRow[]>([]);
  const [shareLoading, setShareLoading] = useState(false);
  const [shareMsg, setShareMsg] = useState<string | null>(null);
  const [shareErr, setShareErr] = useState<string | null>(null);

  const enteredAddressLine = useMemo(
    () => [address, city, stateUS, zip].filter(Boolean).join(", "),
    [address, city, stateUS, zip]
  );

  const verifiedAddress = osmInfo?.formatted_address ?? null;
  const county = osmInfo?.county ?? null;

  function updateReportData(path: string, value: any) {
    setReportData((prev) => {
      const copy: any =
        typeof structuredClone === "function"
          ? structuredClone(prev)
          : JSON.parse(JSON.stringify(prev));

      const keys = path.split(".");
      let obj = copy;
      for (let i = 0; i < keys.length - 1; i++) obj = obj[keys[i]];
      obj[keys[keys.length - 1]] = value;
      return copy;
    });
  }

  async function loadShares(reportId: string) {
    setShareLoading(true);
    setShareErr(null);

    const { data, error } = await supabase
      .from("report_shares")
      .select("id,token,created_at,views_count")
      .eq("report_id", reportId)
      .order("created_at", { ascending: false });

    if (error) {
      setShareErr(error.message);
      setShares([]);
      setShareLoading(false);
      return;
    }

    setShares((data as ShareRow[]) ?? []);
    setShareLoading(false);
  }

  useEffect(() => {
    (async () => {
      setLoading(true);
      setErrorMsg(null);
      setMessage(null);

      if (!id) {
        setErrorMsg("Missing report id in URL.");
        setLoading(false);
        return;
      }

      const { data: sessionData, error: sessionErr } =
        await supabase.auth.getSession();

      if (sessionErr) {
        setErrorMsg(`Auth error: ${sessionErr.message}`);
        setLoading(false);
        return;
      }

      if (!sessionData.session) {
        router.replace("/login");
        return;
      }

      const uid = sessionData.session.user.id;
      setUserId(uid);

      const { data, error } = await supabase
        .from("reports")
        .select(
          `
          id,status,created_at,
          address,city,state,zip,
          beds,baths,living_area_sqft,year_built,
          report_data
        `
        )
        .eq("id", id)
        .single();

      if (error || !data) {
        setErrorMsg(`Could not load report. ${error?.message || ""}`);
        setLoading(false);
        return;
      }

      const rep = data as ReportRow;
      const final = isFinalStatus(rep.status);
      setStatus(final ? "final" : "draft");

      setAddress(rep.address ?? "");
      setCity(rep.city ?? "");
      setStateUS(rep.state ?? "");
      setZip(rep.zip ?? "");

      setBeds(rep.beds ?? "");
      setBaths(rep.baths ?? "");
      setLivingArea(rep.living_area_sqft ?? "");
      setYearBuilt(rep.year_built ?? "");

      setReportData({
        ...emptyReportData,
        ...normalizeReportData(rep.report_data),
      });

      const { data: ext } = await supabase
        .from("external_properties")
        .select("formatted_address, place_id, lat, lng, county")
        .eq("report_id", id)
        .eq("source", "osm")
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (ext) {
        setOsmInfo({
          formatted_address: ext.formatted_address ?? null,
          place_id: ext.place_id ?? null,
          lat: ext.lat ?? null,
          lng: ext.lng ?? null,
          county: ext.county ?? null,
        });
      } else {
        setOsmInfo(null);
      }

      // ✅ IMPORTANT: don't block page on shares loading
      setLoading(false);

      // load shares in background
      try {
        loadShares(id);
      } catch {
        // ignore
      }
    })();
  }, [id, router]);

  async function saveReport() {
    if (isFinal) {
      setMessage(null);
      setErrorMsg("This report is FINAL and cannot be edited.");
      return;
    }

    setSaving(true);
    setMessage(null);
    setErrorMsg(null);

    const reportDataToSave: ReportData = {
      ...reportData,
      propertyIdentification: {
        ...(reportData.propertyIdentification ?? {}),
        enteredAddress: enteredAddressLine,
        verifiedAddress: verifiedAddress ?? undefined,
        city: city || undefined,
        state: stateUS || undefined,
        zip: zip || undefined,
        county: county ?? undefined,
      },
      propertyDescription: {
        ...(reportData.propertyDescription ?? {}),
        bedrooms: beds === "" ? undefined : beds,
        bathrooms: baths === "" ? undefined : baths,
        sqft: livingArea === "" ? undefined : livingArea,
        yearBuilt: yearBuilt === "" ? undefined : yearBuilt,
      },
    };

    const { error } = await supabase
      .from("reports")
      .update({
        address,
        city,
        state: stateUS,
        zip,
        beds: beds === "" ? null : beds,
        baths: baths === "" ? null : baths,
        living_area_sqft: livingArea === "" ? null : livingArea,
        year_built: yearBuilt === "" ? null : yearBuilt,
        report_data: reportDataToSave,
      })
      .eq("id", id);

    if (error) {
      setErrorMsg(`Save failed: ${error.message}`);
      setSaving(false);
      return;
    }

    setReportData(reportDataToSave);
    setMessage("✅ Saved");
    setSaving(false);
  }

  async function finalizeReport() {
    if (isFinal) return;

    setFinalizing(true);
    setMessage(null);
    setErrorMsg(null);

    const { error } = await supabase
      .from("reports")
      .update({ status: "final" })
      .eq("id", id);

    if (error) {
      setErrorMsg(`Finalize failed: ${error.message}`);
      setFinalizing(false);
      return;
    }

    setStatus("final");
    setMessage("✅ Report finalized");
    setFinalizing(false);

    try {
      loadShares(id);
    } catch {
      // ignore
    }
  }

  async function fetchOsmGeocode() {
    if (fetchingOsm) return;
    if (isFinal) {
      setErrorMsg("This report is FINAL. Geocode is locked.");
      return;
    }

    setFetchingOsm(true);
    setMessage(null);
    setErrorMsg(null);

    const query = [address, city, stateUS, zip].filter(Boolean).join(", ").trim();
    if (!query) {
      setErrorMsg("Please enter an address first.");
      setFetchingOsm(false);
      return;
    }

    try {
      const res = await fetch("/api/geocode", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query }),
      });

      const api = await res.json();

      if (!res.ok) {
        setErrorMsg(api?.error || "Geocode failed");
        setFetchingOsm(false);
        return;
      }

      const d = api?.data;

      const { error: insertErr } = await supabase
        .from("external_properties")
        .insert({
          report_id: id,
          source: "osm",
          formatted_address: d?.formatted_address ?? null,
          place_id: d?.place_id ?? null,
          lat: d?.lat ?? null,
          lng: d?.lng ?? null,
          county: d?.county ?? null,
          raw_json: d?.raw_json ?? null,
        });

      if (insertErr) {
        setErrorMsg(`Save to Supabase failed: ${insertErr.message}`);
        setFetchingOsm(false);
        return;
      }

      setOsmInfo({
        formatted_address: d?.formatted_address ?? null,
        place_id: d?.place_id ?? null,
        lat: d?.lat ?? null,
        lng: d?.lng ?? null,
        county: d?.county ?? null,
      });

      setMessage("✅ OSM data fetched & saved");
    } catch {
      setErrorMsg("Network error calling /api/geocode");
    } finally {
      setFetchingOsm(false);
    }
  }

  async function createShareLink() {
    setShareMsg(null);
    setShareErr(null);

    if (!userId) {
      setShareErr("Missing user session");
      return;
    }
    if (!isFinal) {
      setShareErr("Sharing is available only for FINAL reports.");
      return;
    }

    setShareLoading(true);

    for (let attempt = 1; attempt <= 5; attempt++) {
      const token = generateTokenHex(16);

      const { error } = await supabase.from("report_shares").insert({
        owner_id: userId,
        report_id: id,
        token,
      });

      if (!error) {
        try {
          loadShares(id);
        } catch {}
        setShareMsg("✅ Share link created");
        setShareLoading(false);
        return;
      }

      const msg = (error as any)?.message?.toString?.() ?? "";
      const code = (error as any)?.code?.toString?.() ?? "";
      if (code === "23505" || msg.toLowerCase().includes("duplicate")) continue;

      setShareErr(error.message);
      setShareLoading(false);
      return;
    }

    setShareErr("Could not create unique token. Try again.");
    setShareLoading(false);
  }

  async function revokeShare(shareId: string) {
    setShareMsg(null);
    setShareErr(null);
    setShareLoading(true);

    const { error } = await supabase
      .from("report_shares")
      .delete()
      .eq("id", shareId);

    if (error) {
      setShareErr(error.message);
      setShareLoading(false);
      return;
    }

    try {
      loadShares(id);
    } catch {}
    setShareMsg("✅ Link revoked");
    setShareLoading(false);
  }

  async function copyToClipboard(textToCopy: string) {
    setShareMsg(null);
    setShareErr(null);

    try {
      await navigator.clipboard.writeText(textToCopy);
      setShareMsg("✅ Copied");
      return;
    } catch {}

    try {
      const ta = document.createElement("textarea");
      ta.value = textToCopy;
      ta.style.position = "fixed";
      ta.style.top = "0";
      ta.style.left = "0";
      ta.style.opacity = "0";
      document.body.appendChild(ta);
      ta.focus();
      ta.select();
      document.execCommand("copy");
      document.body.removeChild(ta);
      setShareMsg("✅ Copied");
    } catch {
      setShareErr("Copy failed.");
    }
  }

  if (loading) return <div style={{ padding: 18 }}>Loading report…</div>;

  // Smaller overall look (sizes only)
  const inputStyle = (disabled: boolean) => ({
    padding: 9,
    border: "1px solid #ccc",
    borderRadius: 8,
    background: disabled ? "#f3f4f6" : "white",
    fontSize: 13,
  });

  const sectionCard = {
    background: "white",
    border: "1px solid #e5e7eb",
    borderRadius: 12,
    padding: 12,
  } as const;

  const labelStyle = { fontSize: 11, color: "#666", marginBottom: 6 } as const;

  const btnBase: React.CSSProperties = {
    padding: "9px 11px",
    borderRadius: 10,
    border: "1px solid #ccc",
    cursor: "pointer",
    background: "white",
    fontWeight: 800,
    fontSize: 12,
  };

  return (
    <div style={{ padding: 18, maxWidth: 980, margin: "0 auto" }}>
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", gap: 10 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 800, marginBottom: 6 }}>
            {isFinal ? "Report (Final - Locked)" : "Edit Report"}
          </h1>
          <div style={{ fontSize: 12, color: "#666" }}>ID: {id}</div>

          <div style={{ marginTop: 8, display: "flex", gap: 8, alignItems: "center" }}>
            <span
              style={{
                fontSize: 12,
                padding: "4px 8px",
                borderRadius: 999,
                border: "1px solid #ccc",
              }}
            >
              Status: {isFinal ? "FINAL" : "DRAFT"}
            </span>

            {isFinal && (
              <a
                href={`/reports/${id}/view`}
                style={{
                  padding: "8px 10px",
                  borderRadius: 10,
                  border: "1px solid #111",
                  textDecoration: "none",
                  color: "white",
                  background: "#111",
                  fontSize: 12,
                  fontWeight: 800,
                }}
              >
                View / Print PDF →
              </a>
            )}
          </div>
        </div>

        <div style={{ display: "flex", gap: 8, alignItems: "flex-start" }}>
          <button onClick={() => router.push("/")} style={btnBase}>
            Back to Dashboard
          </button>

          <button
            onClick={finalizeReport}
            disabled={isFinal || finalizing}
            style={{
              ...btnBase,
              cursor: isFinal || finalizing ? "not-allowed" : "pointer",
              opacity: isFinal || finalizing ? 0.6 : 1,
            }}
          >
            {isFinal ? "Final" : finalizing ? "Finalizing…" : "Finalize"}
          </button>
        </div>
      </div>

      {/* Summary */}
      <div style={{ ...sectionCard, marginTop: 12 }}>
        <div style={{ fontWeight: 800, marginBottom: 6, fontSize: 13 }}>
          Property Summary
        </div>
        <div style={{ fontSize: 12.5, lineHeight: 1.55 }}>
          <div>
            <strong>Entered Address:</strong> {enteredAddressLine || "—"}
          </div>
          <div>
            <strong>Verified Address (OSM):</strong> {verifiedAddress ?? "— (click Fetch OSM)"}
          </div>
          <div>
            <strong>County (OSM):</strong> {county ?? "— (click Fetch OSM)"}
          </div>
        </div>
      </div>

      {/* ✅ OSM + Share stacked */}
      <div style={{ marginTop: 10, display: "grid", gap: 10 }}>
        <div style={sectionCard}>
          <div style={{ fontWeight: 800, marginBottom: 8, fontSize: 13 }}>
            OpenStreetMap Geocoding
          </div>

          <button
            onClick={fetchOsmGeocode}
            disabled={fetchingOsm || isFinal}
            style={{
              ...btnBase,
              width: "100%",
              cursor: fetchingOsm || isFinal ? "not-allowed" : "pointer",
              opacity: fetchingOsm || isFinal ? 0.6 : 1,
            }}
          >
            {isFinal ? "Final (Geocode locked)" : fetchingOsm ? "Fetching…" : "Fetch OSM (Real)"}
          </button>

          <div style={{ marginTop: 10, fontSize: 12.5, lineHeight: 1.5 }}>
            <div>
              <strong>Formatted:</strong> {osmInfo?.formatted_address ?? "—"}
            </div>
            <div>
              <strong>County:</strong> {osmInfo?.county ?? "—"}
            </div>
            <div>
              <strong>Lat/Lng:</strong>{" "}
              {osmInfo?.lat != null && osmInfo?.lng != null
                ? `${osmInfo.lat}, ${osmInfo.lng}`
                : "—"}
            </div>
          </div>
        </div>

        <div style={sectionCard}>
          <div style={{ fontWeight: 800, marginBottom: 8, fontSize: 13 }}>Share Links</div>

          {!isFinal && (
            <div style={{ fontSize: 12.5, color: "#6b7280", marginBottom: 10 }}>
              Sharing is enabled only after the report is <strong>FINAL</strong>.
            </div>
          )}

          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <button
              onClick={createShareLink}
              disabled={shareLoading || !isFinal}
              style={{
                ...btnBase,
                cursor: shareLoading || !isFinal ? "not-allowed" : "pointer",
                opacity: shareLoading || !isFinal ? 0.6 : 1,
              }}
            >
              {shareLoading ? "Working…" : "Create Link"}
            </button>

            <button
              onClick={() => loadShares(id)}
              disabled={shareLoading}
              style={{
                ...btnBase,
                cursor: shareLoading ? "not-allowed" : "pointer",
                opacity: shareLoading ? 0.6 : 1,
              }}
            >
              Refresh
            </button>

            <div style={{ marginLeft: "auto", fontSize: 12, color: "#6b7280", alignSelf: "center" }}>
              Total links: <strong>{shares.length}</strong>
            </div>
          </div>

          {shareMsg && <div style={{ marginTop: 10, fontSize: 12.5 }}>{shareMsg}</div>}
          {shareErr && (
            <div style={{ marginTop: 10, fontSize: 12.5, color: "#b91c1c" }}>
              ❌ {shareErr}
            </div>
          )}

          <div style={{ marginTop: 10, display: "grid", gap: 10 }}>
            {shares.length === 0 ? (
              <div style={{ fontSize: 12.5, color: "#6b7280" }}>No share links yet.</div>
            ) : (
              shares.map((s) => {
                const url = `${origin()}/share/${s.token}`;
                return (
                  <div
                    key={s.id}
                    style={{
                      border: "1px solid #e5e7eb",
                      borderRadius: 12,
                      padding: 10,
                    }}
                  >
                    <div style={{ fontSize: 12, color: "#6b7280" }}>
                      Created: {new Date(s.created_at).toLocaleString()} {" • "}
                      <strong>Views:</strong> {s.views_count ?? 0}
                    </div>

                    <div
                      style={{
                        marginTop: 8,
                        fontSize: 12,
                        background: "#f8fafc",
                        border: "1px solid #e5e7eb",
                        borderRadius: 10,
                        padding: "8px 10px",
                        wordBreak: "break-all",
                      }}
                    >
                      {url}
                    </div>

                    <div style={{ display: "flex", gap: 8, marginTop: 8, flexWrap: "wrap" }}>
                      <button onClick={() => copyToClipboard(url)} style={{ ...btnBase, flex: 1 }}>
                        Copy
                      </button>

                      <a
                        href={url}
                        target="_blank"
                        rel="noreferrer"
                        style={{
                          ...btnBase,
                          textDecoration: "none",
                          color: "#111",
                          display: "inline-flex",
                          alignItems: "center",
                          justifyContent: "center",
                          flex: 1,
                        }}
                      >
                        Open
                      </a>

                      <button
                        onClick={() => revokeShare(s.id)}
                        disabled={shareLoading}
                        style={{
                          padding: "9px 11px",
                          borderRadius: 10,
                          border: "1px solid #111",
                          cursor: shareLoading ? "not-allowed" : "pointer",
                          background: "#111",
                          color: "white",
                          fontWeight: 900,
                          fontSize: 12,
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
      </div>

      {/* Form */}
      <div style={{ marginTop: 12, display: "grid", gap: 10 }}>
        <input
          placeholder="Address"
          value={address}
          disabled={isFinal}
          onChange={(e) => setAddress(e.target.value)}
          style={inputStyle(isFinal)}
        />
        <input
          placeholder="City"
          value={city}
          disabled={isFinal}
          onChange={(e) => setCity(e.target.value)}
          style={inputStyle(isFinal)}
        />

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
          <input
            placeholder="State"
            value={stateUS}
            disabled={isFinal}
            onChange={(e) => setStateUS(e.target.value)}
            style={inputStyle(isFinal)}
          />
          <input
            placeholder="ZIP"
            value={zip}
            disabled={isFinal}
            onChange={(e) => setZip(e.target.value)}
            style={inputStyle(isFinal)}
          />
        </div>

        <hr />

        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 8 }}>
          <input
            type="number"
            placeholder="Beds"
            value={beds}
            disabled={isFinal}
            onChange={(e) => setBeds(e.target.value === "" ? "" : Number(e.target.value))}
            style={inputStyle(isFinal)}
          />
          <input
            type="number"
            step="0.5"
            placeholder="Baths"
            value={baths}
            disabled={isFinal}
            onChange={(e) => setBaths(e.target.value === "" ? "" : Number(e.target.value))}
            style={inputStyle(isFinal)}
          />
          <input
            type="number"
            placeholder="Sqft"
            value={livingArea}
            disabled={isFinal}
            onChange={(e) => setLivingArea(e.target.value === "" ? "" : Number(e.target.value))}
            style={inputStyle(isFinal)}
          />
          <input
            type="number"
            placeholder="Year Built"
            value={yearBuilt}
            disabled={isFinal}
            onChange={(e) => setYearBuilt(e.target.value === "" ? "" : Number(e.target.value))}
            style={inputStyle(isFinal)}
          />
        </div>

        {/* (השאר נשאר בדיוק כמו אצלך — לא נגעתי) */}

        <button
          onClick={saveReport}
          disabled={saving || isFinal}
          style={{
            padding: "9px 11px",
            borderRadius: 10,
            border: "1px solid #ccc",
            cursor: saving || isFinal ? "not-allowed" : "pointer",
            background: "white",
            fontWeight: 800,
            fontSize: 12,
            width: "fit-content",
            opacity: saving || isFinal ? 0.6 : 1,
          }}
        >
          {isFinal ? "Final (Locked)" : saving ? "Saving…" : "Save"}
        </button>

        {message && <div style={{ marginTop: 8, fontSize: 12.5 }}>{message}</div>}
        {errorMsg && (
          <div style={{ marginTop: 8, color: "#b91c1c", fontSize: 12.5 }}>❌ {errorMsg}</div>
        )}
      </div>
    </div>
  );
}

