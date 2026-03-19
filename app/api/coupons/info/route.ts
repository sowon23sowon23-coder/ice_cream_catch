import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/app/lib/supabaseServer";

// GET /api/coupons/info?code=XXXXXXXX
// Returns coupon details without logging (for user display page)
export async function GET(req: NextRequest) {
  const code = req.nextUrl.searchParams.get("code")?.toUpperCase().trim();

  if (!code) {
    return NextResponse.json(
      { error: "쿠폰 코드가 필요합니다." },
      { status: 400 }
    );
  }

  try {
    const supabase = createServerClient();
    const { data: coupon, error } = await supabase
      .from("coupons")
      .select(
        "id, code, discount_amount, reward_type, status, issued_at, expires_at, redeemed_at"
      )
      .eq("code", code)
      .single();

    if (error || !coupon) {
      return NextResponse.json(
        { error: "쿠폰을 찾을 수 없습니다." },
        { status: 404 }
      );
    }

    const baseUrl =
      process.env.NEXT_PUBLIC_BASE_URL ||
      (process.env.VERCEL_URL
        ? `https://${process.env.VERCEL_URL}`
        : "http://localhost:3000");

    return NextResponse.json({
      coupon: {
        id: coupon.id,
        code: coupon.code,
        discountAmount: coupon.discount_amount,
        rewardType: coupon.reward_type,
        status: coupon.status,
        issuedAt: coupon.issued_at,
        expiresAt: coupon.expires_at,
        redeemedAt: coupon.redeemed_at,
      },
      qrPayload: `${baseUrl}/redeem?code=${coupon.code}`,
    });
  } catch (err) {
    console.error("[coupons/info] Unexpected error:", err);
    return NextResponse.json(
      { error: "서버 오류가 발생했습니다." },
      { status: 500 }
    );
  }
}
