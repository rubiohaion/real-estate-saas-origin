"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";

type ReportData = {
  propertyIdentification?: { enteredAddress?: string; verifiedAddress?: string; county?: string; city?: string; state?: string; zip?: string };
  propertyDescription?: { propertyType?: string; bedrooms?: number; bathrooms?: number; sqft?: number; yearBuilt?: number; condition?: string; additionalImprovements?: string };
  neighborhoodOverview?: { marketConditions?: string; zoning?: string; neighborhoodDescription?: string; accessToServices?: string };
  valuationSummary?: { intendedUse?: string; valuationCommentary?: string; limitingConditions?: string; estimatedValue?: number; adjustedValue?: number | null; finalValue?: number | null; valueSource?: string };
  appraiserDeclaration?: { appraiserName?: string; licenseNumber?: string; effectiveDate?: string; signatureText?: string; company?: string; phone?: string; title?: string; licenseState?: string; yearsOfExperience?: string; specialization?: string; businessAddress?: string; logoUrl?: string };
};

type ReportRow = { id: string; status: string | null; created_at: string; report_data: ReportData | null; address?: string | null; city?: string | null; state?: string | null; zip?: string | null };

function isFinalStatus(status: any) { const s = (status ?? "").toString().trim().toLowerCase(); return s === "final" || s.includes("final") || ["finished", "completed", "complete", "done"].includes(s); }
function text(v?: any) { if (v === null || v === undefined) return "—"; const s = v.toString().trim(); return s || "—"; }
function textBlock(v?: any) { const s = (v ?? "").toString().trim(); return s ? s : "—"; }
function money(v?: number | null) { if (v === null || v === undefined || Number.isNaN(Number(v))) return "—"; return `$${Math.round(Number(v)).toLocaleString()}`; }
function pretty(v?: string) { return text((v ?? "").replace(/_/g, " ").replace(/\b\w/g, (m) => m.toUpperCase())); }

export default function SharedReportPage() {
  const { token } = useParams<{ token: string }>();
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [report, setReport] = useState<ReportRow | null>(null);

  useEffect(() => {
    (async () => {
      setLoading(true); setErr(null);
      try {
        const res = await fetch(`/api/share/${token}`, { cache: "no-store" });
        const json = await res.json();
        if (!res.ok) { setErr(json?.error || "Share link not found"); setReport(null); }
        else setReport(json?.data?.report ?? null);
      } catch { setErr("Network error"); setReport(null); }
      finally { setLoading(false); }
    })();
  }, [token]);

  const rd = report?.report_data ?? {};
  const pi = rd.propertyIdentification ?? {};
  const pd = rd.propertyDescription ?? {};
  const no = rd.neighborhoodOverview ?? {};
  const vs = rd.valuationSummary ?? {};
  const ad = rd.appraiserDeclaration ?? {};
  const finalOpinion = vs.finalValue ?? vs.adjustedValue ?? vs.estimatedValue ?? null;
  const createdDate = useMemo(() => { try { return report?.created_at ? new Date(report.created_at).toLocaleDateString() : "—"; } catch { return "—"; } }, [report?.created_at]);

  if (loading) return <div style={{ padding: 32 }}>Loading…</div>;
  if (!report || err) return <div style={{ padding: 32, fontFamily: "Arial" }}><strong>Link unavailable</strong><div style={{ color: "#b91c1c", marginTop: 8 }}>{err ?? "—"}</div></div>;

  const pageStyle: React.CSSProperties = { maxWidth: 900, margin: "0 auto", background: "white", padding: "44px 56px", borderRadius: 12, boxShadow: "0 1px 10px rgba(0,0,0,0.12)", fontFamily: "Arial, Helvetica, sans-serif", color: "#111" };
  const sectionBox: React.CSSProperties = { border: "1px solid #e5e7eb", borderRadius: 12, padding: 16, marginBottom: 14 };
  const sectionTitle: React.CSSProperties = { fontSize: 13, letterSpacing: 0.6, textTransform: "uppercase", margin: "0 0 10px 0", fontWeight: 900 };
  const tableStyle: React.CSSProperties = { width: "100%", borderCollapse: "collapse" };
  const rowStyle: React.CSSProperties = { borderTop: "1px solid #f1f5f9" };
  const labelCell: React.CSSProperties = { width: 220, padding: "10px 8px 10px 0", fontSize: 12, color: "#6b7280", verticalAlign: "top", fontWeight: 800 };
  const valueCell: React.CSSProperties = { padding: "10px 0", fontSize: 13, color: "#111827", verticalAlign: "top" };
  const blockLabel: React.CSSProperties = { fontSize: 12, color: "#6b7280", fontWeight: 800, marginBottom: 6 };
  const blockText: React.CSSProperties = { fontSize: 13, lineHeight: 1.65, whiteSpace: "pre-wrap", color: "#111827" };
  const btn: React.CSSProperties = { padding: "10px 14px", border: "1px solid #ccc", borderRadius: 10, background: "white", cursor: "pointer", fontWeight: 800 };

  return (
    <>
      <style>{`@media print { body { background: white !important; } .no-print { display: none !important; } .page { box-shadow: none !important; border-radius: 0 !important; } @page { margin: 14mm; } }`}</style>
      <div style={{ background: "#e5e7eb", minHeight: "100vh", padding: 28 }}>
        <div className="page" style={pageStyle}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 14, marginBottom: 20 }}>
            <div>
              {ad.logoUrl ? <img src={ad.logoUrl} alt="Appraiser logo" style={{ maxHeight: 64, maxWidth: 220, objectFit: "contain", marginBottom: 14 }} /> : <div style={{ width: 180, height: 52, border: "1px dashed #d1d5db", borderRadius: 10, display: "flex", alignItems: "center", justifyContent: "center", color: "#9ca3af", fontSize: 12, marginBottom: 14 }}>Logo</div>}
              <div style={{ fontSize: 27, fontWeight: 900 }}>Residential Appraisal Report</div>
              <div style={{ marginTop: 6, fontSize: 12, color: "#6b7280", lineHeight: 1.5 }}><div><strong>Report ID:</strong> {report.id}</div><div><strong>Created:</strong> {createdDate}</div><div><strong>Status:</strong> FINAL</div></div>
            </div>
            <div style={{ textAlign: "right", fontSize: 12, color: "#4b5563", lineHeight: 1.5 }}><div style={{ fontWeight: 900, fontSize: 15, color: "#111" }}>{text(ad.company || "Shamaot")}</div><div>{text(ad.appraiserName)}</div><div>{text(ad.title)}</div><div>{ad.licenseNumber ? `License #${ad.licenseNumber}` : ""}</div></div>
          </div>

          <div style={sectionBox}><div style={sectionTitle}>Property Identification</div><table style={tableStyle}><tbody><tr style={rowStyle}><td style={labelCell}>Address</td><td style={valueCell}>{text(pi.enteredAddress || [report.address, report.city, report.state, report.zip].filter(Boolean).join(", "))}</td></tr><tr style={rowStyle}><td style={labelCell}>Verified Address</td><td style={valueCell}>{text(pi.verifiedAddress)}</td></tr><tr style={rowStyle}><td style={labelCell}>County</td><td style={valueCell}>{text(pi.county)}</td></tr></tbody></table></div>
          <div style={sectionBox}><div style={sectionTitle}>Property Description</div><table style={tableStyle}><tbody><tr style={rowStyle}><td style={labelCell}>Property Type</td><td style={valueCell}>{pretty(pd.propertyType)}</td></tr><tr style={rowStyle}><td style={labelCell}>Beds / Baths</td><td style={valueCell}>{text(pd.bedrooms)} / {text(pd.bathrooms)}</td></tr><tr style={rowStyle}><td style={labelCell}>Gross Living Area</td><td style={valueCell}>{pd.sqft ? `${Number(pd.sqft).toLocaleString()} sqft` : "—"}</td></tr><tr style={rowStyle}><td style={labelCell}>Year Built</td><td style={valueCell}>{text(pd.yearBuilt)}</td></tr><tr style={rowStyle}><td style={labelCell}>Condition</td><td style={valueCell}>{pretty(pd.condition)}</td></tr></tbody></table><div style={{ marginTop: 12 }}><div style={blockLabel}>Additional Improvements</div><div style={blockText}>{textBlock(pd.additionalImprovements)}</div></div></div>
          <div style={sectionBox}><div style={sectionTitle}>Market Conditions & Neighborhood</div><table style={tableStyle}><tbody><tr style={rowStyle}><td style={labelCell}>Market Conditions</td><td style={valueCell}>{pretty(no.marketConditions)}</td></tr><tr style={rowStyle}><td style={labelCell}>Purpose of Appraisal</td><td style={valueCell}>{pretty(vs.intendedUse)}</td></tr><tr style={rowStyle}><td style={labelCell}>Zoning</td><td style={valueCell}>{text(no.zoning)}</td></tr></tbody></table><div style={{ marginTop: 12 }}><div style={blockLabel}>Neighborhood Description</div><div style={blockText}>{textBlock(no.neighborhoodDescription)}</div></div><div style={{ marginTop: 12 }}><div style={blockLabel}>Access to Services</div><div style={blockText}>{textBlock(no.accessToServices)}</div></div></div>
          <div style={sectionBox}><div style={sectionTitle}>Valuation Commentary</div><div style={blockText}>{textBlock(vs.valuationCommentary)}</div><div style={{ marginTop: 14 }}><div style={blockLabel}>Limiting Conditions</div><div style={blockText}>{textBlock(vs.limitingConditions)}</div></div></div>
          <div style={sectionBox}><div style={sectionTitle}>Appraiser Declaration</div><table style={tableStyle}><tbody><tr style={rowStyle}><td style={labelCell}>Appraiser</td><td style={valueCell}>{text(ad.appraiserName)}</td></tr><tr style={rowStyle}><td style={labelCell}>License</td><td style={valueCell}>{text(ad.licenseNumber)} {ad.licenseState ? `(${ad.licenseState})` : ""}</td></tr><tr style={rowStyle}><td style={labelCell}>Experience / Specialization</td><td style={valueCell}>{[ad.yearsOfExperience, ad.specialization].filter(Boolean).join(" / ") || "—"}</td></tr><tr style={rowStyle}><td style={labelCell}>Business Address</td><td style={valueCell}>{text(ad.businessAddress)}</td></tr><tr style={rowStyle}><td style={labelCell}>Effective Date</td><td style={valueCell}>{text(ad.effectiveDate)}</td></tr><tr style={rowStyle}><td style={labelCell}>Signature</td><td style={valueCell}>{text(ad.signatureText)}</td></tr></tbody></table></div>
          <div style={{ border: "2px solid #111", borderRadius: 14, padding: 18, marginTop: 18, textAlign: "center" }}><div style={{ fontSize: 12, color: "#6b7280", fontWeight: 900, textTransform: "uppercase", letterSpacing: 0.8 }}>Final Opinion of Value</div><div style={{ fontSize: 34, fontWeight: 900, marginTop: 6 }}>{money(finalOpinion)}</div></div>
          <div style={{ marginTop: 18, fontSize: 11, color: "#6b7280" }}>Generated by Shamaot • Confidential • {new Date().toLocaleDateString()}</div>
          <div className="no-print" style={{ display: "flex", gap: 12, marginTop: 18, flexWrap: "wrap" }}><button onClick={() => window.print()} style={btn}>Print / Save PDF</button></div>
        </div>
      </div>
    </>
  );
}
