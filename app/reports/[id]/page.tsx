"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

type Status = "draft" | "final";

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
    propertyType?: "single_family" | "condo" | "townhouse" | string;
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
    marketConditions?: "stable" | "rising" | "declining" | string;
    accessToServices?: string;
  };
  valuationSummary: {
    intendedUse?: "mortgage" | "legal" | "internal" | string;
    valuationCommentary?: string;
    limitingConditions?: string;
    estimatedValue?: number;
    estimatedLow?: number;
    estimatedHigh?: number;
    pricePerSqft?: number;
    confidence?: string;
    valuationMethod?: string;
    externalEstimate?: number | null;
    externalLow?: number | null;
    externalHigh?: number | null;
    externalSource?: string;
    externalAddress?: string;
    externalMessage?: string;
    externalCheckedAt?: string;
    externalRaw?: any;
    aiSource?: string;
    aiGeneratedAt?: string;
    adjustedValue?: number | null;
    finalValue?: number | null;
    valueSource?: string;
  };
  appraiserDeclaration: {
    appraiserName?: string;
    licenseNumber?: string;
    effectiveDate?: string;
    signatureText?: string;
  };
};

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

const emptyReportData: ReportData = {
  propertyIdentification: {},
  propertyDescription: {},
  neighborhoodOverview: {},
  valuationSummary: {},
  appraiserDeclaration: {},
};

function norm(v: any) {
  return (v ?? "").toString().trim().toLowerCase();
}

function isFinalStatus(status: any) {
  const s = norm(status);
  return !!(
    s === "final" ||
    s.includes("final") ||
    s === "finished" ||
    s === "completed" ||
    s === "complete" ||
    s === "done"
  );
}

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

function money(v?: number | null) {
  if (v === null || v === undefined || Number.isNaN(Number(v))) return "—";
  return `$${Math.round(Number(v)).toLocaleString()}`;
}

function toNumOrUndefined(v: number | "") {
  return v === "" ? undefined : v;
}

function externalSummary(vs: ReportData["valuationSummary"]) {
  if (vs.externalEstimate) {
    const range = vs.externalLow || vs.externalHigh
      ? ` Range: ${money(vs.externalLow)} - ${money(vs.externalHigh)}.`
      : "";
    return `External market estimate from ${vs.externalSource || "external source"}: ${money(vs.externalEstimate)}.${range}`;
  }
  if (vs.externalMessage) return vs.externalMessage;
  return "No external lookup has been saved yet.";
}

export default function ReportEditPage() {
  const router = useRouter();
  const params = useParams();
  const id = (params?.id as string) || "";

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [finalizing, setFinalizing] = useState(false);
  const [aiLoading, setAiLoading] = useState(false);
  const [valuing, setValuing] = useState(false);
  const [externalLoading, setExternalLoading] = useState(false);

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
  const valuation = reportData.valuationSummary ?? {};

  function buildReportData(overrides?: Partial<ReportData>): ReportData {
    const next: ReportData = {
      ...reportData,
      propertyIdentification: {
        ...(reportData.propertyIdentification ?? {}),
        enteredAddress: enteredAddressLine || undefined,
        verifiedAddress: verifiedAddress ?? undefined,
        city: city || undefined,
        state: stateUS || undefined,
        zip: zip || undefined,
        county: county ?? undefined,
      },
      propertyDescription: {
        ...(reportData.propertyDescription ?? {}),
        bedrooms: toNumOrUndefined(beds),
        bathrooms: toNumOrUndefined(baths),
        sqft: toNumOrUndefined(livingArea),
        yearBuilt: toNumOrUndefined(yearBuilt),
      },
      neighborhoodOverview: { ...(reportData.neighborhoodOverview ?? {}) },
      valuationSummary: { ...(reportData.valuationSummary ?? {}) },
      appraiserDeclaration: { ...(reportData.appraiserDeclaration ?? {}) },
    };

    if (overrides?.propertyIdentification) next.propertyIdentification = { ...next.propertyIdentification, ...overrides.propertyIdentification };
    if (overrides?.propertyDescription) next.propertyDescription = { ...next.propertyDescription, ...overrides.propertyDescription };
    if (overrides?.neighborhoodOverview) next.neighborhoodOverview = { ...next.neighborhoodOverview, ...overrides.neighborhoodOverview };
    if (overrides?.valuationSummary) next.valuationSummary = { ...next.valuationSummary, ...overrides.valuationSummary };
    if (overrides?.appraiserDeclaration) next.appraiserDeclaration = { ...next.appraiserDeclaration, ...overrides.appraiserDeclaration };

    return next;
  }

  function updateReportData(path: string, value: any) {
    setReportData((prev) => {
      const copy: any =
        typeof structuredClone === "function"
          ? structuredClone(prev)
          : JSON.parse(JSON.stringify(prev));
      const keys = path.split(".");
      let obj = copy;
      for (let i = 0; i < keys.length - 1; i++) {
        if (!obj[keys[i]]) obj[keys[i]] = {};
        obj = obj[keys[i]];
      }
      obj[keys[keys.length - 1]] = value;
      return copy;
    });
  }

  async function persistReportData(nextData: ReportData, successMessage: string) {
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
        report_data: nextData,
      })
      .eq("id", id);

    if (error) throw error;
    setReportData(nextData);
    setMessage(successMessage);
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
    } else {
      setShares((data as ShareRow[]) ?? []);
    }
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

      const { data: sessionData, error: sessionErr } = await supabase.auth.getSession();
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
        .select("id,status,created_at,address,city,state,zip,beds,baths,living_area_sqft,year_built,report_data")
        .eq("id", id)
        .single();

      if (error || !data) {
        setErrorMsg(`Could not load report. ${error?.message || ""}`);
        setLoading(false);
        return;
      }

      const rep = data as ReportRow;
      setStatus(isFinalStatus(rep.status) ? "final" : "draft");
      setAddress(rep.address ?? "");
      setCity(rep.city ?? "");
      setStateUS(rep.state ?? "");
      setZip(rep.zip ?? "");
      setBeds(rep.beds ?? "");
      setBaths(rep.baths ?? "");
      setLivingArea(rep.living_area_sqft ?? "");
      setYearBuilt(rep.year_built ?? "");
      setReportData(normalizeReportData(rep.report_data));

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

      setLoading(false);
      loadShares(id).catch(() => undefined);
    })();
  }, [id, router]);

  async function saveReport() {
    if (isFinal) {
      setErrorMsg("This report is FINAL and cannot be edited.");
      return;
    }
    setSaving(true);
    setMessage(null);
    setErrorMsg(null);
    try {
      await persistReportData(buildReportData(), "✅ Saved");
    } catch (e: any) {
      setErrorMsg(`Save failed: ${e?.message || "Unknown error"}`);
    } finally {
      setSaving(false);
    }
  }

  async function calculateValuation() {
    if (isFinal) return setErrorMsg("This report is FINAL and cannot be edited.");
    setValuing(true);
    setMessage(null);
    setErrorMsg(null);
    try {
      const current = buildReportData();
      const res = await fetch("/api/valuation/calculate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          address,
          city,
          state: stateUS,
          zip,
          propertyType: current.propertyDescription.propertyType,
          sqft: current.propertyDescription.sqft,
          bedrooms: current.propertyDescription.bedrooms,
          bathrooms: current.propertyDescription.bathrooms,
          yearBuilt: current.propertyDescription.yearBuilt,
          condition: current.propertyDescription.condition,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error || "Valuation failed");
      const d = json.data;
      const next = buildReportData({
        valuationSummary: {
          estimatedValue: d.estimate,
          estimatedLow: d.low,
          estimatedHigh: d.high,
          pricePerSqft: d.pricePerSqft,
          confidence: d.confidence,
          valuationMethod: d.method,
          adjustedValue: current.valuationSummary.adjustedValue ?? null,
          finalValue: current.valuationSummary.adjustedValue ?? d.estimate,
          valueSource: current.valuationSummary.adjustedValue ? "Appraiser Adjusted" : "Internal Valuation",
          valuationCommentary:
            d.suggestedNarrative && !(current.valuationSummary.valuationCommentary ?? "").includes("internal valuation model indicates")
              ? `${(current.valuationSummary.valuationCommentary ?? "").trim() ? `${(current.valuationSummary.valuationCommentary ?? "").trim()}\n\n` : ""}${d.suggestedNarrative}`
              : current.valuationSummary.valuationCommentary,
        },
      });
      await persistReportData(next, `✅ Valuation calculated and saved: ${money(d.estimate)}`);
    } catch (e: any) {
      setErrorMsg(e?.message || "Valuation failed");
    } finally {
      setValuing(false);
    }
  }

  async function externalLookup() {
    if (isFinal) return setErrorMsg("This report is FINAL and cannot be edited.");
    setExternalLoading(true);
    setMessage(null);
    setErrorMsg(null);
    try {
      const current = buildReportData();
      const res = await fetch("/api/external/property-lookup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          address,
          city,
          state: stateUS,
          zip,
          propertyType: current.propertyDescription.propertyType,
          bedrooms: current.propertyDescription.bedrooms,
          bathrooms: current.propertyDescription.bathrooms,
          sqft: current.propertyDescription.sqft,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error || "External lookup failed");
      const d = json.data ?? {};
      const estimate = d.estimate ?? null;
      const low = d.low ?? null;
      const high = d.high ?? null;
      const currentCommentary = current.valuationSummary.valuationCommentary ?? "";
      const externalLine = estimate
        ? `External Market Estimate (${d.source || "external"}): ${money(estimate)}${low || high ? `; indicated range ${money(low)} - ${money(high)}` : ""}.`
        : `External Market Lookup (${d.source || "external"}): ${d.message || "No numeric estimate returned."}`;
      const shouldAppend = !currentCommentary.includes("External Market Estimate") && !currentCommentary.includes("External Market Lookup");

      const next = buildReportData({
        valuationSummary: {
          externalEstimate: estimate,
          externalLow: low,
          externalHigh: high,
          externalSource: d.source || "rentcast",
          externalAddress: d.address || enteredAddressLine,
          externalMessage: d.message || "External lookup completed.",
          externalCheckedAt: d.checkedAt || new Date().toISOString(),
          externalRaw: d.raw ?? null,
          finalValue: current.valuationSummary.adjustedValue ?? estimate ?? current.valuationSummary.finalValue ?? current.valuationSummary.estimatedValue ?? null,
          valueSource: current.valuationSummary.adjustedValue ? "Appraiser Adjusted" : estimate ? "External Lookup" : current.valuationSummary.valueSource ?? "Internal Valuation",
          valuationCommentary: shouldAppend
            ? `${currentCommentary ? `${currentCommentary}\n\n` : ""}${externalLine}`
            : currentCommentary,
        },
      });

      await persistReportData(
        next,
        estimate
          ? `✅ External estimate saved and displayed: ${money(estimate)}`
          : `✅ External data unavailable; Internal Valuation remains active.`
      );
    } catch (e: any) {
      setErrorMsg(e?.message || "External lookup failed");
    } finally {
      setExternalLoading(false);
    }
  }

  async function generateAiReport() {
    if (isFinal) return setErrorMsg("This report is FINAL and cannot be edited.");
    setAiLoading(true);
    setMessage(null);
    setErrorMsg(null);
    try {
      const current = buildReportData();
      const res = await fetch("/api/ai/generate-report", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ address, city, state: stateUS, zip, reportData: current, valuation: current.valuationSummary }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error || "AI generation failed");
      const d = json.data;
      const next = buildReportData({
        neighborhoodOverview: {
          neighborhoodDescription: d.neighborhoodDescription,
        },
        valuationSummary: {
          valuationCommentary: d.valuationCommentary,
          limitingConditions: d.limitingConditions,
          aiSource: d.source,
          aiGeneratedAt: new Date().toISOString(),
        },
      });
      await persistReportData(next, `✅ AI narrative generated and saved (${d.source || "AI"})`);
    } catch (e: any) {
      setErrorMsg(e?.message || "AI generation failed");
    } finally {
      setAiLoading(false);
    }
  }

  async function finalizeReport() {
    if (isFinal) return;
    setFinalizing(true);
    setMessage(null);
    setErrorMsg(null);
    try {
      await saveReport();
      const { error } = await supabase.from("reports").update({ status: "final" }).eq("id", id);
      if (error) throw error;
      setStatus("final");
      setMessage("✅ Report finalized");
      loadShares(id).catch(() => undefined);
    } catch (e: any) {
      setErrorMsg(`Finalize failed: ${e?.message || "Unknown error"}`);
    } finally {
      setFinalizing(false);
    }
  }

  async function fetchOsmGeocode() {
    if (fetchingOsm) return;
    if (isFinal) return setErrorMsg("This report is FINAL. Geocode is locked.");
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
      const res = await fetch("/api/geocode", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ query }) });
      const api = await res.json();
      if (!res.ok) throw new Error(api?.error || "Geocode failed");
      const d = api?.data;
      const { error: insertErr } = await supabase.from("external_properties").insert({
        report_id: id,
        source: "osm",
        formatted_address: d?.formatted_address ?? null,
        place_id: d?.place_id ?? null,
        lat: d?.lat ?? null,
        lng: d?.lng ?? null,
        county: d?.county ?? null,
        raw_json: d?.raw_json ?? null,
      });
      if (insertErr) throw insertErr;
      setOsmInfo({ formatted_address: d?.formatted_address ?? null, place_id: d?.place_id ?? null, lat: d?.lat ?? null, lng: d?.lng ?? null, county: d?.county ?? null });
      setMessage("✅ OSM data fetched & saved");
    } catch (e: any) {
      setErrorMsg(e?.message || "Network error calling /api/geocode");
    } finally {
      setFetchingOsm(false);
    }
  }

  async function createShareLink() {
    setShareMsg(null);
    setShareErr(null);
    if (!userId) return setShareErr("Missing user session");
    if (!isFinal) return setShareErr("Sharing is available only for FINAL reports.");
    setShareLoading(true);
    for (let attempt = 1; attempt <= 5; attempt++) {
      const token = generateTokenHex(16);
      const { error } = await supabase.from("report_shares").insert({ owner_id: userId, report_id: id, token });
      if (!error) {
        await loadShares(id);
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
    const { error } = await supabase.from("report_shares").delete().eq("id", shareId);
    if (error) {
      setShareErr(error.message);
      setShareLoading(false);
      return;
    }
    await loadShares(id);
    setShareMsg("✅ Link revoked");
    setShareLoading(false);
  }

  async function copyToClipboard(textToCopy: string) {
    setShareMsg(null);
    setShareErr(null);
    try {
      await navigator.clipboard.writeText(textToCopy);
      setShareMsg("✅ Copied");
    } catch {
      setShareErr("Copy failed.");
    }
  }

  if (loading) return <div style={{ padding: 18 }}>Loading report…</div>;

  const inputStyle = (disabled: boolean): React.CSSProperties => ({ padding: 9, border: "1px solid #ccc", borderRadius: 8, background: disabled ? "#f3f4f6" : "white", fontSize: 13, width: "100%" });
  const sectionCard: React.CSSProperties = { background: "white", border: "1px solid #e5e7eb", borderRadius: 12, padding: 12 };
  const labelStyle: React.CSSProperties = { fontSize: 11, color: "#666", marginBottom: 6, fontWeight: 700 };
  const btnBase: React.CSSProperties = { padding: "9px 11px", borderRadius: 10, border: "1px solid #ccc", cursor: "pointer", background: "white", fontWeight: 800, fontSize: 12 };
  const btnDark: React.CSSProperties = { ...btnBase, border: "1px solid #111", background: "#111", color: "white" };

  return (
    <div style={{ padding: 18, maxWidth: 980, margin: "0 auto", fontFamily: "Arial, Helvetica, sans-serif" }}>
      <div style={{ display: "flex", justifyContent: "space-between", gap: 10 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 800, marginBottom: 6 }}>{isFinal ? "Report (Final - Locked)" : "Edit Report"}</h1>
          <div style={{ fontSize: 12, color: "#666" }}>ID: {id}</div>
          <div style={{ marginTop: 8, display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
            <span style={{ fontSize: 12, padding: "4px 8px", borderRadius: 999, border: "1px solid #ccc" }}>Status: {isFinal ? "FINAL" : "DRAFT"}</span>
            {isFinal && <a href={`/reports/${id}/view`} style={{ padding: "8px 10px", borderRadius: 10, border: "1px solid #111", textDecoration: "none", color: "white", background: "#111", fontSize: 12, fontWeight: 800 }}>View / Print PDF →</a>}
          </div>
        </div>
        <div style={{ display: "flex", gap: 8, alignItems: "flex-start" }}>
          <button onClick={() => router.push("/")} style={btnBase}>Back to Dashboard</button>
          {!isFinal && <button onClick={saveReport} disabled={saving} style={{ ...btnBase, opacity: saving ? 0.6 : 1 }}>{saving ? "Saving…" : "Quick Save"}</button>}
        </div>
      </div>

      {message && <div style={{ marginTop: 12, padding: 10, borderRadius: 10, background: "#ecfdf5", color: "#065f46", fontSize: 13 }}>{message}</div>}
      {errorMsg && <div style={{ marginTop: 12, padding: 10, borderRadius: 10, background: "#fee2e2", color: "#991b1b", fontSize: 13 }}>❌ {errorMsg}</div>}

      <div style={{ ...sectionCard, marginTop: 12 }}>
        <div style={{ fontWeight: 800, marginBottom: 6, fontSize: 13 }}>Property Summary</div>
        <div style={{ fontSize: 12.5, lineHeight: 1.55 }}>
          <div><strong>Entered Address:</strong> {enteredAddressLine || "—"}</div>
          <div><strong>Verified Address (OSM):</strong> {verifiedAddress ?? "— (click Fetch OSM)"}</div>
          <div><strong>County (OSM):</strong> {county ?? "— (click Fetch OSM)"}</div>
        </div>
      </div>

      <div style={{ marginTop: 10, display: "grid", gap: 10 }}>
        <div style={sectionCard}>
          <div style={{ fontWeight: 800, marginBottom: 8, fontSize: 13 }}>Smart Valuation & AI</div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: 8, marginBottom: 10 }}>
            <div><div style={labelStyle}>Calculated Estimate</div><div style={{ fontWeight: 900 }}>{money(valuation.estimatedValue)}</div></div>
            <div><div style={labelStyle}>Calculated Range</div><div>{valuation.estimatedLow ? `${money(valuation.estimatedLow)} - ${money(valuation.estimatedHigh)}` : "—"}</div></div>
            <div><div style={labelStyle}>External Estimate</div><div style={{ fontWeight: 900 }}>{money(valuation.externalEstimate)}</div></div>
            <div><div style={labelStyle}>Final Value Used</div><div style={{ fontWeight: 900 }}>{money(valuation.finalValue ?? valuation.adjustedValue ?? valuation.externalEstimate ?? valuation.estimatedValue)}</div></div>
            <div><div style={labelStyle}>Source</div><div>{valuation.valueSource || (valuation.adjustedValue ? "Appraiser Adjusted" : valuation.externalEstimate ? "External Lookup" : valuation.estimatedValue ? "Internal Valuation" : "—")}</div></div>
          </div>
          <div style={{ marginBottom: 10 }}>
            <div style={labelStyle}>Appraiser Adjusted Value (optional)</div>
            <input
              type="number"
              placeholder="Enter final value if appraiser overrides the calculated estimate"
              value={valuation.adjustedValue ?? ""}
              disabled={isFinal}
              onChange={(e) => {
                const val = e.target.value === "" ? null : Number(e.target.value);
                updateReportData("valuationSummary.adjustedValue", val);
                updateReportData("valuationSummary.finalValue", val ?? valuation.externalEstimate ?? valuation.estimatedValue ?? null);
                updateReportData("valuationSummary.valueSource", val ? "Appraiser Adjusted" : valuation.externalEstimate ? "External Lookup" : "Internal Valuation");
              }}
              style={inputStyle(isFinal)}
            />
            <div style={{ marginTop: 6, fontSize: 12, color: "#6b7280" }}>The adjusted value is the value that will be treated as the final appraiser-supported value in the report narrative.</div>
          </div>
          <div style={{ border: "1px solid #e5e7eb", borderRadius: 10, padding: 10, background: "#f8fafc", fontSize: 12.5, lineHeight: 1.55, marginBottom: 10 }}>
            <div><strong>External Source:</strong> {valuation.externalSource || "—"}</div>
            <div><strong>External Address:</strong> {valuation.externalAddress || "—"}</div>
            <div><strong>External Checked:</strong> {valuation.externalCheckedAt ? new Date(valuation.externalCheckedAt).toLocaleString() : "—"}</div>
            <div><strong>External Status:</strong> {externalSummary(valuation)}</div>
          </div>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <button onClick={calculateValuation} disabled={valuing || isFinal} style={{ ...btnBase, opacity: valuing || isFinal ? 0.6 : 1 }}>{valuing ? "Calculating…" : "Calculate Internal Value"}</button>
            <button onClick={externalLookup} disabled={externalLoading || isFinal} style={{ ...btnBase, opacity: externalLoading || isFinal ? 0.6 : 1 }}>{externalLoading ? "Checking…" : "External Lookup"}</button>
            <button onClick={generateAiReport} disabled={aiLoading || isFinal} style={{ ...btnDark, opacity: aiLoading || isFinal ? 0.6 : 1 }}>{aiLoading ? "Generating…" : "Generate AI Report"}</button>
          </div>
          <div style={{ marginTop: 8, fontSize: 12, color: "#6b7280" }}>Recommended flow: 1) Fill property data → 2) Calculate Internal Value → 3) External Lookup → 4) Generate AI Report.</div>
        </div>

        <div style={sectionCard}>
          <div style={{ fontWeight: 800, marginBottom: 8, fontSize: 13 }}>OpenStreetMap Geocoding</div>
          <button onClick={fetchOsmGeocode} disabled={fetchingOsm || isFinal} style={{ ...btnBase, width: "100%", opacity: fetchingOsm || isFinal ? 0.6 : 1 }}>{isFinal ? "Final (Geocode locked)" : fetchingOsm ? "Fetching…" : "Fetch OSM (Real)"}</button>
          <div style={{ marginTop: 10, fontSize: 12.5, lineHeight: 1.5 }}>
            <div><strong>Formatted:</strong> {osmInfo?.formatted_address ?? "—"}</div>
            <div><strong>County:</strong> {osmInfo?.county ?? "—"}</div>
            <div><strong>Lat/Lng:</strong> {osmInfo?.lat != null && osmInfo?.lng != null ? `${osmInfo.lat}, ${osmInfo.lng}` : "—"}</div>
          </div>
        </div>

        <div style={sectionCard}>
          <div style={{ fontWeight: 800, marginBottom: 8, fontSize: 13 }}>Share Links</div>
          {!isFinal && <div style={{ fontSize: 12.5, color: "#6b7280", marginBottom: 10 }}>Sharing is enabled only after the report is <strong>FINAL</strong>.</div>}
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <button onClick={createShareLink} disabled={shareLoading || !isFinal} style={{ ...btnBase, opacity: shareLoading || !isFinal ? 0.6 : 1 }}>{shareLoading ? "Working…" : "Create Link"}</button>
            <button onClick={() => loadShares(id)} disabled={shareLoading} style={{ ...btnBase, opacity: shareLoading ? 0.6 : 1 }}>Refresh</button>
            <div style={{ marginLeft: "auto", fontSize: 12, color: "#6b7280", alignSelf: "center" }}>Total links: <strong>{shares.length}</strong></div>
          </div>
          {shareMsg && <div style={{ marginTop: 10, fontSize: 12.5 }}>{shareMsg}</div>}
          {shareErr && <div style={{ marginTop: 10, fontSize: 12.5, color: "#b91c1c" }}>❌ {shareErr}</div>}
          <div style={{ marginTop: 10, display: "grid", gap: 10 }}>
            {shares.length === 0 ? <div style={{ fontSize: 12.5, color: "#6b7280" }}>No share links yet.</div> : shares.map((s) => {
              const url = `${origin()}/share/${s.token}`;
              return (
                <div key={s.id} style={{ border: "1px solid #e5e7eb", borderRadius: 12, padding: 10 }}>
                  <div style={{ fontSize: 12, color: "#6b7280" }}>Created: {new Date(s.created_at).toLocaleString()} • <strong>Views:</strong> {s.views_count ?? 0}</div>
                  <div style={{ marginTop: 8, fontSize: 12, background: "#f8fafc", border: "1px solid #e5e7eb", borderRadius: 10, padding: "8px 10px", wordBreak: "break-all" }}>{url}</div>
                  <div style={{ display: "flex", gap: 8, marginTop: 8, flexWrap: "wrap" }}>
                    <button onClick={() => copyToClipboard(url)} style={{ ...btnBase, flex: 1 }}>Copy</button>
                    <a href={url} target="_blank" rel="noreferrer" style={{ ...btnBase, textDecoration: "none", color: "#111", textAlign: "center", flex: 1 }}>Open</a>
                    <button onClick={() => revokeShare(s.id)} disabled={shareLoading} style={{ ...btnDark, flex: 1 }}>REVOKE</button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      <div style={{ marginTop: 12, display: "grid", gap: 10 }}>
        <div style={sectionCard}>
          <div style={{ fontWeight: 800, marginBottom: 12, fontSize: 13 }}>Basic Property Details</div>
          <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr 1fr 1fr", gap: 8 }}>
            <input placeholder="Address" value={address} disabled={isFinal} onChange={(e) => setAddress(e.target.value)} style={inputStyle(isFinal)} />
            <input placeholder="City" value={city} disabled={isFinal} onChange={(e) => setCity(e.target.value)} style={inputStyle(isFinal)} />
            <input placeholder="State" value={stateUS} disabled={isFinal} onChange={(e) => setStateUS(e.target.value)} style={inputStyle(isFinal)} />
            <input placeholder="ZIP" value={zip} disabled={isFinal} onChange={(e) => setZip(e.target.value)} style={inputStyle(isFinal)} />
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 8, marginTop: 8 }}>
            <input type="number" placeholder="Beds" value={beds} disabled={isFinal} onChange={(e) => setBeds(e.target.value === "" ? "" : Number(e.target.value))} style={inputStyle(isFinal)} />
            <input type="number" step="0.5" placeholder="Baths" value={baths} disabled={isFinal} onChange={(e) => setBaths(e.target.value === "" ? "" : Number(e.target.value))} style={inputStyle(isFinal)} />
            <input type="number" placeholder="Sqft" value={livingArea} disabled={isFinal} onChange={(e) => setLivingArea(e.target.value === "" ? "" : Number(e.target.value))} style={inputStyle(isFinal)} />
            <input type="number" placeholder="Year Built" value={yearBuilt} disabled={isFinal} onChange={(e) => setYearBuilt(e.target.value === "" ? "" : Number(e.target.value))} style={inputStyle(isFinal)} />
          </div>
        </div>

        <div style={sectionCard}>
          <div style={{ fontWeight: 800, marginBottom: 12, fontSize: 13 }}>Property Description</div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
            <div><div style={labelStyle}>Property Type</div><select value={reportData.propertyDescription.propertyType ?? ""} disabled={isFinal} onChange={(e) => updateReportData("propertyDescription.propertyType", e.target.value || undefined)} style={inputStyle(isFinal)}><option value="">—</option><option value="single_family">Single Family</option><option value="condo">Condo</option><option value="townhouse">Townhouse</option></select></div>
            <div><div style={labelStyle}>Condition</div><input placeholder="Average / Good / Fair" value={reportData.propertyDescription.condition ?? ""} disabled={isFinal} onChange={(e) => updateReportData("propertyDescription.condition", e.target.value)} style={inputStyle(isFinal)} /></div>
          </div>
          <div style={{ marginTop: 10 }}><div style={labelStyle}>Additional Improvements</div><textarea placeholder="Notes about improvements, renovations, upgrades…" value={reportData.propertyDescription.additionalImprovements ?? ""} disabled={isFinal} onChange={(e) => updateReportData("propertyDescription.additionalImprovements", e.target.value)} style={{ ...inputStyle(isFinal), minHeight: 85 }} /></div>
        </div>

        <div style={sectionCard}>
          <div style={{ fontWeight: 800, marginBottom: 12, fontSize: 13 }}>Neighborhood Overview</div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
            <div><div style={labelStyle}>Market Conditions</div><select value={reportData.neighborhoodOverview.marketConditions ?? ""} disabled={isFinal} onChange={(e) => updateReportData("neighborhoodOverview.marketConditions", e.target.value || undefined)} style={inputStyle(isFinal)}><option value="">—</option><option value="stable">Stable</option><option value="rising">Rising</option><option value="declining">Declining</option></select></div>
            <div><div style={labelStyle}>Zoning</div><input placeholder="e.g., R-1" value={reportData.neighborhoodOverview.zoning ?? ""} disabled={isFinal} onChange={(e) => updateReportData("neighborhoodOverview.zoning", e.target.value)} style={inputStyle(isFinal)} /></div>
          </div>
          <div style={{ marginTop: 10 }}><div style={labelStyle}>Neighborhood Description</div><textarea placeholder="Describe neighborhood, location influences, trends…" value={reportData.neighborhoodOverview.neighborhoodDescription ?? ""} disabled={isFinal} onChange={(e) => updateReportData("neighborhoodOverview.neighborhoodDescription", e.target.value)} style={{ ...inputStyle(isFinal), minHeight: 95 }} /></div>
          <div style={{ marginTop: 10 }}><div style={labelStyle}>Access to Services</div><textarea placeholder="Schools, transportation, shopping, amenities…" value={reportData.neighborhoodOverview.accessToServices ?? ""} disabled={isFinal} onChange={(e) => updateReportData("neighborhoodOverview.accessToServices", e.target.value)} style={{ ...inputStyle(isFinal), minHeight: 75 }} /></div>
        </div>

        <div style={sectionCard}>
          <div style={{ fontWeight: 800, marginBottom: 12, fontSize: 13 }}>Valuation Summary</div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: 8, marginBottom: 10 }}>
            <div><div style={labelStyle}>Calculated Estimate</div><div style={{ fontWeight: 900 }}>{money(valuation.estimatedValue)}</div></div>
            <div><div style={labelStyle}>Calculated Range</div><div>{valuation.estimatedLow ? `${money(valuation.estimatedLow)} - ${money(valuation.estimatedHigh)}` : "—"}</div></div>
            <div><div style={labelStyle}>External Estimate</div><div style={{ fontWeight: 900 }}>{money(valuation.externalEstimate)}</div></div>
            <div><div style={labelStyle}>Final Value Used</div><div style={{ fontWeight: 900 }}>{money(valuation.finalValue ?? valuation.adjustedValue ?? valuation.externalEstimate ?? valuation.estimatedValue)}</div></div>
            <div><div style={labelStyle}>Source</div><div>{valuation.valueSource || (valuation.adjustedValue ? "Appraiser Adjusted" : valuation.externalEstimate ? "External Lookup" : valuation.estimatedValue ? "Internal Valuation" : "—")}</div></div>
          </div>
          <div style={{ marginBottom: 10 }}>
            <div style={labelStyle}>Appraiser Adjusted Value (optional)</div>
            <input
              type="number"
              placeholder="Enter final value if appraiser overrides the calculated estimate"
              value={valuation.adjustedValue ?? ""}
              disabled={isFinal}
              onChange={(e) => {
                const val = e.target.value === "" ? null : Number(e.target.value);
                updateReportData("valuationSummary.adjustedValue", val);
                updateReportData("valuationSummary.finalValue", val ?? valuation.externalEstimate ?? valuation.estimatedValue ?? null);
                updateReportData("valuationSummary.valueSource", val ? "Appraiser Adjusted" : valuation.externalEstimate ? "External Lookup" : "Internal Valuation");
              }}
              style={inputStyle(isFinal)}
            />
            <div style={{ marginTop: 6, fontSize: 12, color: "#6b7280" }}>The adjusted value is the value that will be treated as the final appraiser-supported value in the report narrative.</div>
          </div>
          <div><div style={labelStyle}>Intended Use</div><select value={reportData.valuationSummary.intendedUse ?? ""} disabled={isFinal} onChange={(e) => updateReportData("valuationSummary.intendedUse", e.target.value || undefined)} style={inputStyle(isFinal)}><option value="">—</option><option value="mortgage">Mortgage</option><option value="legal">Legal</option><option value="internal">Internal</option></select></div>
          <div style={{ marginTop: 10 }}><div style={labelStyle}>Valuation Commentary</div><textarea placeholder="Write your valuation narrative here…" value={reportData.valuationSummary.valuationCommentary ?? ""} disabled={isFinal} onChange={(e) => updateReportData("valuationSummary.valuationCommentary", e.target.value)} style={{ ...inputStyle(isFinal), minHeight: 120 }} /></div>
          <div style={{ marginTop: 10 }}><div style={labelStyle}>Limiting Conditions</div><textarea placeholder="Any limiting conditions / assumptions…" value={reportData.valuationSummary.limitingConditions ?? ""} disabled={isFinal} onChange={(e) => updateReportData("valuationSummary.limitingConditions", e.target.value)} style={{ ...inputStyle(isFinal), minHeight: 85 }} /></div>
          {valuation.valuationMethod && <div style={{ marginTop: 10, fontSize: 12, color: "#6b7280" }}><strong>Internal Method:</strong> {valuation.valuationMethod}</div>}
          {valuation.externalMessage && <div style={{ marginTop: 10, fontSize: 12, color: "#6b7280" }}><strong>External Message:</strong> {valuation.externalMessage}</div>}
        </div>

        <div style={sectionCard}>
          <div style={{ fontWeight: 800, marginBottom: 12, fontSize: 13 }}>Appraiser Declaration</div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
            <div><div style={labelStyle}>Appraiser Name</div><input placeholder="Full name" value={reportData.appraiserDeclaration.appraiserName ?? ""} disabled={isFinal} onChange={(e) => updateReportData("appraiserDeclaration.appraiserName", e.target.value)} style={inputStyle(isFinal)} /></div>
            <div><div style={labelStyle}>License Number</div><input placeholder="License #" value={reportData.appraiserDeclaration.licenseNumber ?? ""} disabled={isFinal} onChange={(e) => updateReportData("appraiserDeclaration.licenseNumber", e.target.value)} style={inputStyle(isFinal)} /></div>
            <div><div style={labelStyle}>Effective Date</div><input type="date" value={reportData.appraiserDeclaration.effectiveDate ?? ""} disabled={isFinal} onChange={(e) => updateReportData("appraiserDeclaration.effectiveDate", e.target.value)} style={inputStyle(isFinal)} /></div>
            <div><div style={labelStyle}>Signature Text</div><input placeholder="e.g., /s/ John Doe" value={reportData.appraiserDeclaration.signatureText ?? ""} disabled={isFinal} onChange={(e) => updateReportData("appraiserDeclaration.signatureText", e.target.value)} style={inputStyle(isFinal)} /></div>
          </div>
        </div>

        <div style={{ ...sectionCard, border: "2px solid #111" }}>
          <div style={{ fontWeight: 900, marginBottom: 8, fontSize: 14 }}>Final actions</div>
          <div style={{ fontSize: 12.5, color: "#6b7280", marginBottom: 10 }}>Review all sections before saving or finalizing. Finalized reports become locked.</div>
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
            <button onClick={saveReport} disabled={saving || isFinal} style={{ ...btnDark, opacity: saving || isFinal ? 0.6 : 1 }}>{isFinal ? "Final (Locked)" : saving ? "Saving…" : "Save Report"}</button>
            <button onClick={finalizeReport} disabled={isFinal || finalizing} style={{ ...btnBase, opacity: isFinal || finalizing ? 0.6 : 1 }}>{isFinal ? "Already Final" : finalizing ? "Finalizing…" : "Finalize Report"}</button>
            <button onClick={() => router.push("/")} style={btnBase}>Back to Dashboard</button>
          </div>
        </div>
      </div>
    </div>
  );
}
