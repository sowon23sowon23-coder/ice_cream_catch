import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createServerAdminClient, verifyStaffToken } from "@/app/lib/supabaseServer";

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
};

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: CORS_HEADERS });
}

const RedeemSchema = z.object({
  code: z.string().min(1).max(20),
  storeId: z.string().min(1).max(100),
  staffId: z.string().min(1).max(100),
  orderNumber: z.string().max(100).optional(),
});

const REASON_MESSAGES: Record<string, string> = {
  not_found: "존재하지 않는 쿠폰입니다.",
  already_used: "이미 사용된 쿠폰입니다.",
  expired: "만료된 쿠폰입니다.",
};

export async function POST(req: NextRequest) {
  if (!verifyStaffToken(req.headers.get("authorization"))) {
    return NextResponse.json({ error: "인증이 필요합니다." }, { status: 401, headers: CORS_HEADERS });
  }

  try {
    const body = await req.json();
    const parsed = RedeemSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { success: false, reason: "잘못된 요청입니다.", details: parsed.error.flatten() },
        { status: 400, headers: CORS_HEADERS }
      );
    }

    const { code, storeId, staffId, orderNumber } = parsed.data;
    const supabase = createServerAdminClient();

    // Atomic redemption via PostgreSQL stored procedure
    // Uses SELECT ... FOR UPDATE internally to prevent double-redemption
    const { data, error } = await supabase.rpc("redeem_coupon", {
      p_code: code.toUpperCase().trim(),
      p_store_id: storeId,
      p_staff_id: staffId,
      p_order_number: orderNumber ?? null,
    });

    if (error) {
      console.error("[coupons/redeem] RPC error:", error);
      return NextResponse.json(
        { success: false, reason: "서버 오류가 발생했습니다." },
        { status: 500, headers: CORS_HEADERS }
      );
    }

    const result = data as {
      success: boolean;
      reason?: string;
      coupon_id?: number;
      code?: string;
      discount_amount?: number;
      reward_type?: string;
      redeemed_at?: string;
    };

    if (!result.success) {
      return NextResponse.json(
        {
          success: false,
          status: result.reason,
          reason:
            REASON_MESSAGES[result.reason ?? ""] ||
            "사용할 수 없는 쿠폰입니다.",
        },
        { status: 409, headers: CORS_HEADERS }
      );
    }

    return NextResponse.json({
      success: true,
      message: "쿠폰이 성공적으로 사용 처리되었습니다.",
      couponId: result.coupon_id,
      code: result.code,
      discountAmount: result.discount_amount,
      rewardType: result.reward_type,
      redeemedAt: result.redeemed_at,
      storeId,
      staffId,
      orderNumber: orderNumber ?? null,
    }, { headers: CORS_HEADERS });
  } catch (err) {
    console.error("[coupons/redeem] Unexpected error:", err);
    return NextResponse.json(
      { success: false, reason: "서버 오류가 발생했습니다." },
      { status: 500, headers: CORS_HEADERS }
    );
  }
}
