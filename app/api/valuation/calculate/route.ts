import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type ValuationInput = {
  address?: string;
  city?: string;
  state?: string;
  zip?: string;
  propertyType?: string;
  sqft?: number | null;
  bedrooms?: number | null;
  bathrooms?: number | null;
  yearBuilt?: number | null;
  condition?: string | null;
};

type Adjustment = {
  label: string;
  value: number;
  note: string;
};

function num(v: any): number | null {
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

function roundToNearest(n: number, step = 1000) {
  return Math.round(n / step) * step;
}

function normalizeText(v?: string | null) {
  return (v ?? "").trim().toLowerCase();
}

function basePricePerSqft(state?: string, city?: string, zip?: string) {
  const s = (state ?? "").trim().toUpperCase();
  const c = normalizeText(city);
  const z = normalizeText(zip);

  // City overrides first. These are broad MVP assumptions, not verified market data.
  if (c.includes("beverly hills") || z === "90210" || z === "90211" || z === "90212") return 2450;
  if (c.includes("malibu") || z === "90265") return 2200;
  if (c.includes("santa monica") || z === "90402") return 1700;
  if (z === "90077" || z === "90049" || z === "90024" || z === "90272") return 1500;
  if (z === "10013" || z === "10012" || z === "10011" || z === "10023") return 1550;
  if (c.includes("san francisco")) return 1200;
  if (c.includes("new york") || c.includes("manhattan")) return 720;
  if (c.includes("los angeles")) return 850;
  if (c.includes("seattle") || c.includes("bellevue")) return 510;
  if (c.includes("boston") || c.includes("cambridge")) return 500;
  if (c.includes("miami") || c.includes("fort lauderdale")) return 425;
  if (c.includes("denver") || c.includes("boulder")) return 360;
  if (c.includes("austin")) return 340;
  if (c.includes("phoenix") || c.includes("scottsdale")) return 300;
  if (c.includes("atlanta")) return 245;
  if (c.includes("dallas") || c.includes("houston")) return 235;
  if (c.includes("cleveland") || c.includes("detroit") || c.includes("indianapolis")) return 165;

  // State-level fallback assumptions.
  if (["CA"].includes(s)) return 560;
  if (["NY", "MA", "WA"].includes(s)) return 460;
  if (["NJ", "CO", "DC", "MD", "VA"].includes(s)) return 335;
  if (["FL", "OR", "RI", "CT"].includes(s)) return 305;
  if (["TX", "AZ", "NV", "NC", "GA", "TN"].includes(s)) return 235;
  if (["OH", "MI", "IN", "MO", "KY", "AL", "SC"].includes(s)) return 175;
  if (["AR", "MS", "WV", "OK", "IA", "KS", "NE"].includes(s)) return 145;

  return 225;
}

function conditionFactor(condition?: string | null) {
  const c = normalizeText(condition);
  if (!c) return { factor: 1, note: "No condition input; neutral condition adjustment applied." };
  if (c.includes("excellent") || c.includes("fully renovated") || c.includes("new")) {
    return { factor: 1.13, note: "Excellent/renovated condition premium applied." };
  }
  if (c.includes("good") || c.includes("updated")) {
    return { factor: 1.06, note: "Good/updated condition premium applied." };
  }
  if (c.includes("average") || c.includes("fair")) {
    return { factor: 1, note: "Average/fair condition; neutral condition adjustment applied." };
  }
  if (c.includes("poor") || c.includes("deferred") || c.includes("needs") || c.includes("repair")) {
    return { factor: 0.88, note: "Deferred maintenance/repair condition discount applied." };
  }
  return { factor: 1, note: "Unrecognized condition description; neutral condition adjustment applied." };
}

function ageFactor(yearBuilt?: number | null) {
  if (!yearBuilt) return { factor: 1, age: null, note: "Year built missing; neutral age adjustment applied." };
  const age = Math.max(0, new Date().getFullYear() - yearBuilt);
  if (age <= 5) return { factor: 1.08, age, note: "Very recent construction premium applied." };
  if (age <= 15) return { factor: 1.04, age, note: "Newer property age premium applied." };
  if (age <= 35) return { factor: 1, age, note: "Typical age bracket; neutral age adjustment applied." };
  if (age <= 60) return { factor: 0.96, age, note: "Older property age discount applied." };
  return { factor: 0.91, age, note: "Substantial age discount applied; condition verification recommended." };
}

function propertyTypeFactor(propertyType?: string | null) {
  const t = normalizeText(propertyType);
  if (t.includes("condo")) return { factor: 0.92, note: "Condo property type adjustment applied." };
  if (t.includes("town")) return { factor: 0.96, note: "Townhouse property type adjustment applied." };
  if (t.includes("multi")) return { factor: 1.04, note: "Multi-unit / income-oriented property type adjustment applied." };
  return { factor: 1, note: "Single-family or unspecified property type; neutral property type adjustment applied." };
}

function sizeEfficiencyFactor(sqft: number) {
  // Smaller homes often show higher $/sf; very large homes often show lower $/sf.
  if (sqft < 900) return { factor: 1.07, note: "Small-home price-per-square-foot efficiency premium applied." };
  if (sqft <= 1800) return { factor: 1.02, note: "Typical residential size range; slight efficiency premium applied." };
  if (sqft <= 3200) return { factor: 1, note: "Standard size adjustment applied." };
  return { factor: 0.94, note: "Large-home diminishing price-per-square-foot adjustment applied." };
}

function roomAdjustment(bedrooms: number, bathrooms: number) {
  const bedAdj = Math.max(-7500, Math.min(15000, (bedrooms - 3) * 3500));
  const bathAdj = Math.max(-7000, Math.min(18000, (bathrooms - 2) * 5500));
  return { bedAdj, bathAdj };
}

function completenessScore(input: ValuationInput, sqft: number) {
  let score = 45;
  if (sqft > 0) score += 20;
  if (input.city && input.state) score += 10;
  if (input.bedrooms != null) score += 5;
  if (input.bathrooms != null) score += 5;
  if (input.yearBuilt != null) score += 5;
  if (input.condition) score += 5;
  if (input.propertyType) score += 5;
  return Math.max(0, Math.min(100, score));
}

function rangePct(confidenceScore: number) {
  if (confidenceScore >= 90) return 0.08;
  if (confidenceScore >= 75) return 0.1;
  if (confidenceScore >= 60) return 0.13;
  return 0.16;
}

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as ValuationInput;
    const sqft = num(body.sqft);
    const bedrooms = num(body.bedrooms) ?? 3;
    const bathrooms = num(body.bathrooms) ?? 2;
    const yearBuilt = num(body.yearBuilt);

    if (!sqft || sqft <= 0) {
      return NextResponse.json(
        { error: "Sqft is required to calculate an internal valuation." },
        { status: 400 }
      );
    }

    const basePsf = basePricePerSqft(body.state, body.city, body.zip);
    const condition = conditionFactor(body.condition);
    const age = ageFactor(yearBuilt);
    const propertyType = propertyTypeFactor(body.propertyType);
    const size = sizeEfficiencyFactor(sqft);
    const rooms = roomAdjustment(bedrooms, bathrooms);

    const adjustedPsf = basePsf * condition.factor * age.factor * propertyType.factor * size.factor;
    const baseValue = sqft * adjustedPsf;
    const rawEstimate = baseValue + rooms.bedAdj + rooms.bathAdj;
    const locationFloor = basePsf >= 1200 ? sqft * Math.max(basePsf * 0.96, 1500) : rawEstimate;
    const estimate = roundToNearest(Math.max(rawEstimate, locationFloor), 1000);
    const pricePerSqft = Math.round(estimate / sqft);
    const confidenceScore = completenessScore(body, sqft);
    const pct = rangePct(confidenceScore);
    const low = roundToNearest(estimate * (1 - pct), 1000);
    const high = roundToNearest(estimate * (1 + pct), 1000);

    const adjustments: Adjustment[] = [
      { label: "Base market rate", value: Math.round(basePsf), note: `Starting assumption: $${basePsf}/sqft for the selected market.` },
      { label: "Condition factor", value: Number(condition.factor.toFixed(3)), note: condition.note },
      { label: "Age factor", value: Number(age.factor.toFixed(3)), note: age.note },
      { label: "Property type factor", value: Number(propertyType.factor.toFixed(3)), note: propertyType.note },
      { label: "Size efficiency factor", value: Number(size.factor.toFixed(3)), note: size.note },
      { label: "Bedroom adjustment", value: rooms.bedAdj, note: "Applied relative to a typical 3-bedroom baseline." },
      { label: "Bathroom adjustment", value: rooms.bathAdj, note: "Applied relative to a typical 2-bathroom baseline." },
    ];

    const confidence =
      confidenceScore >= 85
        ? "Higher internal confidence - sufficient property inputs, but still requires verified comparable sales."
        : confidenceScore >= 70
        ? "Moderate internal confidence - use as a preliminary indication and verify with comparable sales."
        : "Limited internal confidence - key inputs are missing; use only as a rough starting point.";

    const method =
      "Professional internal valuation using location-based price-per-square-foot assumptions, property type, condition, age, size-efficiency and room-count adjustments. This is not an AVM and must be reconciled with verified comparable sales.";

    const suggestedNarrative =
      `The internal valuation model indicates a preliminary system value of $${estimate.toLocaleString()} ($${pricePerSqft}/sqft). The result reflects a base market assumption of $${basePsf}/sqft, adjusted for property type, size, age, condition, room configuration, and premium-market ZIP recognition where applicable. This indication is for internal support only and should be reconciled by the appraiser before the Final Opinion of Value is relied upon.`;

    return NextResponse.json({
      data: {
        source: "internal-professional-mvp",
        estimate,
        low,
        high,
        pricePerSqft,
        confidence,
        confidenceScore,
        method,
        suggestedNarrative,
        assumptions: adjustments.map((a) => a.note),
        adjustments,
        asOfDate: new Date().toISOString(),
        disclaimer:
          "Internal valuation is for draft support only. It is not an appraisal, AVM, broker price opinion, or substitute for appraiser judgment and market-supported comparable analysis.",
      },
    });
  } catch {
    return NextResponse.json({ error: "Bad request" }, { status: 400 });
  }
}
