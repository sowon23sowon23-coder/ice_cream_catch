import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createServerAdminClient } from "@/app/lib/supabaseServer";
import {
  generateCouponCode,
  getScoreTier,
  getExpiresAt,
} from "@/app/lib/couponUtils";

const IssueSchema = z.object({
  userId: z.string().max(200).optional(),
  score: z.number().int().min(0).max(999999),
});

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const parsed = IssueSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "잘못된 요청입니다.", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const { userId, score } = parsed.data;
    const tier = getScoreTier(score);

    if (!tier) {
      return NextResponse.json(
        { error: "쿠폰 발급 조건에 맞지 않습니다.", minScore: 50 },
        { status: 400 }
      );
    }

    const supabase = createServerAdminClient();
    const expiresAt = getExpiresAt(tier.expiryDays);

    // Retry up to 5 times on rare code collision
    let coupon = null;
    for (let attempt = 0; attempt < 5 && !coupon; attempt++) {
      const code = generateCouponCode();
      const { data, error } = await supabase
        .from("coupons")
        .insert({
          code,
          user_id: userId ?? null,
          reward_type: "discount",
          discount_amount: tier.discountAmount,
          status: "unused",
          expires_at: expiresAt.toISOString(),
        })
        .select()
        .single();

      if (!error) {
        coupon = data;
      } else if (error.code !== "23505") {
        // Not a unique violation — real error
        console.error("[coupons/issue] DB error:", error);
        return NextResponse.json(
          { error: "쿠폰 발급 중 오류가 발생했습니다." },
          { status: 500 }
        );
      }
    }

    if (!coupon) {
      return NextResponse.json(
        { error: "쿠폰 코드 생성에 실패했습니다. 다시 시도해주세요." },
        { status: 500 }
      );
    }

    const baseUrl =
      process.env.NEXT_PUBLIC_BASE_URL ||
      (process.env.VERCEL_URL
        ? `https://${process.env.VERCEL_URL}`
        : "http://localhost:3000");

    return NextResponse.json({
      success: true,
      coupon: {
        id: coupon.id,
        code: coupon.code,
        discountAmount: coupon.discount_amount,
        label: tier.label,
        status: coupon.status,
        expiresAt: coupon.expires_at,
        issuedAt: coupon.issued_at,
      },
      qrPayload: `${baseUrl}/redeem?code=${coupon.code}`,
    });
  } catch (err) {
    console.error("[coupons/issue] Unexpected error:", err);
    return NextResponse.json(
      { error: "서버 오류가 발생했습니다." },
      { status: 500 }
    );
  }
}
