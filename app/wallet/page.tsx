"use client";

import Link from "next/link";
import { Suspense, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import AdBanner from "@/app/components/AdBanner";
import { formatDate, formatDiscount, isCouponExpired } from "@/app/lib/couponUtils";
import { supabase } from "@/app/lib/supabaseClient";

type WalletCoupon = {
  id: number;
  code: string;
  discountAmount: number;
  rewardType: string;
  status: string;
  issuedAt: string;
  expiresAt: string;
  redeemedAt?: string | null;
};

const STATUS_STYLES: Record<string, string> = {
  unused: "bg-green-100 text-green-700",
  used: "bg-gray-200 text-gray-700",
  expired: "bg-red-100 text-red-600",
};

function WalletPageContent() {
  const params = useSearchParams();
  const [userId, setUserId] = useState("");
  const [coupons, setCoupons] = useState<WalletCoupon[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const fromQuery = (params.get("userId") || "").trim();
    const fromStorage = typeof window !== "undefined" ? (localStorage.getItem("nickname") || "").trim() : "";
    const nextUserId = fromQuery || fromStorage;

    if (!nextUserId) {
      setError("지갑을 불러오려면 닉네임이 필요합니다.");
      setLoading(false);
      return;
    }

    setUserId(nextUserId);

    supabase
      .from("coupons")
      .select("id, code, discount_amount, reward_type, status, issued_at, expires_at, redeemed_at")
      .eq("user_id", nextUserId)
      .order("issued_at", { ascending: false })
      .then(({ data, error }) => {
        if (error) {
          setError("지갑을 불러오지 못했습니다.");
          return;
        }
        setCoupons(
          (data ?? []).map((c) => ({
            id: c.id,
            code: c.code,
            discountAmount: c.discount_amount,
            rewardType: c.reward_type,
            status: c.status,
            issuedAt: c.issued_at,
            expiresAt: c.expires_at,
            redeemedAt: c.redeemed_at,
          }))
        );
      })
      .catch(() => setError("지갑을 불러오지 못했습니다."))
      .finally(() => setLoading(false));
  }, [params]);

  const summary = useMemo(() => {
    let usable = 0;
    for (const coupon of coupons) {
      if (coupon.status === "unused" && !isCouponExpired(coupon.expiresAt)) usable += 1;
    }
    return { total: coupons.length, usable };
  }, [coupons]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#fdf0f6]">
        <div className="text-center">
          <div className="mx-auto mb-4 h-12 w-12 rounded-full border-4 border-[#960853] border-t-transparent animate-spin" />
          <p className="font-medium text-[#960853]">지갑을 불러오는 중...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,#fff7fb_0%,#ffeaf5_35%,#f7d5e7_100%)] p-4">
      <div className="mx-auto max-w-xl">
        <div className="rounded-3xl border border-[#f3c6de] bg-white/90 p-5 shadow-[0_18px_42px_rgba(150,9,83,0.16)]">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.18em] text-[#960853]">My Wallet</p>
              <h1 className="mt-1 text-3xl font-black text-[#3f0a28]">쿠폰 지갑</h1>
              <p className="mt-1 text-sm font-semibold text-[#7f4a66]">
                {userId ? `${userId} 님의 쿠폰` : "내 쿠폰 목록"}
              </p>
            </div>
            <Link
              href="/"
              className="rounded-full border border-[#efbfd7] bg-white px-4 py-2 text-sm font-black text-[#960853]"
            >
              홈으로
            </Link>
          </div>

          <div className="mt-4 grid grid-cols-2 gap-3">
            <div className="rounded-2xl bg-[#fff3f9] p-4">
              <p className="text-xs font-black uppercase tracking-[0.14em] text-[#8d4b68]">Total</p>
              <p className="mt-1 text-3xl font-black text-[#4c1030]">{summary.total}</p>
            </div>
            <div className="rounded-2xl bg-[#eef9ec] p-4">
              <p className="text-xs font-black uppercase tracking-[0.14em] text-[#4d7e32]">Available</p>
              <p className="mt-1 text-3xl font-black text-[#2f5a19]">{summary.usable}</p>
            </div>
          </div>
        </div>

        {error ? (
          <div className="mt-4 rounded-3xl border border-[#f2bfd2] bg-white p-6 text-center shadow-sm">
            <p className="text-sm font-bold text-[#b42357]">{error}</p>
          </div>
        ) : coupons.length === 0 ? (
          <div className="mt-4 rounded-3xl border border-[#f2bfd2] bg-white p-6 text-center shadow-sm">
            <p className="text-lg font-black text-[#4c1030]">아직 발급된 쿠폰이 없습니다.</p>
            <p className="mt-2 text-sm font-semibold text-[#7f4a66]">
              Free Play에서 10점 이상을 받으면 쿠폰이 생깁니다.
            </p>
          </div>
        ) : (
          <div className="mt-4 space-y-3">
            {coupons.map((coupon) => {
              const expired = coupon.status === "expired" || isCouponExpired(coupon.expiresAt);
              const status = expired ? "expired" : coupon.status;
              return (
                <Link
                  key={coupon.id}
                  href={`/coupon?code=${coupon.code}`}
                  className="block rounded-3xl border border-[#f3c6de] bg-white p-5 shadow-[0_14px_28px_rgba(150,9,83,0.08)] transition hover:-translate-y-0.5"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-xs font-black uppercase tracking-[0.16em] text-[#960853]">
                        {formatDiscount(coupon.discountAmount)}
                      </p>
                      <p className="mt-1 font-mono text-lg font-black tracking-[0.18em] text-[#421129]">
                        {coupon.code}
                      </p>
                    </div>
                    <span className={`rounded-full px-3 py-1 text-xs font-black ${STATUS_STYLES[status] ?? STATUS_STYLES.unused}`}>
                      {status === "unused" ? "사용 가능" : status === "used" ? "사용 완료" : "만료"}
                    </span>
                  </div>

                  <div className="mt-4 grid grid-cols-2 gap-3 text-sm font-semibold text-[#6f4660]">
                    <div>
                      <p className="text-xs font-black uppercase tracking-[0.12em] text-[#a46a87]">발급일</p>
                      <p className="mt-1">{formatDate(coupon.issuedAt)}</p>
                    </div>
                    <div>
                      <p className="text-xs font-black uppercase tracking-[0.12em] text-[#a46a87]">만료일</p>
                      <p className="mt-1">{formatDate(coupon.expiresAt)}</p>
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        )}

        <AdBanner position="coupon" className="mt-4" />
      </div>
    </div>
  );
}

export default function WalletPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-[#fdf0f6]" />}>
      <WalletPageContent />
    </Suspense>
  );
}
