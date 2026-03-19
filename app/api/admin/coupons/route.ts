import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createServerClient, verifyAdminToken } from "@/app/lib/supabaseServer";
import { generateCouponCode, getExpiresAt } from "@/app/lib/couponUtils";

// GET /api/admin/coupons — list coupons with filters and pagination
export async function GET(req: NextRequest) {
  if (!verifyAdminToken(req.headers.get("authorization"))) {
    return NextResponse.json({ error: "인증이 필요합니다." }, { status: 401 });
  }

  const params = req.nextUrl.searchParams;
  const page = Math.max(1, parseInt(params.get("page") ?? "1"));
  const limit = Math.min(100, Math.max(1, parseInt(params.get("limit") ?? "20")));
  const status = params.get("status");
  const search = params.get("search");
  const offset = (page - 1) * limit;

  try {
    const supabase = createServerClient();

    let query = supabase
      .from("coupons")
      .select("*", { count: "exact" })
      .order("issued_at", { ascending: false })
      .range(offset, offset + limit - 1);

    if (status && status !== "all") query = query.eq("status", status);
    if (search) query = query.ilike("code", `%${search}%`);

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
    console.error("[admin/coupons GET] Error:", err);
    return NextResponse.json(
      { error: "쿠폰 목록을 불러오는 중 오류가 발생했습니다." },
      { status: 500 }
    );
  }
}

const CreateCouponSchema = z.object({
  userId: z.string().max(200).optional(),
  discountAmount: z.number().int().min(0).max(100000),
  expiryDays: z.number().int().min(1).max(365).default(30),
  note: z.string().max(500).optional(),
});

// POST /api/admin/coupons — manually create a coupon
export async function POST(req: NextRequest) {
  if (!verifyAdminToken(req.headers.get("authorization"))) {
    return NextResponse.json({ error: "인증이 필요합니다." }, { status: 401 });
  }

  try {
    const body = await req.json();
    const parsed = CreateCouponSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "잘못된 요청입니다.", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const { userId, discountAmount, expiryDays, note } = parsed.data;
    const supabase = createServerClient();
    const expiresAt = getExpiresAt(expiryDays);

    let coupon = null;
    for (let attempt = 0; attempt < 5 && !coupon; attempt++) {
      const code = generateCouponCode();
      const { data, error } = await supabase
        .from("coupons")
        .insert({
          code,
          user_id: userId ?? null,
          reward_type: "discount",
          discount_amount: discountAmount,
          status: "unused",
          expires_at: expiresAt.toISOString(),
          ...(note ? { order_number: note } : {}),
        })
        .select()
        .single();

      if (!error) {
        coupon = data;
      } else if (error.code !== "23505") {
        throw error;
      }
    }

    if (!coupon) {
      return NextResponse.json(
        { error: "쿠폰 생성에 실패했습니다." },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true, coupon });
  } catch (err) {
    console.error("[admin/coupons POST] Error:", err);
    return NextResponse.json(
      { error: "쿠폰 생성 중 오류가 발생했습니다." },
      { status: 500 }
    );
  }
}
