"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import QRCode from "qrcode";
import { formatDate, formatDiscount } from "@/app/lib/couponUtils";
import Link from "next/link";
import AdBanner from "@/app/components/AdBanner";

interface CouponInfo {
  id: number;
  code: string;
  discountAmount: number;
  rewardType: string;
  status: string;
  issuedAt: string;
  expiresAt: string;
  redeemedAt?: string;
}

const STATUS_LABEL: Record<string, { text: string; color: string }> = {
  unused: { text: "사용 가능", color: "text-green-600" },
  used: { text: "사용 완료", color: "text-gray-500" },
  expired: { text: "만료됨", color: "text-red-500" },
};

function CouponPageContent() {
  const params = useSearchParams();
  const code = params.get("code")?.toUpperCase() ?? "";

  const [coupon, setCoupon] = useState<CouponInfo | null>(null);
  const [qrDataUrl, setQrDataUrl] = useState<string>("");
  const [qrPayload, setQrPayload] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>("");

  useEffect(() => {
    if (!code) {
      setError("쿠폰 코드가 없습니다.");
      setLoading(false);
      return;
    }

    fetch(`/api/coupons/info?code=${encodeURIComponent(code)}`)
      .then((r) => r.json())
      .then((data) => {
        if (data.error) {
          setError(data.error);
        } else {
          setCoupon(data.coupon);
          setQrPayload(data.qrPayload);
        }
      })
      .catch(() => setError("쿠폰 정보를 불러오는 중 오류가 발생했습니다."))
      .finally(() => setLoading(false));
  }, [code]);

  useEffect(() => {
    if (!qrPayload) return;
    QRCode.toDataURL(qrPayload, {
      width: 240,
      margin: 2,
      color: { dark: "#1a1a1a", light: "#ffffff" },
    })
      .then(setQrDataUrl)
      .catch(console.error);
  }, [qrPayload]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#fdf0f6]">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-[#960853] border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-[#960853] font-medium">쿠폰 불러오는 중...</p>
        </div>
      </div>
    );
  }

  if (error || !coupon) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#fdf0f6] p-4">
        <div className="bg-white rounded-3xl shadow-lg p-8 text-center max-w-sm w-full">
          <div className="text-5xl mb-4">😕</div>
          <h2 className="text-xl font-bold text-gray-800 mb-2">
            쿠폰을 찾을 수 없어요
          </h2>
          <p className="text-gray-500 text-sm mb-6">
            {error || "유효하지 않은 쿠폰입니다."}
          </p>
          <Link
            href="/"
            className="inline-block bg-[#960853] text-white px-6 py-3 rounded-xl font-bold hover:bg-[#6e0339] transition-colors"
          >
            게임으로 돌아가기
          </Link>
        </div>
      </div>
    );
  }

  const statusInfo = STATUS_LABEL[coupon.status] ?? STATUS_LABEL.unused;
  const isExpired =
    coupon.status === "expired" ||
    new Date(coupon.expiresAt) < new Date();

  return (
    <div className="min-h-screen bg-[#fdf0f6] flex flex-col items-center justify-center p-4">
      {/* Header */}
      <div className="text-center mb-6">
        <p className="text-[#960853] text-sm font-semibold tracking-widest uppercase mb-1">
          YOGURTLAND
        </p>
        <h1 className="text-3xl font-black text-gray-900">
          🎉 쿠폰이 발급되었어요!
        </h1>
        <p className="text-gray-500 mt-1 text-sm">
          매장에서 QR 코드를 보여주세요
        </p>
      </div>

      {/* Coupon Card */}
      <div className="bg-white rounded-3xl shadow-xl w-full max-w-sm overflow-hidden">
        {/* Top stripe */}
        <div className="h-3 bg-gradient-to-r from-[#960853] via-[#c4206e] to-[#8dc63f]" />

        <div className="p-6">
          {/* Discount amount */}
          <div className="text-center mb-6">
            <p className="text-sm text-gray-400 font-medium mb-1">할인 금액</p>
            <p className="text-5xl font-black text-[#960853]">
              {formatDiscount(coupon.discountAmount)}
            </p>
            <p className="text-gray-600 text-sm mt-1">
              요거트랜드 전 메뉴 적용
            </p>
          </div>

          {/* QR Code */}
          <div className="flex justify-center mb-6">
            {coupon.status === "used" ? (
              <div className="w-[240px] h-[240px] bg-gray-100 rounded-2xl flex flex-col items-center justify-center">
                <span className="text-5xl mb-2">✅</span>
                <p className="text-gray-500 font-semibold">사용 완료</p>
              </div>
            ) : isExpired ? (
              <div className="w-[240px] h-[240px] bg-gray-100 rounded-2xl flex flex-col items-center justify-center">
                <span className="text-5xl mb-2">⏰</span>
                <p className="text-gray-500 font-semibold">만료됨</p>
              </div>
            ) : qrDataUrl ? (
              <div className="p-3 bg-white border-2 border-[#f3c6de] rounded-2xl">
                <img
                  src={qrDataUrl}
                  alt="쿠폰 QR 코드"
                  width={240}
                  height={240}
                  className="block"
                />
              </div>
            ) : (
              <div className="w-[240px] h-[240px] bg-gray-50 rounded-2xl animate-pulse" />
            )}
          </div>

          {/* Coupon Code */}
          <div className="bg-[#fdf0f6] rounded-2xl p-3 text-center mb-4">
            <p className="text-xs text-gray-400 mb-1">쿠폰 코드</p>
            <p className="text-2xl font-black tracking-[0.25em] text-[#960853] font-mono">
              {coupon.code}
            </p>
          </div>

          {/* Details */}
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-400">상태</span>
              <span className={`font-semibold ${statusInfo.color}`}>
                {statusInfo.text}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-400">발급일</span>
              <span className="text-gray-700">{formatDate(coupon.issuedAt)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-400">만료일</span>
              <span className={isExpired ? "text-red-500 font-semibold" : "text-gray-700"}>
                {formatDate(coupon.expiresAt)}
              </span>
            </div>
          </div>
        </div>

        {/* Bottom stripe */}
        <div className="border-t border-dashed border-gray-200 mx-6" />
        <div className="p-4 text-center">
          <p className="text-xs text-gray-400">
            본 쿠폰은 1회만 사용 가능합니다 · 현금 교환 불가
          </p>
        </div>
      </div>

      <AdBanner position="coupon" className="mt-4 w-full max-w-sm" />

      <div className="mt-4">
        <Link
          href="/"
          className="text-sm text-[#960853] hover:underline font-medium"
        >
          ← 게임으로 돌아가기
        </Link>
      </div>
    </div>
  );
}

export default function CouponPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-[#fdf0f6]">
          <div className="w-12 h-12 border-4 border-[#960853] border-t-transparent rounded-full animate-spin" />
        </div>
      }
    >
      <CouponPageContent />
    </Suspense>
  );
}
