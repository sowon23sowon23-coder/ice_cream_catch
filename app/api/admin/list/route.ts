import { createClient } from "@supabase/supabase-js";
import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  const adminToken = process.env.ADMIN_PANEL_TOKEN;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;

  if (!adminToken || !serviceRoleKey || !supabaseUrl) {
    return NextResponse.json({ error: "Server is not configured." }, { status: 500 });
  }

  const authHeader = req.headers.get("authorization") || "";
  const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7).trim() : "";
  if (!token || token !== adminToken) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const store = (req.nextUrl.searchParams.get("store") || "").trim();

  const adminSupabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const buildQuery = (selectColumns: string, supportsStoreFilter: boolean) => {
    let query = adminSupabase
      .from("leaderboard_best_v2")
      .select(selectColumns)
      .order("updated_at", { ascending: false })
      .limit(5000);

    if (supportsStoreFilter && store && store !== "__ALL__") {
      query = query.eq("store", store);
    }

    return query;
  };

  const attempts = [
    { run: () => buildQuery("nickname_key,nickname_display,score,updated_at,character,store", true), hasStore: true },
    { run: () => buildQuery("nickname_key,nickname_display,score,updated_at,store", true), hasStore: true },
    { run: () => buildQuery("nickname_key,nickname_display,score,updated_at,character", false), hasStore: false },
    { run: () => buildQuery("nickname_key,nickname_display,score,updated_at", false), hasStore: false },
  ];

  let data: any[] | null = null;
  let error: { message?: string } | null = null;
  let supportsStore = false;

  for (const attempt of attempts) {
    const result = await attempt.run();
    if (!result.error) {
      data = (result.data as any[] | null) ?? [];
      error = null;
      supportsStore = attempt.hasStore;
      break;
    }
    error = result.error as { message?: string };
  }

  if (error) {
    return NextResponse.json({ error: "Failed to load leaderboard records.", details: error.message }, { status: 500 });
  }

  return NextResponse.json({ rows: data ?? [], supportsStore });
}
