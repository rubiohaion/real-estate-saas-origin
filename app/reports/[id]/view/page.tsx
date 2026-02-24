"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

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

type ReportRow = {
  id: string;
  status: string;
  created_at: string;
  report_data: ReportData | null;
};

function isFinalStatus(status: any) {
  const s = (status ?? "").toString().trim().toLowerCase();
  if (!s) return false;
  if (s === "final") return true;
  if (s.includes("final")) return true;
  if (s === "finished") return true;
  if (s === "completed") return true;
  if (s === "complete") return true;
  if (s === "done") return true;
  return false;
}

function text(v?: any) {
  if (v === null || v === undefined) return "—";
  const s = v.toString().trim();
  return s || "—";
}

function textBlock(v?: any) {
  const s = (v ?? "").toString().trim();
  return s ? s : "—";
}

export default function ReportViewPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [report, setReport] = useState<ReportRow | null>(null);

  // Share UI
  const [shareLoading, setShareLoading] = useState(false);
  const [shareError, setShareError] = useState<string | null>(null);
  const [shareToken, setShareToken] = useState<string | null>(null);
  const [shareUrl, setShareUrl] = useState<string | null>(null);
  const [toast, setToast] = useState<{ type: "ok" | "err"; text: string } | null>(
    null
  );

  function showToast(type: "ok" | "err", text: string) {
    setToast({ type, text });
    setTimeout(() => setToast(null), 1800);
  }

  useEffect(() => {
    (async () => {
      const { data: session } = await supabase.auth.getSession();
      if (!session.session) {
        router.replace("/login");
        return;
      }

      const { data, error } = await supabase
        .from("reports")
        .select("id,status,created_at,report_data")
        .eq("id", id)
        .single();

      if (error || !data) {
        router.replace("/");
        return;
      }

      if (!isFinalStatus((data as any).status)) {
        router.replace(`/reports/${id}`);
        return;
      }

      setReport(data as ReportRow);
      setLoading(false);
    })();
  }, [id, router]);

  const rd = report?.report_data ?? {};
  const pi = rd.propertyIdentification ?? {};
  const pd = rd.propertyDescription ?? {};
  const no = rd.neighborhoodOverview ?? {};
  const vs = rd.valuationSummary ?? {};
  const ad = rd.appraiserDeclaration ?? {};

  const createdDate = useMemo(() => {
    if (!report) return "—";
    try {
      return new Date(report.created_at).toLocaleDateString();
    } catch {
      return "—";
    }
  }, [report]);

  async function copyToClipboard(value: string) {
    try {
      await navigator.clipboard.writeText(value);
      showToast("ok", "Copied");
    } catch {
      showToast("err", "Could not copy");
    }
  }

  async function createShareLink() {
    if (!report) return;

    setShareLoading(true);
    setShareError(null);

    try {
      const token =
        typeof crypto !== "undefined" && "randomUUID" in crypto
          ? (crypto as any).randomUUID()
          : `${Date.now()}-${Math.random().toString(16).slice(2)}`;

      const { error } = await supabase.from("report_shares").insert({
        token,
        report_id: report.id,
      });

      if (error) {
        setShareError(error.message);
        showToast("err", "Share failed");
        setShareLoading(false);
        return;
      }

      const url = `${window.location.origin}/share/${token}`;
      setShareToken(token);
      setShareUrl(url);
      await copyToClipboard(url);
      showToast("ok", "Share link created");
      setShareLoading(false);
    } catch {
      setShareError("Share creation failed");
      showToast("err", "Share failed");
      setShareLoading(false);
    }
  }

  async function revokeShareLink() {
    if (!shareToken) return;

    setShareLoading(true);
    setShareError(null);

    try {
      const { error } = await supabase
        .from("report_shares")
        .delete()
        .eq("token", shareToken);

      if (error) {
        setShareError(error.message);
        showToast("err", "Revoke failed");
        setShareLoading(false);
        return;
      }

      setShareToken(null);
      setShareUrl(null);
      showToast("ok", "Revoked");
      setShareLoading(false);
    } catch {
      setShareError("Revoke failed");
      showToast("err", "Revoke failed");
      setShareLoading(false);
    }
  }

  if (loading || !report) return <div style={{ padding: 32 }}>Loading…</div>;

  // ---------- Styles ----------
  const pageStyle = {
    maxWidth: 900,
    margin: "0 auto",
    background: "white",
    padding: "46px 56px",
    borderRadius: 12,
    boxShadow: "0 1px 10px rgba(0,0,0,0.12)",
    fontFamily: "Arial, Helvetica, sans-serif",
    color: "#111",
  } as const;

  const sectionTitle = {
    fontSize: 14,
    letterSpacing: 0.6,
    textTransform: "uppercase" as const,
    margin: "0 0 10px 0",
  };

  const sectionBox = {
    border: "1px solid #e5e7eb",
    borderRadius: 12,
    padding: 16,
    marginBottom: 14,
  } as const;

  const tableStyle = { width: "100%", borderCollapse: "collapse" as const };
  const rowStyle = { borderTop: "1px solid #f1f5f9" };
  const labelCell = {
    width: 220,
    padding: "10px 8px 10px 0",
    fontSize: 12,
    color: "#6b7280",
    verticalAlign: "top" as const,
    fontWeight: 700,
  };
  const valueCell = {
    padding: "10px 0",
    fontSize: 13,
    color: "#111827",
    verticalAlign: "top" as const,
  };

  const blockLabel = {
    fontSize: 12,
    color: "#6b7280",
    fontWeight: 700,
    marginBottom: 6,
  } as const;

  const blockText = {
    fontSize: 13,
    lineHeight: 1.65,
    whiteSpace: "pre-wrap" as const,
    color: "#111827",
  } as const;

  // Buttons
  const btnBase: React.CSSProperties = {
    padding: "10px 14px",
    borderRadius: 999,
    border: "1px solid #e5e7eb",
    background: "white",
    cursor: "pointer",
    fontSize: 13,
    fontWeight: 700,
    lineHeight: 1,
    display: "inline-flex",
    alignItems: "center",
    gap: 8,
    transition: "transform 0.06s ease, opacity 0.15s ease",
  };

  const btnPrimary: React.CSSProperties = {
    ...btnBase,
    border: "1px solid #111",
    background: "#111",
    color: "white",
  };

  const btnDanger: React.CSSProperties = {
    ...btnBase,
    border: "1px solid #ef4444",
    color: "#b91c1c",
    background: "white",
  };

  const pill: React.CSSProperties = {
    padding: "8px 10px",
    borderRadius: 999,
    border: "1px solid #e5e7eb",
    background: "#f8fafc",
    fontSize: 12,
    color: "#111",
    maxWidth: 420,
    overflow: "hidden",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap",
  };

  return (
    <>
      <style>{`
        @media print {
          body { background: white !important; }
          .no-print { display: none !important; }
          .page { box-shadow: none !important; border-radius: 0 !important; }
          @page { margin: 14mm; }
          .footer { position: fixed; bottom: 8mm; left: 0; right: 0; }
        }
        .btn:hover { transform: translateY(-1px); }
        .btn:active { transform: translateY(0px); opacity: 0.9; }
      `}</style>

      <div style={{ background: "#e5e7eb", minHeight: "100vh", padding: 28 }}>
        <div className="page" style={pageStyle}>
          {/* Toast */}
          {toast && (
            <div
              className="no-print"
              style={{
                position: "fixed",
                top: 16,
                left: "50%",
                transform: "translateX(-50%)",
                padding: "10px 14px",
                borderRadius: 999,
                border: "1px solid #e5e7eb",
                background: "white",
                boxShadow: "0 8px 24px rgba(0,0,0,0.12)",
                fontSize: 13,
                fontWeight: 800,
                color: toast.type === "ok" ? "#16a34a" : "#b91c1c",
                zIndex: 50,
              }}
            >
              {toast.type === "ok" ? "✅ " : "❌ "}
              {toast.text}
            </div>
          )}

          {/* Header */}
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "flex-start",
              gap: 14,
              marginBottom: 18,
            }}
          >
            <div>
              <div style={{ fontSize: 26, fontWeight: 800, margin: 0 }}>
                Residential Appraisal Report
              </div>
              <div style={{ marginTop: 6, fontSize: 12, color: "#6b7280" }}>
                <div>
                  <strong>Report ID:</strong> {report.id}
                </div>
                <div>
                  <strong>Created:</strong> {createdDate}
                </div>
                <div>
                  <strong>Status:</strong> FINAL
                </div>
              </div>
            </div>

            <div style={{ textAlign: "right" }}>
              <div style={{ fontWeight: 800, fontSize: 14 }}>Shamaot</div>
              <div style={{ fontSize: 12, color: "#6b7280", marginTop: 2 }}>
                Confidential Appraisal Document
              </div>

              <div
                style={{
                  marginTop: 10,
                  display: "inline-block",
                  padding: "6px 10px",
                  borderRadius: 999,
                  border: "1px solid #e5e7eb",
                  fontSize: 12,
                  color: "#111",
                  background: "#f8fafc",
                }}
              >
                FINAL
              </div>
            </div>
          </div>

          {/* Property Identification */}
          <div style={sectionBox}>
            <div style={sectionTitle}>Property Identification</div>
            <table style={tableStyle}>
              <tbody>
                <tr style={rowStyle}>
                  <td style={labelCell}>Entered Address</td>
                  <td style={valueCell}>{text(pi.enteredAddress)}</td>
                </tr>
                <tr style={rowStyle}>
                  <td style={labelCell}>Verified Address (OSM)</td>
                  <td style={valueCell}>{text(pi.verifiedAddress)}</td>
                </tr>
                <tr style={rowStyle}>
                  <td style={labelCell}>County (OSM)</td>
                  <td style={valueCell}>{text(pi.county)}</td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* Property Description */}
          <div style={sectionBox}>
            <div style={sectionTitle}>Property Description</div>
            <table style={tableStyle}>
              <tbody>
                <tr style={rowStyle}>
                  <td style={labelCell}>Property Type</td>
                  <td style={valueCell}>{text(pd.propertyType)}</td>
                </tr>
                <tr style={rowStyle}>
                  <td style={labelCell}>Bedrooms</td>
                  <td style={valueCell}>{text(pd.bedrooms)}</td>
                </tr>
                <tr style={rowStyle}>
                  <td style={labelCell}>Bathrooms</td>
                  <td style={valueCell}>{text(pd.bathrooms)}</td>
                </tr>
                <tr style={rowStyle}>
                  <td style={labelCell}>Gross Living Area (Sqft)</td>
                  <td style={valueCell}>{text(pd.sqft)}</td>
                </tr>
                <tr style={rowStyle}>
                  <td style={labelCell}>Year Built</td>
                  <td style={valueCell}>{text(pd.yearBuilt)}</td>
                </tr>
                <tr style={rowStyle}>
                  <td style={labelCell}>Condition</td>
                  <td style={valueCell}>{text(pd.condition)}</td>
                </tr>
              </tbody>
            </table>

            <div style={{ marginTop: 12 }}>
              <div style={blockLabel}>Additional Improvements</div>
              <div style={blockText}>{textBlock(pd.additionalImprovements)}</div>
            </div>
          </div>

          {/* Neighborhood Overview */}
          <div style={sectionBox}>
            <div style={sectionTitle}>Neighborhood Overview</div>
            <table style={tableStyle}>
              <tbody>
                <tr style={rowStyle}>
                  <td style={labelCell}>Market Conditions</td>
                  <td style={valueCell}>{text(no.marketConditions)}</td>
                </tr>
                <tr style={rowStyle}>
                  <td style={labelCell}>Zoning</td>
                  <td style={valueCell}>{text(no.zoning)}</td>
                </tr>
              </tbody>
            </table>

            <div style={{ marginTop: 12 }}>
              <div style={blockLabel}>Neighborhood Description</div>
              <div style={blockText}>{textBlock(no.neighborhoodDescription)}</div>
            </div>

            <div style={{ marginTop: 12 }}>
              <div style={blockLabel}>Access to Services</div>
              <div style={blockText}>{textBlock(no.accessToServices)}</div>
            </div>
          </div>

          {/* Valuation Summary */}
          <div style={sectionBox}>
            <div style={sectionTitle}>Valuation Summary</div>
            <table style={tableStyle}>
              <tbody>
                <tr style={rowStyle}>
                  <td style={labelCell}>Intended Use</td>
                  <td style={valueCell}>{text(vs.intendedUse)}</td>
                </tr>
              </tbody>
            </table>

            <div style={{ marginTop: 12 }}>
              <div style={blockLabel}>Valuation Commentary</div>
              <div style={blockText}>{textBlock(vs.valuationCommentary)}</div>
            </div>

            <div style={{ marginTop: 12 }}>
              <div style={blockLabel}>Limiting Conditions</div>
              <div style={blockText}>{textBlock(vs.limitingConditions)}</div>
            </div>
          </div>

          {/* Appraiser Declaration */}
          <div style={sectionBox}>
            <div style={sectionTitle}>Appraiser Declaration</div>
            <table style={tableStyle}>
              <tbody>
                <tr style={rowStyle}>
                  <td style={labelCell}>Appraiser Name</td>
                  <td style={valueCell}>{text(ad.appraiserName)}</td>
                </tr>
                <tr style={rowStyle}>
                  <td style={labelCell}>License Number</td>
                  <td style={valueCell}>{text(ad.licenseNumber)}</td>
                </tr>
                <tr style={rowStyle}>
                  <td style={labelCell}>Effective Date</td>
                  <td style={valueCell}>{text(ad.effectiveDate)}</td>
                </tr>
                <tr style={rowStyle}>
                  <td style={labelCell}>Signature</td>
                  <td style={valueCell}>{text(ad.signatureText)}</td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* Footer */}
          <div className="footer" style={{ marginTop: 18, fontSize: 11, color: "#6b7280" }}>
            Generated by Shamaot • Confidential • {new Date().toLocaleDateString()}
          </div>

          {/* Actions */}
          <div
            className="no-print"
            style={{
              marginTop: 18,
              display: "flex",
              flexDirection: "column",
              gap: 12,
            }}
          >
            {/* Row 1: main actions */}
            <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
              <button className="btn" onClick={() => router.push("/")} style={btnBase}>
                ← Dashboard
              </button>

              <button className="btn" onClick={() => window.print()} style={btnBase}>
                Print / PDF
              </button>

              <button
                className="btn"
                onClick={createShareLink}
                disabled={shareLoading}
                style={{
                  ...btnPrimary,
                  opacity: shareLoading ? 0.75 : 1,
                  cursor: shareLoading ? "not-allowed" : "pointer",
                }}
              >
                {shareLoading ? "Creating…" : "Create Share Link"}
              </button>

              {shareUrl && (
                <button className="btn" onClick={revokeShareLink} style={btnDanger}>
                  Revoke
                </button>
              )}
            </div>

            {/* Row 2: link display */}
            {shareUrl && (
              <div
                style={{
                  display: "flex",
                  gap: 10,
                  alignItems: "center",
                  flexWrap: "wrap",
                }}
              >
                <div style={pill} title={shareUrl}>
                  {shareUrl}
                </div>

                <button className="btn" onClick={() => copyToClipboard(shareUrl)} style={btnBase}>
                  Copy
                </button>

                <a
                  href={shareUrl}
                  target="_blank"
                  rel="noreferrer"
                  style={{
                    ...btnBase,
                    textDecoration: "none",
                    color: "#111",
                  }}
                >
                  Open
                </a>
              </div>
            )}

            {/* Error line */}
            {shareError && (
              <div style={{ fontSize: 12, color: "#b91c1c" }}>❌ {shareError}</div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}

