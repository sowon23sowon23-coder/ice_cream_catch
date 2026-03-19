import { NextRequest, NextResponse } from "next/server";
import { createServerClient, verifyAdminToken } from "@/app/lib/supabaseServer";

export async function GET(req: NextRequest) {
  if (!verifyAdminToken(req.headers.get("authorization"))) {
    return NextResponse.json({ error: "인증이 필요합니다." }, { status: 401 });
  }

  try {
    const supabase = createServerClient();

    // Total counts by status
    const { data: statusCounts, error: statusErr } = await supabase
      .from("coupons")
      .select("status");

    if (statusErr) throw statusErr;

    const total = statusCounts?.length ?? 0;
    const used = statusCounts?.filter((c) => c.status === "used").length ?? 0;
    const unused = statusCounts?.filter((c) => c.status === "unused").length ?? 0;
    const expired = statusCounts?.filter((c) => c.status === "expired").length ?? 0;

    // Also count logically expired (status=unused but expires_at < now)
    const { count: logicallyExpired } = await supabase
      .from("coupons")
      .select("*", { count: "exact", head: true })
      .eq("status", "unused")
      .lt("expires_at", new Date().toISOString());

    // Daily stats for last 14 days
    const since = new Date();
    since.setDate(since.getDate() - 13);
    since.setHours(0, 0, 0, 0);

    const { data: dailyIssued } = await supabase
      .from("coupons")
      .select("issued_at")
      .gte("issued_at", since.toISOString());

    const { data: dailyRedeemed } = await supabase
      .from("coupons")
      .select("redeemed_at")
      .eq("status", "used")
      .gte("redeemed_at", since.toISOString());

    // Aggregate by date
    const dateMap: Record<string, { issued: number; redeemed: number }> = {};
    for (let i = 0; i < 14; i++) {
      const d = new Date(since);
      d.setDate(since.getDate() + i);
      const key = d.toISOString().slice(0, 10);
      dateMap[key] = { issued: 0, redeemed: 0 };
    }

    dailyIssued?.forEach((row) => {
      const key = row.issued_at.slice(0, 10);
      if (dateMap[key]) dateMap[key].issued++;
    });

    dailyRedeemed?.forEach((row) => {
      if (row.redeemed_at) {
        const key = row.redeemed_at.slice(0, 10);
        if (dateMap[key]) dateMap[key].redeemed++;
      }
    });

    const dailyStats = Object.entries(dateMap).map(([date, counts]) => ({
      date,
      ...counts,
    }));

    // Per-store redemption counts
    const { data: storeLogs } = await supabase
      .from("redeem_logs")
      .select("store_id")
      .eq("action_type", "redeem_success")
      .not("store_id", "is", null);

    const storeMap: Record<string, number> = {};
    storeLogs?.forEach((row) => {
      if (row.store_id) {
        storeMap[row.store_id] = (storeMap[row.store_id] ?? 0) + 1;
      }
    });
    const byStore = Object.entries(storeMap)
      .map(([storeId, count]) => ({ storeId, count }))
      .sort((a, b) => b.count - a.count);

    return NextResponse.json({
      total,
      used,
      unused,
      expired: expired + (logicallyExpired ?? 0),
      usageRate: total > 0 ? Math.round((used / total) * 100) : 0,
      dailyStats,
      byStore,
    });
  } catch (err) {
    console.error("[admin/coupon-stats] Error:", err);
    return NextResponse.json(
      { error: "통계를 불러오는 중 오류가 발생했습니다." },
      { status: 500 }
    );
  }
}
