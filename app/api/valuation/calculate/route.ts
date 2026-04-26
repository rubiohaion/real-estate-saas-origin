import { NextResponse } from "next/server";

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

function num(v: any) {
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

function currency(n: number) {
  return Math.round(n / 1000) * 1000;
}

function basePricePerSqft(state?: string, city?: string) {
  const s = (state ?? "").trim().toUpperCase();
  const c = (city ?? "").trim().toLowerCase();

  if (["CA", "NY", "MA", "WA"].includes(s)) return 475;
  if (["FL", "CO", "NJ", "VA", "MD"].includes(s)) return 310;
  if (["TX", "AZ", "NV", "NC", "GA"].includes(s)) return 235;
  if (["OH", "MI", "IN", "MO", "TN"].includes(s)) return 175;

  if (c.includes("san francisco") || c.includes("new york") || c.includes("los angeles")) return 650;
  if (c.includes("miami") || c.includes("seattle") || c.includes("boston")) return 430;
  if (c.includes("austin") || c.includes("denver") || c.includes("phoenix")) return 300;

  return 225;
}

function conditionMultiplier(condition?: string | null) {
  const c = (condition ?? "").toLowerCase();
  if (c.includes("excellent") || c.includes("renovated") || c.includes("new")) return 1.12;
  if (c.includes("good")) return 1.06;
  if (c.includes("fair") || c.includes("average")) return 1;
  if (c.includes("poor") || c.includes("needs") || c.includes("deferred")) return 0.88;
  return 1;
}

function ageMultiplier(yearBuilt?: number | null) {
  if (!yearBuilt) return 1;
  const age = new Date().getFullYear() - yearBuilt;
  if (age <= 5) return 1.08;
  if (age <= 15) return 1.04;
  if (age <= 35) return 1;
  if (age <= 60) return 0.96;
  return 0.91;
}

function propertyTypeMultiplier(propertyType?: string) {
  const t = (propertyType ?? "").toLowerCase();
  if (t.includes("condo")) return 0.92;
  if (t.includes("town")) return 0.96;
  return 1;
}

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as ValuationInput;
    const sqft = num(body.sqft);
    const bedrooms = num(body.bedrooms) ?? 0;
    const bathrooms = num(body.bathrooms) ?? 0;
    const yearBuilt = num(body.yearBuilt);

    if (!sqft || sqft <= 0) {
      return NextResponse.json(
        { error: "Sqft is required to calculate a valuation." },
        { status: 400 }
      );
    }

    const basePsf = basePricePerSqft(body.state, body.city);
    const bedroomAdjustment = bedrooms > 0 ? Math.min(bedrooms * 2500, 15000) : 0;
    const bathroomAdjustment = bathrooms > 0 ? Math.min(bathrooms * 3500, 17500) : 0;
    const multipliers =
      conditionMultiplier(body.condition) *
      ageMultiplier(yearBuilt) *
      propertyTypeMultiplier(body.propertyType);

    const rawEstimate = sqft * basePsf * multipliers + bedroomAdjustment + bathroomAdjustment;
    const estimate = currency(rawEstimate);
    const low = currency(estimate * 0.9);
    const high = currency(estimate * 1.1);
    const pricePerSqft = Math.round(estimate / sqft);

    return NextResponse.json({
      data: {
        estimate,
        low,
        high,
        pricePerSqft,
        confidence: "MVP estimate - use as a preliminary internal estimate only",
        method: "Rule-based MVP valuation using location, size, condition, age and property type adjustments.",
        assumptions: [
          `Base market rate used: $${basePsf}/sqft`,
          `Condition multiplier applied: ${conditionMultiplier(body.condition).toFixed(2)}`,
          `Age multiplier applied: ${ageMultiplier(yearBuilt).toFixed(2)}`,
          `Property type multiplier applied: ${propertyTypeMultiplier(body.propertyType).toFixed(2)}`,
        ],
      },
    });
  } catch {
    return NextResponse.json({ error: "Bad request" }, { status: 400 });
  }
}
