import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/app/lib/supabaseServer";

export async function GET(req: NextRequest) {
  try {
    const userId = (req.nextUrl.searchParams.get("userId") || "").trim();

    if (!userId) {
      return NextResponse.json({ error: "userId is required." }, { status: 400 });
    }

    const supabase = createServerClient();
    const { data, error } = await supabase
      .from("coupons")
      .select("id, code, discount_amount, reward_type, status, issued_at, expires_at, redeemed_at")
      .eq("user_id", userId)
      .order("issued_at", { ascending: false });

    if (error) {
      console.error("[coupons/wallet] DB error:", error);
      return NextResponse.json({ error: "Failed to load wallet." }, { status: 500 });
    }

    return NextResponse.json({
      coupons: (data || []).map((coupon) => ({
        id: coupon.id,
        code: coupon.code,
        discountAmount: coupon.discount_amount,
        rewardType: coupon.reward_type,
        status: coupon.status,
        issuedAt: coupon.issued_at,
        expiresAt: coupon.expires_at,
        redeemedAt: coupon.redeemed_at,
      })),
    });
  } catch (err) {
    console.error("[coupons/wallet] Unexpected error:", err);
    return NextResponse.json({ error: "Server error." }, { status: 500 });
  }
}
