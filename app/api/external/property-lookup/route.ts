import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Body = {
  address?: string;
  city?: string;
  state?: string;
  zip?: string;
};

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as Body;
    const address = [body.address, body.city, body.state, body.zip].filter(Boolean).join(", ").trim();

    if (!address) {
      return NextResponse.json({ error: "Address is required." }, { status: 400 });
    }

    const apiKey = process.env.RENTCAST_API_KEY;
    if (!apiKey) {
      return NextResponse.json({
        data: {
          source: "not-configured",
          message: "RENTCAST_API_KEY is not configured yet.",
          address,
          estimate: null,
          low: null,
          high: null,
        },
      });
    }

    const url =
      "https://api.rentcast.io/v1/value-estimate?" +
      new URLSearchParams({ address }).toString();

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
          message: "External lookup failed. Check API key, plan, or address formatting.",
          status: res.status,
          raw: json,
        },
      });
    }

    return NextResponse.json({
      data: {
        source: "rentcast",
        address,
        estimate: json?.price ?? json?.value ?? json?.estimate ?? null,
        low: json?.priceRangeLow ?? json?.low ?? null,
        high: json?.priceRangeHigh ?? json?.high ?? null,
        raw: json,
      },
    });
  } catch {
    return NextResponse.json({ error: "Bad request" }, { status: 400 });
  }
}
