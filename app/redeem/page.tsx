"use client";

import { Suspense, useEffect, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { formatDate, formatDateTime, formatDiscount } from "@/app/lib/couponUtils";

// ─────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────
type RedeemStatus = "idle" | "loading" | "valid" | "invalid" | "redeemed" | "error" | "used" | "expired";

interface CouponData {
  id: number;
  code: string;
  discountAmount: number;
  expiresAt: string;
  issuedAt: string;
}

interface RedeemResult {
  code: string;
  discountAmount: number;
  redeemedAt: string;
  storeId: string;
  staffId: string;
  orderNumber?: string;
}

// ─────────────────────────────────────────────
// Staff Login Screen
// ─────────────────────────────────────────────
function StaffLogin({
  onLogin,
}: {
  onLogin: (token: string, storeId: string, staffId: string) => void;
}) {
  const [password, setPassword] = useState("");
  const [storeId, setStoreId] = useState("");
  const [staffId, setStaffId] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!password || !storeId || !staffId) {
      setError("모든 항목을 입력해주세요.");
      return;
    }
    setLoading(true);
    setError("");

    // Verify password against admin verify endpoint
    try {
      const res = await fetch("/api/admin/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });
      const data = await res.json();
      if (data.ok) {
        localStorage.setItem("yl_staff_token", password);
        localStorage.setItem("yl_store_id", storeId);
        localStorage.setItem("yl_staff_id", staffId);
        onLogin(password, storeId, staffId);
      } else {
        setError("비밀번호가 올바르지 않습니다.");
      }
    } catch {
      setError("서버 연결에 실패했습니다.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-900 flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-sm p-8">
        <div className="text-center mb-8">
          <div className="text-4xl mb-3">🏪</div>
          <h1 className="text-2xl font-black text-gray-900">매장 직원 로그인</h1>
          <p className="text-gray-500 text-sm mt-1">YOGURTLAND 쿠폰 검증 시스템</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">
              매장 ID
            </label>
            <input
              type="text"
              value={storeId}
              onChange={(e) => setStoreId(e.target.value)}
              placeholder="예: store_001"
              className="w-full border-2 border-gray-200 rounded-xl px-4 py-3 text-lg focus:outline-none focus:border-[#960853] transition-colors"
            />
          </div>
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">
              직원 ID
            </label>
            <input
              type="text"
              value={staffId}
              onChange={(e) => setStaffId(e.target.value)}
              placeholder="예: staff_001"
              className="w-full border-2 border-gray-200 rounded-xl px-4 py-3 text-lg focus:outline-none focus:border-[#960853] transition-colors"
            />
          </div>
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">
              비밀번호
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="직원 비밀번호 입력"
              className="w-full border-2 border-gray-200 rounded-xl px-4 py-3 text-lg focus:outline-none focus:border-[#960853] transition-colors"
            />
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 rounded-xl p-3 text-red-700 text-sm">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-[#960853] text-white py-4 rounded-xl text-lg font-bold hover:bg-[#6e0339] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? "확인 중..." : "로그인"}
          </button>
        </form>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────
// Status Banner
// ─────────────────────────────────────────────
function StatusBanner({
  status,
  reason,
  coupon,
  result,
}: {
  status: RedeemStatus;
  reason?: string;
  coupon?: CouponData;
  result?: RedeemResult;
}) {
  if (status === "idle" || status === "loading") return null;

  if (status === "redeemed" && result) {
    return (
      <div className="bg-green-500 rounded-3xl p-6 text-white">
        <div className="text-center mb-4">
          <div className="text-5xl mb-2">✅</div>
          <h2 className="text-2xl font-black">사용 처리 완료!</h2>
        </div>
        <div className="bg-white/20 rounded-2xl p-4 space-y-2 text-sm">
          <Row label="쿠폰 코드" value={result.code} mono />
          <Row label="할인 금액" value={formatDiscount(result.discountAmount)} bold />
          <Row label="사용 시간" value={formatDateTime(result.redeemedAt)} />
          <Row label="매장 ID" value={result.storeId} />
          <Row label="직원 ID" value={result.staffId} />
          {result.orderNumber && (
            <Row label="주문 번호" value={result.orderNumber} />
          )}
        </div>
        <p className="text-center text-white/80 text-xs mt-3">
          POS에서 할인을 직접 적용해주세요
        </p>
      </div>
    );
  }

  if (status === "valid" && coupon) {
    return (
      <div className="bg-green-50 border-2 border-green-400 rounded-3xl p-6">
        <div className="text-center mb-4">
          <div className="text-4xl mb-1">🎟️</div>
          <h2 className="text-xl font-black text-green-700">사용 가능한 쿠폰</h2>
        </div>
        <div className="space-y-2 text-sm mb-2">
          <Row label="쿠폰 코드" value={coupon.code} mono />
          <Row
            label="할인 금액"
            value={formatDiscount(coupon.discountAmount)}
            bold
            valueClass="text-[#960853] text-xl"
          />
          <Row label="만료일" value={formatDate(coupon.expiresAt)} />
        </div>
      </div>
    );
  }

  const banners: Record<
    string,
    { bg: string; border: string; icon: string; title: string; textColor: string }
  > = {
    invalid: {
      bg: "bg-red-50",
      border: "border-red-400",
      icon: "❌",
      title: "존재하지 않는 쿠폰",
      textColor: "text-red-700",
    },
    used: {
      bg: "bg-gray-50",
      border: "border-gray-400",
      icon: "🚫",
      title: "이미 사용된 쿠폰",
      textColor: "text-gray-700",
    },
    expired: {
      bg: "bg-orange-50",
      border: "border-orange-400",
      icon: "⏰",
      title: "만료된 쿠폰",
      textColor: "text-orange-700",
    },
    error: {
      bg: "bg-red-50",
      border: "border-red-300",
      icon: "⚠️",
      title: "오류 발생",
      textColor: "text-red-700",
    },
  };

  const banner = banners[status] ?? banners.error;

  return (
    <div className={`${banner.bg} border-2 ${banner.border} rounded-3xl p-6 text-center`}>
      <div className="text-5xl mb-2">{banner.icon}</div>
      <h2 className={`text-xl font-black ${banner.textColor}`}>{banner.title}</h2>
      {reason && <p className="text-gray-500 text-sm mt-1">{reason}</p>}
    </div>
  );
}

function Row({
  label,
  value,
  mono,
  bold,
  valueClass,
}: {
  label: string;
  value: string;
  mono?: boolean;
  bold?: boolean;
  valueClass?: string;
}) {
  return (
    <div className="flex justify-between items-center">
      <span className="text-white/70 text-sm">{label}</span>
      <span
        className={[
          mono ? "font-mono tracking-widest" : "",
          bold ? "font-black" : "font-semibold",
          valueClass ?? "text-white",
        ].join(" ")}
      >
        {value}
      </span>
    </div>
  );
}

// ─────────────────────────────────────────────
// Main Redeem Screen
// ─────────────────────────────────────────────
function RedeemScreen({
  token,
  storeId,
  staffId,
  initialCode,
  onLogout,
}: {
  token: string;
  storeId: string;
  staffId: string;
  initialCode: string;
  onLogout: () => void;
}) {
  const [code, setCode] = useState(initialCode);
  const [orderNumber, setOrderNumber] = useState("");
  const [status, setStatus] = useState<RedeemStatus>(initialCode ? "loading" : "idle");
  const [reason, setReason] = useState("");
  const [coupon, setCoupon] = useState<CouponData | undefined>();
  const [result, setResult] = useState<RedeemResult | undefined>();
  const [redeemLoading, setRedeemLoading] = useState(false);

  const inputRef = useRef<HTMLInputElement>(null);

  // Auto-validate if code comes from URL
  useEffect(() => {
    if (initialCode) {
      handleValidate(initialCode);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Auto-focus input
  useEffect(() => {
    if (status === "idle" || status === "redeemed") {
      inputRef.current?.focus();
    }
  }, [status]);

  const reset = () => {
    setCode("");
    setOrderNumber("");
    setStatus("idle");
    setReason("");
    setCoupon(undefined);
    setResult(undefined);
    setTimeout(() => inputRef.current?.focus(), 50);
  };

  const handleValidate = async (codeToCheck?: string) => {
    const target = (codeToCheck ?? code).toUpperCase().trim();
    if (!target) return;

    setStatus("loading");
    setReason("");
    setCoupon(undefined);
    setResult(undefined);

    try {
      const res = await fetch("/api/coupons/validate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: target }),
      });
      const data = await res.json();

      if (data.valid) {
        setStatus("valid");
        setCoupon(data.coupon);
      } else {
        setStatus((data.status as RedeemStatus) ?? "invalid");
        setReason(data.reason ?? "");
      }
    } catch {
      setStatus("error");
      setReason("네트워크 오류가 발생했습니다.");
    }
  };

  const handleRedeem = async () => {
    if (!coupon || redeemLoading) return;
    setRedeemLoading(true);

    try {
      const res = await fetch("/api/coupons/redeem", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          code: coupon.code,
          storeId,
          staffId,
          orderNumber: orderNumber.trim() || undefined,
        }),
      });
      const data = await res.json();

      if (data.success) {
        setStatus("redeemed");
        setResult({
          code: data.code,
          discountAmount: data.discountAmount,
          redeemedAt: data.redeemedAt,
          storeId: data.storeId,
          staffId: data.staffId,
          orderNumber: data.orderNumber,
        });
      } else {
        setStatus("error");
        setReason(data.reason ?? "사용 처리에 실패했습니다.");
      }
    } catch {
      setStatus("error");
      setReason("네트워크 오류가 발생했습니다.");
    } finally {
      setRedeemLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-900 flex flex-col">
      {/* Header */}
      <div className="bg-[#960853] text-white px-4 py-3 flex items-center justify-between">
        <div>
          <p className="text-xs opacity-70">YOGURTLAND</p>
          <p className="font-black text-lg leading-tight">쿠폰 검증 / 사용</p>
        </div>
        <div className="text-right text-xs opacity-80">
          <p>{storeId}</p>
          <p>{staffId}</p>
          <button onClick={onLogout} className="text-white/60 hover:text-white mt-1 text-xs underline">
            로그아웃
          </button>
        </div>
      </div>

      <div className="flex-1 p-4 space-y-4 max-w-lg mx-auto w-full">
        {/* Code Input */}
        <div className="bg-white rounded-3xl p-5">
          <label className="block text-sm font-bold text-gray-600 mb-2">
            쿠폰 코드 입력 (QR 스캔 또는 직접 입력)
          </label>
          <div className="flex gap-2">
            <input
              ref={inputRef}
              type="text"
              value={code}
              onChange={(e) => setCode(e.target.value.toUpperCase())}
              onKeyDown={(e) => {
                if (e.key === "Enter") handleValidate();
              }}
              placeholder="예: YG7A92K3"
              maxLength={20}
              className="flex-1 border-2 border-gray-200 rounded-2xl px-4 py-4 text-2xl font-mono font-bold tracking-widest focus:outline-none focus:border-[#960853] transition-colors uppercase placeholder:text-gray-300 placeholder:text-lg placeholder:font-sans placeholder:tracking-normal"
            />
            <button
              onClick={() => handleValidate()}
              disabled={!code.trim() || status === "loading"}
              className="bg-[#960853] text-white px-5 py-4 rounded-2xl font-bold text-lg hover:bg-[#6e0339] transition-colors disabled:opacity-40 disabled:cursor-not-allowed shrink-0"
            >
              {status === "loading" ? (
                <span className="block w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                "검증"
              )}
            </button>
          </div>
          <p className="text-xs text-gray-400 mt-2">
            QR 스캔 후 Enter 또는 검증 버튼을 누르세요
          </p>
        </div>

        {/* Status Banner */}
        <StatusBanner
          status={status}
          reason={reason}
          coupon={coupon}
          result={result}
        />

        {/* Redeem section (only when valid) */}
        {status === "valid" && coupon && (
          <div className="bg-white rounded-3xl p-5 space-y-4">
            <div>
              <label className="block text-sm font-bold text-gray-600 mb-2">
                주문 번호 (선택 사항)
              </label>
              <input
                type="text"
                value={orderNumber}
                onChange={(e) => setOrderNumber(e.target.value)}
                placeholder="POS 주문 번호 입력"
                className="w-full border-2 border-gray-200 rounded-xl px-4 py-3 text-lg focus:outline-none focus:border-[#960853] transition-colors"
              />
            </div>
            <button
              onClick={handleRedeem}
              disabled={redeemLoading}
              className="w-full bg-green-500 hover:bg-green-600 text-white py-5 rounded-2xl text-2xl font-black transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-lg"
            >
              {redeemLoading ? (
                <span className="flex items-center justify-center gap-3">
                  <span className="w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  처리 중...
                </span>
              ) : (
                "✅ 사용 처리"
              )}
            </button>
          </div>
        )}

        {/* Reset button after redeemed or error */}
        {(status === "redeemed" || status === "invalid" || status === "used" || status === "expired" || status === "error") && (
          <button
            onClick={reset}
            className="w-full bg-gray-700 hover:bg-gray-600 text-white py-4 rounded-2xl text-xl font-bold transition-colors"
          >
            다음 쿠폰 검증
          </button>
        )}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────
// Page Root
// ─────────────────────────────────────────────
function RedeemPageContent() {
  const params = useSearchParams();
  const initialCode = params.get("code")?.toUpperCase() ?? "";

  const [token, setToken] = useState<string | null>(null);
  const [storeId, setStoreId] = useState("");
  const [staffId, setStaffId] = useState("");
  const [hydrated, setHydrated] = useState(false);

  // Restore session from localStorage
  useEffect(() => {
    const savedToken = localStorage.getItem("yl_staff_token");
    const savedStore = localStorage.getItem("yl_store_id");
    const savedStaff = localStorage.getItem("yl_staff_id");
    if (savedToken && savedStore && savedStaff) {
      setToken(savedToken);
      setStoreId(savedStore);
      setStaffId(savedStaff);
    }
    setHydrated(true);
  }, []);

  const handleLogin = (t: string, sid: string, sfid: string) => {
    setToken(t);
    setStoreId(sid);
    setStaffId(sfid);
  };

  const handleLogout = () => {
    localStorage.removeItem("yl_staff_token");
    localStorage.removeItem("yl_store_id");
    localStorage.removeItem("yl_staff_id");
    setToken(null);
    setStoreId("");
    setStaffId("");
  };

  if (!hydrated) return null;

  if (!token) {
    return <StaffLogin onLogin={handleLogin} />;
  }

  return (
    <RedeemScreen
      token={token}
      storeId={storeId}
      staffId={staffId}
      initialCode={initialCode}
      onLogout={handleLogout}
    />
  );
}

export default function RedeemPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-gray-900 flex items-center justify-center">
          <div className="w-12 h-12 border-4 border-white border-t-transparent rounded-full animate-spin" />
        </div>
      }
    >
      <RedeemPageContent />
    </Suspense>
  );
}
