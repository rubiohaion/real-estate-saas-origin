"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";

type ReportData = {
  propertyIdentification?: { enteredAddress?: string; verifiedAddress?: string; county?: string; city?: string; state?: string; zip?: string };
  propertyDescription?: { propertyType?: string; bedrooms?: number; bathrooms?: number; sqft?: number; yearBuilt?: number; condition?: string; additionalImprovements?: string };
  neighborhoodOverview?: { marketConditions?: string; zoning?: string; neighborhoodDescription?: string; accessToServices?: string };
  valuationSummary?: { intendedUse?: string; valuationCommentary?: string; limitingConditions?: string; estimatedValue?: number; estimatedLow?: number; estimatedHigh?: number; pricePerSqft?: number; confidence?: string; valuationMethod?: string; externalEstimate?: number | null; externalLow?: number | null; externalHigh?: number | null; externalSource?: string; externalMessage?: string; aiSource?: string; aiGeneratedAt?: string };
  appraiserDeclaration?: { appraiserName?: string; licenseNumber?: string; effectiveDate?: string; signatureText?: string };
};

type ApiResponse = {
  data?: { share?: any; report?: { id: string; status: string; created_at: string; report_data: ReportData | null; address?: string | null; city?: string | null; state?: string | null; zip?: string | null } };
  error?: string;
};

type ApiReport = NonNullable<ApiResponse["data"]>["report"];

function text(v?: any) {
  if (v === null || v === undefined) return "—";
  const s = v.toString().trim();
  return s || "—";
}

function textBlock(v?: any) {
  const s = (v ?? "").toString().trim();
  return s ? s : "—";
}

function money(v?: number | null) {
  if (v === null || v === undefined || Number.isNaN(v)) return "—";
  return `$${Math.round(v).toLocaleString()}`;
}

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
        const res = await fetch(`/api/share/${token}`, { cache: "no-store" });
        const json = (await res.json()) as ApiResponse;
        if (!res.ok) {
          setErr(json?.error || "Share link not found");
          setReport(null);
        } else {
          setReport(json?.data?.report ?? null);
        }
      } catch {
        setErr("Network error");
        setReport(null);
      } finally {
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
    try { return new Date(report.created_at).toLocaleDateString(); } catch { return "—"; }
  }, [report?.created_at]);

  if (loading) return <div style={{ padding: 32 }}>Loading…</div>;
  if (!report || err) {
    return <div style={{ padding: 32, fontFamily: "Arial, Helvetica, sans-serif" }}><div style={{ fontWeight: 800, fontSize: 18 }}>Link unavailable</div><div style={{ marginTop: 8, color: "#b91c1c" }}>{err ?? "—"}</div></div>;
  }

  const pageStyle: React.CSSProperties = { maxWidth: 900, margin: "0 auto", background: "white", padding: "46px 56px", borderRadius: 12, boxShadow: "0 1px 10px rgba(0,0,0,0.12)", fontFamily: "Arial, Helvetica, sans-serif", color: "#111" };
  const sectionBox: React.CSSProperties = { border: "1px solid #e5e7eb", borderRadius: 12, padding: 16, marginBottom: 14 };
  const sectionTitle: React.CSSProperties = { fontSize: 14, letterSpacing: 0.6, textTransform: "uppercase", margin: "0 0 10px 0", fontWeight: 800 };
  const tableStyle: React.CSSProperties = { width: "100%", borderCollapse: "collapse" };
  const rowStyle: React.CSSProperties = { borderTop: "1px solid #f1f5f9" };
  const labelCell: React.CSSProperties = { width: 220, padding: "10px 8px 10px 0", fontSize: 12, color: "#6b7280", verticalAlign: "top", fontWeight: 700 };
  const valueCell: React.CSSProperties = { padding: "10px 0", fontSize: 13, color: "#111827", verticalAlign: "top" };
  const blockLabel: React.CSSProperties = { fontSize: 12, color: "#6b7280", fontWeight: 700, marginBottom: 6 };
  const blockText: React.CSSProperties = { fontSize: 13, lineHeight: 1.65, whiteSpace: "pre-wrap", color: "#111827" };

  return (
    <>
      <style>{`@media print { body { background: white !important; } .no-print { display: none !important; } .page { box-shadow: none !important; border-radius: 0 !important; } @page { margin: 14mm; } }`}</style>
      <div style={{ background: "#e5e7eb", minHeight: "100vh", padding: 28 }}>
        <div className="page" style={pageStyle}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 14, marginBottom: 18 }}>
            <div>
              <div style={{ fontSize: 26, fontWeight: 800 }}>Residential Appraisal Report</div>
              <div style={{ marginTop: 6, fontSize: 12, color: "#6b7280" }}>
                <div><strong>Report ID:</strong> {report.id}</div>
                <div><strong>Created:</strong> {createdDate}</div>
                <div><strong>Status:</strong> FINAL</div>
                <div><strong>Shared Link:</strong> {text(token)}</div>
              </div>
            </div>
            <div style={{ textAlign: "right" }}><div style={{ fontWeight: 800, fontSize: 14 }}>Shamaot</div><div style={{ fontSize: 12, color: "#6b7280", marginTop: 2 }}>Shared (Read-Only)</div><div style={{ marginTop: 10, display: "inline-block", padding: "6px 10px", borderRadius: 999, border: "1px solid #e5e7eb", fontSize: 12 }}>FINAL</div></div>
          </div>

          <div style={sectionBox}><div style={sectionTitle}>Valuation Summary</div><table style={tableStyle}><tbody>
            <tr style={rowStyle}><td style={labelCell}>MVP Estimate</td><td style={valueCell}>{money(vs.estimatedValue)}</td></tr>
            <tr style={rowStyle}><td style={labelCell}>Estimated Range</td><td style={valueCell}>{vs.estimatedLow ? `${money(vs.estimatedLow)} - ${money(vs.estimatedHigh)}` : "—"}</td></tr>
            <tr style={rowStyle}><td style={labelCell}>Price per Sqft</td><td style={valueCell}>{vs.pricePerSqft ? `$${vs.pricePerSqft}` : "—"}</td></tr>
            <tr style={rowStyle}><td style={labelCell}>External Estimate</td><td style={valueCell}>{money(vs.externalEstimate)}</td></tr>
            <tr style={rowStyle}><td style={labelCell}>Intended Use</td><td style={valueCell}>{text(vs.intendedUse)}</td></tr>
          </tbody></table><div style={{ marginTop: 12 }}><div style={blockLabel}>Valuation Commentary</div><div style={blockText}>{textBlock(vs.valuationCommentary)}</div></div><div style={{ marginTop: 12 }}><div style={blockLabel}>Limiting Conditions</div><div style={blockText}>{textBlock(vs.limitingConditions)}</div></div></div>

          <div style={sectionBox}><div style={sectionTitle}>Property Identification</div><table style={tableStyle}><tbody><tr style={rowStyle}><td style={labelCell}>Entered Address</td><td style={valueCell}>{text(pi.enteredAddress || [report.address, report.city, report.state, report.zip].filter(Boolean).join(", "))}</td></tr><tr style={rowStyle}><td style={labelCell}>Verified Address (OSM)</td><td style={valueCell}>{text(pi.verifiedAddress)}</td></tr><tr style={rowStyle}><td style={labelCell}>County (OSM)</td><td style={valueCell}>{text(pi.county)}</td></tr></tbody></table></div>

          <div style={sectionBox}><div style={sectionTitle}>Property Description</div><table style={tableStyle}><tbody><tr style={rowStyle}><td style={labelCell}>Property Type</td><td style={valueCell}>{text(pd.propertyType)}</td></tr><tr style={rowStyle}><td style={labelCell}>Bedrooms</td><td style={valueCell}>{text(pd.bedrooms)}</td></tr><tr style={rowStyle}><td style={labelCell}>Bathrooms</td><td style={valueCell}>{text(pd.bathrooms)}</td></tr><tr style={rowStyle}><td style={labelCell}>Gross Living Area</td><td style={valueCell}>{text(pd.sqft)}</td></tr><tr style={rowStyle}><td style={labelCell}>Year Built</td><td style={valueCell}>{text(pd.yearBuilt)}</td></tr><tr style={rowStyle}><td style={labelCell}>Condition</td><td style={valueCell}>{text(pd.condition)}</td></tr></tbody></table><div style={{ marginTop: 12 }}><div style={blockLabel}>Additional Improvements</div><div style={blockText}>{textBlock(pd.additionalImprovements)}</div></div></div>

          <div style={sectionBox}><div style={sectionTitle}>Neighborhood Overview</div><table style={tableStyle}><tbody><tr style={rowStyle}><td style={labelCell}>Market Conditions</td><td style={valueCell}>{text(no.marketConditions)}</td></tr><tr style={rowStyle}><td style={labelCell}>Zoning</td><td style={valueCell}>{text(no.zoning)}</td></tr></tbody></table><div style={{ marginTop: 12 }}><div style={blockLabel}>Neighborhood Description</div><div style={blockText}>{textBlock(no.neighborhoodDescription)}</div></div><div style={{ marginTop: 12 }}><div style={blockLabel}>Access to Services</div><div style={blockText}>{textBlock(no.accessToServices)}</div></div></div>

          <div style={sectionBox}><div style={sectionTitle}>Appraiser Declaration</div><table style={tableStyle}><tbody><tr style={rowStyle}><td style={labelCell}>Appraiser Name</td><td style={valueCell}>{text(ad.appraiserName)}</td></tr><tr style={rowStyle}><td style={labelCell}>License Number</td><td style={valueCell}>{text(ad.licenseNumber)}</td></tr><tr style={rowStyle}><td style={labelCell}>Effective Date</td><td style={valueCell}>{text(ad.effectiveDate)}</td></tr><tr style={rowStyle}><td style={labelCell}>Signature</td><td style={valueCell}>{text(ad.signatureText)}</td></tr></tbody></table></div>

          <div style={{ marginTop: 18, fontSize: 11, color: "#6b7280" }}>Generated by Shamaot • Confidential • {new Date().toLocaleDateString()}</div>
          <div className="no-print" style={{ display: "flex", gap: 12, marginTop: 18 }}><button onClick={() => window.print()} style={{ padding: "10px 14px", border: "1px solid #ccc", borderRadius: 10, background: "white", cursor: "pointer" }}>Print / Save PDF</button></div>
        </div>
      </div>
    </>
  );
}
