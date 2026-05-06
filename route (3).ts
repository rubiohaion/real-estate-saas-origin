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

function normalizeOsmResult(item: any) {
  const county =
    item?.address?.county ??
    item?.address?.state_district ??
    item?.address?.region ??
    null;

  return {
    formatted_address: item?.display_name ?? null,
    place_id: item?.place_id ? String(item.place_id) : null,
    lat: item?.lat ? Number(item.lat) : null,
    lng: item?.lon ? Number(item.lon) : null,
    county,
    address: item?.address ?? null,
    raw_json: item ?? null,
    source: "osm",
  };
}

export async function POST(req: Request) {
  try {
    const { query, limit = 1 } = await req.json();

    if (!query) {
      return NextResponse.json({ error: "Missing query" }, { status: 400 });
    }

    const safeLimit = Math.min(Math.max(Number(limit) || 1, 1), 5);
    const url =
      "https://nominatim.openstreetmap.org/search?" +
      new URLSearchParams({
        q: query,
        format: "json",
        addressdetails: "1",
        limit: String(safeLimit),
        countrycodes: "us",
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
    const normalized = Array.isArray(results) ? results.map(normalizeOsmResult) : [];
    const first = normalized[0];

    if (!first) {
      return NextResponse.json({ error: "No results found" }, { status: 404 });
    }

    return NextResponse.json({
      data: first,
      results: normalized,
    });
  } catch {
    return NextResponse.json({ error: "Bad request" }, { status: 400 });
  }
}
