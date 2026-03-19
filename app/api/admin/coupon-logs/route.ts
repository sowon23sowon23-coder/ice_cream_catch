import { NextRequest, NextResponse } from "next/server";
import { createServerClient, verifyAdminToken } from "@/app/lib/supabaseServer";

export async function GET(req: NextRequest) {
  if (!verifyAdminToken(req.headers.get("authorization"))) {
    return NextResponse.json({ error: "인증이 필요합니다." }, { status: 401 });
  }

  const params = req.nextUrl.searchParams;
  const page = Math.max(1, parseInt(params.get("page") ?? "1"));
  const limit = Math.min(100, Math.max(1, parseInt(params.get("limit") ?? "20")));
  const actionType = params.get("action_type");
  const storeId = params.get("store_id");
  const offset = (page - 1) * limit;

  try {
    const supabase = createServerClient();

    let query = supabase
      .from("redeem_logs")
      .select("*", { count: "exact" })
      .order("created_at", { ascending: false })
      .range(offset, offset + limit - 1);

    if (actionType) query = query.eq("action_type", actionType);
    if (storeId) query = query.eq("store_id", storeId);

    const { data: rows, error, count } = await query;

    if (error) throw error;

    return NextResponse.json({
      rows: rows ?? [],
      total: count ?? 0,
      page,
      limit,
      totalPages: Math.ceil((count ?? 0) / limit),
    });
  } catch (err) {
    console.error("[admin/coupon-logs] Error:", err);
    return NextResponse.json(
      { error: "로그를 불러오는 중 오류가 발생했습니다." },
      { status: 500 }
    );
  }
}
