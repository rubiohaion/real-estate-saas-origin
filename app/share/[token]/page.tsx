"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";

/* ================= TYPES ================= */

type ReportData = {
  propertyIdentification?: {
    enteredAddress?: string;
    verifiedAddress?: string;
    county?: string;
    city?: string;
    state?: string;
    zip?: string;
  };
  propertyDescription?: {
    propertyType?: string;
    bedrooms?: number;
    bathrooms?: number;
    sqft?: number;
    yearBuilt?: number;
    condition?: string;
    additionalImprovements?: string;
  };
  neighborhoodOverview?: {
    marketConditions?: string;
    zoning?: string;
    neighborhoodDescription?: string;
    accessToServices?: string;
  };
  valuationSummary?: {
    intendedUse?: string;
    valuationCommentary?: string;
    limitingConditions?: string;
  };
  appraiserDeclaration?: {
    appraiserName?: string;
    licenseNumber?: string;
    effectiveDate?: string;
    signatureText?: string;
  };
};

type ApiResponse = {
  data?: {
    share?: any;
    report?: {
      id: string;
      status: string;
      created_at: string;
      report_data: ReportData | null;
      address?: string | null;
      city?: string | null;
      state?: string | null;
      zip?: string | null;
    };
  };
  error?: string;
};

/* ✅ FIX ל-TypeScript */
type ApiReport = NonNullable<ApiResponse["data"]>["report"];

/* ================= HELPERS ================= */

function text(v?: any) {
  if (v === null || v === undefined) return "—";
  const s = v.toString().trim();
  return s || "—";
}

function textBlock(v?: any) {
  const s = (v ?? "").toString().trim();
  return s ? s : "—";
}

/* ================= PAGE ================= */

export default function SharedReportPage() {
  const { token } = useParams<{ token: string }>();

  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [report, setReport] = useState<ApiReport | null>(null);

  useEffect(() => {
    (async () => {
      setLoading(true);
      setErr(null);

      try {
        const res = await fetch(`/api/share/${token}`, {
          cache: "no-store",
        });

        const json = (await res.json()) as ApiResponse;

        if (!res.ok) {
          setErr(json?.error || "Share link not found");
          setReport(null);
          setLoading(false);
          return;
        }

        setReport(json?.data?.report ?? null);
        setLoading(false);
      } catch {
        setErr("Network error");
        setReport(null);
        setLoading(false);
      }
    })();
  }, [token]);

  const rd = report?.report_data ?? {};
  const pi = rd.propertyIdentification ?? {};
  const pd = rd.propertyDescription ?? {};
  const no = rd.neighborhoodOverview ?? {};
  const vs = rd.valuationSummary ?? {};
  const ad = rd.appraiserDeclaration ?? {};

  const createdDate = useMemo(() => {
    if (!report?.created_at) return "—";
    try {
      return new Date(report.created_at).toLocaleDateString();
    } catch {
      return "—";
    }
  }, [report?.created_at]);

  if (loading) return <div style={{ padding: 32 }}>Loading…</div>;

  if (!report || err) {
    return (
      <div style={{ padding: 32 }}>
        <div style={{ fontWeight: 800, fontSize: 18 }}>
          Link unavailable
        </div>
        <div style={{ marginTop: 8, color: "red" }}>
          {err ?? "—"}
        </div>
      </div>
    );
  }

  return (
    <div style={{ padding: 40, maxWidth: 900, margin: "0 auto" }}>
      <h1>Shared Report</h1>

      <div style={{ marginBottom: 20 }}>
        <div><strong>ID:</strong> {report.id}</div>
        <div><strong>Date:</strong> {createdDate}</div>
      </div>

      <hr />

      <h3>Property Identification</h3>
      <div>{text(pi.enteredAddress)}</div>
      <div>{text(pi.verifiedAddress)}</div>
      <div>{text(pi.county)}</div>

      <h3>Property Description</h3>
      <div>Type: {text(pd.propertyType)}</div>
      <div>Bedrooms: {text(pd.bedrooms)}</div>
      <div>Bathrooms: {text(pd.bathrooms)}</div>
      <div>Sqft: {text(pd.sqft)}</div>

      <h3>Neighborhood</h3>
      <div>{textBlock(no.neighborhoodDescription)}</div>

      <h3>Valuation</h3>
      <div>{textBlock(vs.valuationCommentary)}</div>

      <h3>Appraiser</h3>
      <div>{text(ad.appraiserName)}</div>
    </div>
  );
}
