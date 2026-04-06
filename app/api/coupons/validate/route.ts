import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createServerAdminClient } from "@/app/lib/supabaseServer";

const ValidateSchema = z.object({
  code: z.string().min(1).max(20),
});

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const parsed = ValidateSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { valid: false, status: "invalid", reason: "잘못된 쿠폰 코드 형식입니다." },
        { status: 400 }
      );
    }

    const code = parsed.data.code.toUpperCase().trim();
    const supabase = createServerAdminClient();

    const { data: coupon, error } = await supabase
      .from("coupons")
      .select("*")
      .eq("code", code)
      .single();

    if (error || !coupon) {
      // Log the failed validate attempt
      await supabase.from("redeem_logs").insert({
        coupon_id: null,
        code,
        action_type: "validate",
        reason: "not_found",
      });
      return NextResponse.json({
        valid: false,
        status: "not_found",
        reason: "존재하지 않는 쿠폰입니다.",
      });
    }

    // Log validate action
    await supabase.from("redeem_logs").insert({
      coupon_id: coupon.id,
      code,
      action_type: "validate",
      reason: coupon.status,
    });

    if (coupon.status === "used") {
      return NextResponse.json({
        valid: false,
        status: "used",
        reason: "이미 사용된 쿠폰입니다.",
        coupon: {
          code: coupon.code,
          discountAmount: coupon.discount_amount,
          redeemedAt: coupon.redeemed_at,
          redeemedStoreId: coupon.redeemed_store_id,
        },
      });
    }

    if (coupon.status === "expired" || new Date(coupon.expires_at) < new Date()) {
      return NextResponse.json({
        valid: false,
        status: "expired",
        reason: "만료된 쿠폰입니다.",
        coupon: {
          code: coupon.code,
          discountAmount: coupon.discount_amount,
          expiresAt: coupon.expires_at,
        },
      });
    }

    return NextResponse.json({
      valid: true,
      status: "unused",
      coupon: {
        id: coupon.id,
        code: coupon.code,
        discountAmount: coupon.discount_amount,
        rewardType: coupon.reward_type,
        expiresAt: coupon.expires_at,
        issuedAt: coupon.issued_at,
      },
    });
  } catch (err) {
    console.error("[coupons/validate] Unexpected error:", err);
    return NextResponse.json(
      { valid: false, status: "error", reason: "서버 오류가 발생했습니다." },
      { status: 500 }
    );
  }
}
