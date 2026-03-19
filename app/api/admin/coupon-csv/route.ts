import { NextRequest, NextResponse } from "next/server";
import { createServerClient, verifyAdminToken } from "@/app/lib/supabaseServer";

function toCSV(rows: Record<string, unknown>[]): string {
  if (!rows.length) return "";
  const headers = Object.keys(rows[0]);
  const lines = [
    headers.join(","),
    ...rows.map((row) =>
      headers
        .map((h) => {
          const val = row[h] ?? "";
          const str = String(val).replace(/"/g, '""');
          return str.includes(",") || str.includes('"') || str.includes("\n")
            ? `"${str}"`
            : str;
        })
        .join(",")
    ),
  ];
  return "\uFEFF" + lines.join("\r\n"); // BOM for Excel Korean support
}

// GET /api/admin/coupon-csv?type=coupons|logs
export async function GET(req: NextRequest) {
  if (!verifyAdminToken(req.headers.get("authorization"))) {
    return NextResponse.json({ error: "인증이 필요합니다." }, { status: 401 });
  }

  const type = req.nextUrl.searchParams.get("type") ?? "coupons";
  const supabase = createServerClient();

  try {
    let rows: Record<string, unknown>[] = [];
    let filename = "";

    if (type === "logs") {
      const { data, error } = await supabase
        .from("redeem_logs")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(5000);
      if (error) throw error;
      rows = (data ?? []) as Record<string, unknown>[];
      filename = `redeem-logs-${new Date().toISOString().slice(0, 10)}.csv`;
    } else {
      const { data, error } = await supabase
        .from("coupons")
        .select("*")
        .order("issued_at", { ascending: false })
        .limit(5000);
      if (error) throw error;
      rows = (data ?? []) as Record<string, unknown>[];
      filename = `coupons-${new Date().toISOString().slice(0, 10)}.csv`;
    }

    const csv = toCSV(rows);
    return new NextResponse(csv, {
      status: 200,
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="${filename}"`,
      },
    });
  } catch (err) {
    console.error("[admin/coupon-csv] Error:", err);
    return NextResponse.json(
      { error: "CSV 생성 중 오류가 발생했습니다." },
      { status: 500 }
    );
  }
}
