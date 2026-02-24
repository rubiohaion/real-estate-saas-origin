import { NextResponse } from "next/server";

export function GET() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";
  const service = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";

  return NextResponse.json({
    ok: true,
    route: "/api/geocode (GET debug)",
    env: {
      NEXT_PUBLIC_SUPABASE_URL: url ? "OK" : "MISSING",
      NEXT_PUBLIC_SUPABASE_ANON_KEY: anon ? "OK" : "MISSING",
      SUPABASE_SERVICE_ROLE_KEY: service ? "OK" : "MISSING",
    },
    lengths: {
      url: url.length,
      anon: anon.length,
      service: service.length,
    },
  });
}

export async function POST(req: Request) {
  try {
    const { query } = await req.json();

    if (!query) {
      return NextResponse.json({ error: "Missing query" }, { status: 400 });
    }

    const url =
      "https://nominatim.openstreetmap.org/search?" +
      new URLSearchParams({
        q: query,
        format: "json",
        addressdetails: "1",
        limit: "1",
      }).toString();

    const res = await fetch(url, {
      headers: {
        "User-Agent": "ShamaotMVP/1.0 (dev)",
        "Accept-Language": "en",
      },
      cache: "no-store",
    });

    if (!res.ok) {
      return NextResponse.json({ error: "OSM request failed" }, { status: 502 });
    }

    const results = await res.json();
    const first = results?.[0];

    if (!first) {
      return NextResponse.json({ error: "No results found" }, { status: 404 });
    }

    const county =
      first.address?.county ??
      first.address?.state_district ??
      first.address?.region ??
      null;

    return NextResponse.json({
      data: {
        formatted_address: first.display_name ?? null,
        place_id: first.place_id ? String(first.place_id) : null,
        lat: first.lat ? Number(first.lat) : null,
        lng: first.lon ? Number(first.lon) : null,
        county,
        raw_json: first,
        source: "osm",
      },
    });
  } catch {
    return NextResponse.json({ error: "Bad request" }, { status: 400 });
  }
}

