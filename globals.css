import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const runtime = "nodejs";

export async function GET(
  _req: Request,
  { params }: { params: { token: string } }
) {
  try {
    const token = (params?.token ?? "").toString().trim();

    if (!token) {
      return NextResponse.json({ error: "Share token missing" }, { status: 400 });
    }

    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!url) {
      return NextResponse.json(
        { error: "Server is missing NEXT_PUBLIC_SUPABASE_URL" },
        { status: 500 }
      );
    }

    if (!serviceKey) {
      return NextResponse.json(
        { error: "Server is missing SUPABASE_SERVICE_ROLE_KEY" },
        { status: 500 }
      );
    }

    const supabaseAdmin = createClient(url, serviceKey, {
      auth: { persistSession: false },
    });

    // 1) Find share by token
    const { data: share, error: shareErr } = await supabaseAdmin
      .from("report_shares")
      .select("id, token, report_id, owner_id, created_at, views_count")
      .eq("token", token)
      .maybeSingle();

    if (shareErr || !share) {
      return NextResponse.json({ error: "Share link not found" }, { status: 404 });
    }

    // 2) Increment views_count (best-effort)
    await supabaseAdmin
      .from("report_shares")
      .update({ views_count: (share.views_count ?? 0) + 1 })
      .eq("id", share.id);

    // 3) Load report
    const { data: report, error: repErr } = await supabaseAdmin
      .from("reports")
      .select("id,status,created_at,report_data,address,city,state,zip")
      .eq("id", share.report_id)
      .maybeSingle();

    if (repErr || !report) {
      return NextResponse.json({ error: "Report not found" }, { status: 404 });
    }

    return NextResponse.json({
      data: {
        share: {
          id: share.id,
          token: share.token,
          created_at: share.created_at,
          views_count: (share.views_count ?? 0) + 1,
        },
        report,
      },
    });
  } catch {
    return NextResponse.json({ error: "Bad request" }, { status: 400 });
  }
}

