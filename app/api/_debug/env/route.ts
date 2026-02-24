import { NextResponse } from "next/server";

export async function GET() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";
  const service = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";

  return NextResponse.json({
    ok: true,
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

