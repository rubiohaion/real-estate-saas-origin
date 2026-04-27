import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Body = {
  address?: string;
  city?: string;
  state?: string;
  zip?: string;
  propertyType?: string;
  bedrooms?: number | null;
  bathrooms?: number | null;
  sqft?: number | null;
};

function num(v: any): number | null {
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

function pickEstimate(json: any): number | null {
  return (
    num(json?.price) ??
    num(json?.value) ??
    num(json?.estimate) ??
    num(json?.estimatedValue) ??
    num(json?.valuation) ??
    num(json?.avm?.value) ??
    num(json?.avm?.estimate) ??
    num(json?.data?.price) ??
    num(json?.data?.value) ??
    num(json?.data?.estimate) ??
    null
  );
}

function pickLow(json: any): number | null {
  return (
    num(json?.priceRangeLow) ??
    num(json?.rangeLow) ??
    num(json?.low) ??
    num(json?.valueLow) ??
    num(json?.avm?.low) ??
    num(json?.data?.low) ??
    null
  );
}

function pickHigh(json: any): number | null {
  return (
    num(json?.priceRangeHigh) ??
    num(json?.rangeHigh) ??
    num(json?.high) ??
    num(json?.valueHigh) ??
    num(json?.avm?.high) ??
    num(json?.data?.high) ??
    null
  );
}

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as Body;
    const address = [body.address, body.city, body.state, body.zip]
      .filter(Boolean)
      .join(", ")
      .trim();

    if (!address) {
      return NextResponse.json({ error: "Address is required." }, { status: 400 });
    }

    const apiKey = process.env.RENTCAST_API_KEY;
    if (!apiKey) {
      return NextResponse.json({
        data: {
          source: "rentcast-not-configured",
          message: "RENTCAST_API_KEY is not configured in Vercel.",
          address,
          estimate: null,
          low: null,
          high: null,
          checkedAt: new Date().toISOString(),
          raw: null,
        },
      });
    }

    const params = new URLSearchParams({ address });
    if (body.propertyType) params.set("propertyType", body.propertyType);
    if (body.bedrooms != null) params.set("bedrooms", String(body.bedrooms));
    if (body.bathrooms != null) params.set("bathrooms", String(body.bathrooms));
    if (body.sqft != null) params.set("squareFootage", String(body.sqft));

    const url = `https://api.rentcast.io/v1/avm/value?${params.toString()}`;

    const res = await fetch(url, {
      method: "GET",
      headers: {
        "X-Api-Key": apiKey,
        Accept: "application/json",
      },
      cache: "no-store",
    });

    const json = await res.json().catch(() => null);

    if (!res.ok) {
      return NextResponse.json({
        data: {
          source: "rentcast",
          message: `RentCast lookup returned status ${res.status}. Check address, API key permissions, or plan access.`,
          status: res.status,
          address,
          estimate: null,
          low: null,
          high: null,
          checkedAt: new Date().toISOString(),
          raw: json,
        },
      });
    }

    const estimate = pickEstimate(json);
    const low = pickLow(json);
    const high = pickHigh(json);

    return NextResponse.json({
      data: {
        source: "rentcast",
        message: estimate
          ? "RentCast external market estimate saved and displayed."
          : "RentCast responded, but no numeric estimate was found for this address.",
        address,
        estimate,
        low,
        high,
        checkedAt: new Date().toISOString(),
        raw: json,
      },
    });
  } catch {
    return NextResponse.json({ error: "Bad request" }, { status: 400 });
  }
}
