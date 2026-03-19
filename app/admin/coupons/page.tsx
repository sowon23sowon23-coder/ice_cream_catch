"use client";

import { useCallback, useEffect, useState } from "react";

// ─────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────
interface Stats {
  total: number;
  used: number;
  unused: number;
  expired: number;
  usageRate: number;
  dailyStats: { date: string; issued: number; redeemed: number }[];
  byStore: { storeId: string; count: number }[];
}

interface Coupon {
  id: number;
  code: string;
  user_id: string | null;
  discount_amount: number;
  status: string;
  issued_at: string;
  expires_at: string;
  redeemed_at: string | null;
  redeemed_store_id: string | null;
  redeemed_staff_id: string | null;
  order_number: string | null;
}

interface RedeemLog {
  id: number;
  coupon_id: number | null;
  code: string;
  action_type: string;
  reason: string | null;
  store_id: string | null;
  staff_id: string | null;
  order_number: string | null;
  created_at: string;
}

// ─────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────
function fmt(n: number | null | undefined): string {
  if (n == null) return "—";
  return n.toLocaleString("ko-KR");
}

function fmtDate(iso: string | null | undefined): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("ko-KR");
}

function fmtDT(iso: string | null | undefined): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleString("ko-KR", {
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

const STATUS_BADGE: Record<string, string> = {
  unused: "bg-green-100 text-green-700",
  used: "bg-gray-100 text-gray-600",
  expired: "bg-red-100 text-red-600",
};

const ACTION_BADGE: Record<string, string> = {
  validate: "bg-blue-100 text-blue-700",
  redeem_success: "bg-green-100 text-green-700",
  redeem_fail: "bg-red-100 text-red-600",
};

// ─────────────────────────────────────────────
// MiniBar chart
// ─────────────────────────────────────────────
function MiniChart({ data }: { data: Stats["dailyStats"] }) {
  const maxVal = Math.max(1, ...data.map((d) => Math.max(d.issued, d.redeemed)));
  const recent = data.slice(-10);

  return (
    <div className="flex items-end gap-1 h-16">
      {recent.map((d) => (
        <div key={d.date} className="flex-1 flex flex-col items-center gap-0.5">
          <div className="w-full flex flex-col-reverse gap-0.5">
            <div
              className="w-full bg-[#960853] rounded-sm opacity-70"
              style={{ height: `${(d.issued / maxVal) * 48}px` }}
              title={`발급: ${d.issued}`}
            />
            {d.redeemed > 0 && (
              <div
                className="w-full bg-[#8dc63f] rounded-sm"
                style={{ height: `${(d.redeemed / maxVal) * 48}px` }}
                title={`사용: ${d.redeemed}`}
              />
            )}
          </div>
          <span className="text-[9px] text-gray-400 rotate-45 origin-left mt-1 whitespace-nowrap">
            {d.date.slice(5)}
          </span>
        </div>
      ))}
    </div>
  );
}

// ─────────────────────────────────────────────
// Create Coupon Modal
// ─────────────────────────────────────────────
function CreateCouponModal({
  token,
  onClose,
  onCreated,
}: {
  token: string;
  onClose: () => void;
  onCreated: () => void;
}) {
  const [userId, setUserId] = useState("");
  const [amount, setAmount] = useState("3000");
  const [expiryDays, setExpiryDays] = useState("30");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [created, setCreated] = useState<Coupon | null>(null);

  const handleCreate = async () => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/admin/coupons", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          userId: userId.trim() || undefined,
          discountAmount: parseInt(amount),
          expiryDays: parseInt(expiryDays),
        }),
      });
      const data = await res.json();
      if (data.success) {
        setCreated(data.coupon);
        onCreated();
      } else {
        setError(data.error ?? "생성 실패");
      }
    } catch {
      setError("네트워크 오류");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-3xl w-full max-w-sm p-6 shadow-2xl">
        <h3 className="text-xl font-black text-gray-900 mb-4">쿠폰 수동 생성</h3>

        {created ? (
          <div className="text-center py-4">
            <div className="text-4xl mb-2">🎉</div>
            <p className="font-black text-green-700 text-lg mb-2">생성 완료!</p>
            <div className="bg-gray-50 rounded-xl p-3 font-mono text-2xl font-black tracking-widest text-[#960853] mb-4">
              {created.code}
            </div>
            <p className="text-sm text-gray-500">할인: {created.discount_amount.toLocaleString()}원</p>
            <button
              onClick={onClose}
              className="mt-4 w-full bg-[#960853] text-white py-3 rounded-xl font-bold"
            >
              닫기
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            <div>
              <label className="text-sm font-semibold text-gray-600 block mb-1">
                사용자 ID (선택)
              </label>
              <input
                type="text"
                value={userId}
                onChange={(e) => setUserId(e.target.value)}
                className="w-full border-2 border-gray-200 rounded-xl px-3 py-2 focus:outline-none focus:border-[#960853]"
                placeholder="user_123"
              />
            </div>
            <div>
              <label className="text-sm font-semibold text-gray-600 block mb-1">
                할인 금액 (원)
              </label>
              <select
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="w-full border-2 border-gray-200 rounded-xl px-3 py-2 focus:outline-none focus:border-[#960853]"
              >
                <option value="1000">1,000원</option>
                <option value="2000">2,000원</option>
                <option value="3000">3,000원</option>
                <option value="5000">5,000원</option>
              </select>
            </div>
            <div>
              <label className="text-sm font-semibold text-gray-600 block mb-1">
                유효 기간 (일)
              </label>
              <select
                value={expiryDays}
                onChange={(e) => setExpiryDays(e.target.value)}
                className="w-full border-2 border-gray-200 rounded-xl px-3 py-2 focus:outline-none focus:border-[#960853]"
              >
                <option value="7">7일</option>
                <option value="14">14일</option>
                <option value="30">30일</option>
                <option value="90">90일</option>
              </select>
            </div>
            {error && (
              <p className="text-red-500 text-sm">{error}</p>
            )}
            <div className="flex gap-2 pt-2">
              <button
                onClick={onClose}
                className="flex-1 border-2 border-gray-200 text-gray-600 py-3 rounded-xl font-bold"
              >
                취소
              </button>
              <button
                onClick={handleCreate}
                disabled={loading}
                className="flex-1 bg-[#960853] text-white py-3 rounded-xl font-bold disabled:opacity-50"
              >
                {loading ? "생성 중..." : "생성"}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────
// Ad Banner Manager
// ─────────────────────────────────────────────
const BANNER_POSITIONS = [
  { id: "leaderboard", label: "리더보드 (게임 오버 후)", desc: "모달 하단 배너" },
  { id: "home",        label: "홈 화면",                desc: "캐릭터/모드 선택 하단" },
  { id: "coupon",      label: "쿠폰 발급 화면",          desc: "쿠폰 카드 하단" },
] as const;

type BannerPos = (typeof BANNER_POSITIONS)[number]["id"];

interface BannerState {
  imageUrl: string;
  linkUrl: string;
  active: boolean;
}

function AdBannerManager({ token }: { token: string }) {
  const [banners, setBanners] = useState<Record<BannerPos, BannerState>>({
    leaderboard: { imageUrl: "", linkUrl: "", active: true },
    home:        { imageUrl: "", linkUrl: "", active: true },
    coupon:      { imageUrl: "", linkUrl: "", active: true },
  });
  const [saving, setSaving] = useState<BannerPos | null>(null);
  const [saved, setSaved] = useState<BannerPos | null>(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    fetch("/api/ads")
      .then((r) => r.json())
      .then((data) => {
        const map = data.banners ?? {};
        setBanners((prev) => {
          const next = { ...prev };
          for (const pos of BANNER_POSITIONS) {
            if (map[pos.id]) {
              next[pos.id] = {
                imageUrl: map[pos.id].imageUrl ?? "",
                linkUrl: map[pos.id].linkUrl ?? "",
                active: map[pos.id].active ?? true,
              };
            }
          }
          return next;
        });
        setLoaded(true);
      });
  }, []);

  const handleSave = async (id: BannerPos) => {
    setSaving(id);
    try {
      const res = await fetch("/api/admin/ads", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          id,
          imageUrl: banners[id].imageUrl,
          linkUrl: banners[id].linkUrl || "",
          active: banners[id].active,
        }),
      });
      if (res.ok) {
        setSaved(id);
        setTimeout(() => setSaved(null), 2000);
      }
    } finally {
      setSaving(null);
    }
  };

  const update = (id: BannerPos, field: keyof BannerState, value: string | boolean) => {
    setBanners((prev) => ({ ...prev, [id]: { ...prev[id], [field]: value } }));
  };

  if (!loaded) return null;

  return (
    <div className="bg-white rounded-2xl overflow-hidden shadow-sm">
      <div className="px-5 py-4 border-b border-gray-100">
        <h2 className="font-black text-gray-800">광고 배너 관리</h2>
        <p className="text-xs text-gray-400 mt-0.5">이미지 URL을 입력하면 각 위치에 광고가 표시됩니다</p>
      </div>

      <div className="divide-y divide-gray-50">
        {BANNER_POSITIONS.map((pos) => {
          const b = banners[pos.id];
          const isSaving = saving === pos.id;
          const isSaved = saved === pos.id;

          return (
            <div key={pos.id} className="px-5 py-4 flex flex-col md:flex-row md:items-start gap-4">
              {/* Info */}
              <div className="md:w-44 shrink-0">
                <p className="font-bold text-gray-800 text-sm">{pos.label}</p>
                <p className="text-xs text-gray-400">{pos.desc}</p>
                <label className="flex items-center gap-1.5 mt-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={b.active}
                    onChange={(e) => update(pos.id, "active", e.target.checked)}
                    className="accent-[#960853]"
                  />
                  <span className="text-xs text-gray-500">활성화</span>
                </label>
              </div>

              {/* Preview */}
              <div className="md:w-40 shrink-0">
                {b.imageUrl ? (
                  <img
                    src={b.imageUrl}
                    alt="미리보기"
                    className="w-full h-20 object-cover rounded-xl border border-gray-100"
                    onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
                  />
                ) : (
                  <div className="w-full h-20 bg-gradient-to-r from-[#fdf0f6] to-[#f3c6de] rounded-xl border border-[#f3c6de] flex items-center justify-center">
                    <span className="text-xs text-[#960853]/40 font-bold">이미지 없음</span>
                  </div>
                )}
              </div>

              {/* Inputs */}
              <div className="flex-1 space-y-2">
                <div>
                  <label className="block text-xs text-gray-500 mb-1">이미지 URL</label>
                  <input
                    type="url"
                    value={b.imageUrl}
                    onChange={(e) => update(pos.id, "imageUrl", e.target.value)}
                    placeholder="https://example.com/banner.jpg"
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#960853] transition-colors"
                  />
                </div>
                <div>
                  <label className="block text-xs text-gray-500 mb-1">클릭 링크 (선택)</label>
                  <input
                    type="url"
                    value={b.linkUrl}
                    onChange={(e) => update(pos.id, "linkUrl", e.target.value)}
                    placeholder="https://yogurtland.com/..."
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#960853] transition-colors"
                  />
                </div>
                <button
                  onClick={() => handleSave(pos.id)}
                  disabled={isSaving}
                  className={`px-4 py-2 rounded-lg text-sm font-bold transition-colors ${
                    isSaved
                      ? "bg-green-500 text-white"
                      : "bg-[#960853] text-white hover:bg-[#6e0339] disabled:opacity-50"
                  }`}
                >
                  {isSaving ? "저장 중..." : isSaved ? "✓ 저장됨" : "저장"}
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────
// Main Dashboard
// ─────────────────────────────────────────────
function Dashboard({ token }: { token: string }) {
  const [stats, setStats] = useState<Stats | null>(null);
  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [couponTotal, setCouponTotal] = useState(0);
  const [couponPage, setCouponPage] = useState(1);
  const [couponStatus, setCouponStatus] = useState("all");
  const [couponSearch, setCouponSearch] = useState("");

  const [logs, setLogs] = useState<RedeemLog[]>([]);
  const [logTotal, setLogTotal] = useState(0);
  const [logPage, setLogPage] = useState(1);
  const [logAction, setLogAction] = useState("");

  const [showCreateModal, setShowCreateModal] = useState(false);
  const [loadingStats, setLoadingStats] = useState(true);
  const [loadingCoupons, setLoadingCoupons] = useState(false);
  const [loadingLogs, setLoadingLogs] = useState(false);

  const authHeader = { Authorization: `Bearer ${token}` };

  const fetchStats = useCallback(async () => {
    setLoadingStats(true);
    try {
      const res = await fetch("/api/admin/coupon-stats", { headers: authHeader });
      const data = await res.json();
      if (!data.error) setStats(data);
    } finally {
      setLoadingStats(false);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  const fetchCoupons = useCallback(async () => {
    setLoadingCoupons(true);
    try {
      const params = new URLSearchParams({
        page: String(couponPage),
        limit: "15",
        ...(couponStatus !== "all" ? { status: couponStatus } : {}),
        ...(couponSearch ? { search: couponSearch } : {}),
      });
      const res = await fetch(`/api/admin/coupons?${params}`, { headers: authHeader });
      const data = await res.json();
      if (!data.error) {
        setCoupons(data.rows ?? []);
        setCouponTotal(data.total ?? 0);
      }
    } finally {
      setLoadingCoupons(false);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token, couponPage, couponStatus, couponSearch]);

  const fetchLogs = useCallback(async () => {
    setLoadingLogs(true);
    try {
      const params = new URLSearchParams({
        page: String(logPage),
        limit: "15",
        ...(logAction ? { action_type: logAction } : {}),
      });
      const res = await fetch(`/api/admin/coupon-logs?${params}`, { headers: authHeader });
      const data = await res.json();
      if (!data.error) {
        setLogs(data.rows ?? []);
        setLogTotal(data.total ?? 0);
      }
    } finally {
      setLoadingLogs(false);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token, logPage, logAction]);

  useEffect(() => { fetchStats(); }, [fetchStats]);
  useEffect(() => { fetchCoupons(); }, [fetchCoupons]);
  useEffect(() => { fetchLogs(); }, [fetchLogs]);

  const downloadCSV = async (type: "coupons" | "logs") => {
    const res = await fetch(`/api/admin/coupon-csv?type=${type}`, { headers: authHeader });
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = res.headers.get("Content-Disposition")?.split('filename="')[1]?.replace('"', '') ?? `${type}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const couponPages = Math.ceil(couponTotal / 15);
  const logPages = Math.ceil(logTotal / 15);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-[#960853] text-white px-6 py-4 flex items-center justify-between">
        <div>
          <p className="text-xs opacity-70 tracking-widest uppercase">Yogurtland Admin</p>
          <h1 className="text-2xl font-black">쿠폰 관리 대시보드</h1>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setShowCreateModal(true)}
            className="bg-white text-[#960853] px-4 py-2 rounded-xl font-bold text-sm hover:bg-pink-50 transition-colors"
          >
            + 쿠폰 생성
          </button>
          <a href="/admin" className="text-white/70 hover:text-white text-sm py-2 px-3">
            ← 어드민
          </a>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 py-6 space-y-6">
        {/* Stat Cards */}
        {loadingStats ? (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="bg-white rounded-2xl p-5 animate-pulse h-24" />
            ))}
          </div>
        ) : stats ? (
          <>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <StatCard title="총 발급" value={fmt(stats.total)} icon="🎟️" color="bg-[#fdf0f6]" />
              <StatCard title="총 사용" value={fmt(stats.used)} icon="✅" color="bg-green-50" valueColor="text-green-700" />
              <StatCard title="미사용" value={fmt(stats.unused)} icon="⏳" color="bg-blue-50" valueColor="text-blue-700" />
              <StatCard
                title="사용률"
                value={`${stats.usageRate}%`}
                icon="📊"
                color="bg-purple-50"
                valueColor="text-purple-700"
              />
            </div>

            {/* Chart */}
            <div className="bg-white rounded-2xl p-5">
              <div className="flex items-center justify-between mb-3">
                <h2 className="font-black text-gray-800">최근 14일 발급/사용 추이</h2>
                <div className="flex gap-3 text-xs">
                  <span className="flex items-center gap-1">
                    <span className="w-3 h-3 bg-[#960853] opacity-70 rounded-sm inline-block" />
                    발급
                  </span>
                  <span className="flex items-center gap-1">
                    <span className="w-3 h-3 bg-[#8dc63f] rounded-sm inline-block" />
                    사용
                  </span>
                </div>
              </div>
              <MiniChart data={stats.dailyStats} />
            </div>

            {/* By Store */}
            {stats.byStore.length > 0 && (
              <div className="bg-white rounded-2xl p-5">
                <h2 className="font-black text-gray-800 mb-3">매장별 사용 현황</h2>
                <div className="space-y-2">
                  {stats.byStore.slice(0, 10).map((s) => (
                    <div key={s.storeId} className="flex items-center gap-3">
                      <span className="text-sm text-gray-600 w-40 truncate">{s.storeId}</span>
                      <div className="flex-1 bg-gray-100 rounded-full h-3 overflow-hidden">
                        <div
                          className="h-full bg-[#960853] rounded-full"
                          style={{
                            width: `${Math.min(100, (s.count / (stats.byStore[0]?.count || 1)) * 100)}%`,
                          }}
                        />
                      </div>
                      <span className="text-sm font-bold text-gray-800 w-8 text-right">{s.count}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        ) : null}

        {/* Coupon Table */}
        <div className="bg-white rounded-2xl overflow-hidden shadow-sm">
          <div className="px-5 py-4 border-b border-gray-100 flex flex-wrap items-center justify-between gap-3">
            <h2 className="font-black text-gray-800">쿠폰 목록</h2>
            <div className="flex items-center gap-2 flex-wrap">
              <input
                type="text"
                value={couponSearch}
                onChange={(e) => { setCouponSearch(e.target.value); setCouponPage(1); }}
                placeholder="코드 검색"
                className="border border-gray-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:border-[#960853] w-32"
              />
              <select
                value={couponStatus}
                onChange={(e) => { setCouponStatus(e.target.value); setCouponPage(1); }}
                className="border border-gray-200 rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:border-[#960853]"
              >
                <option value="all">전체</option>
                <option value="unused">미사용</option>
                <option value="used">사용됨</option>
                <option value="expired">만료됨</option>
              </select>
              <button
                onClick={() => downloadCSV("coupons")}
                className="bg-gray-100 hover:bg-gray-200 text-gray-700 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors"
              >
                CSV ↓
              </button>
            </div>
          </div>

          {loadingCoupons ? (
            <div className="p-10 text-center text-gray-400">불러오는 중...</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 text-gray-500 text-xs uppercase">
                  <tr>
                    <th className="px-4 py-3 text-left">코드</th>
                    <th className="px-4 py-3 text-left">상태</th>
                    <th className="px-4 py-3 text-right">할인</th>
                    <th className="px-4 py-3 text-left">발급일</th>
                    <th className="px-4 py-3 text-left">만료일</th>
                    <th className="px-4 py-3 text-left">사용일</th>
                    <th className="px-4 py-3 text-left">매장</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {coupons.map((c) => (
                    <tr key={c.id} className="hover:bg-gray-50/50 transition-colors">
                      <td className="px-4 py-3 font-mono font-bold text-[#960853] tracking-wider">
                        {c.code}
                      </td>
                      <td className="px-4 py-3">
                        <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${STATUS_BADGE[c.status] ?? "bg-gray-100"}`}>
                          {c.status === "unused" ? "미사용" : c.status === "used" ? "사용됨" : "만료됨"}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right font-semibold text-gray-800">
                        {fmt(c.discount_amount)}원
                      </td>
                      <td className="px-4 py-3 text-gray-500">{fmtDate(c.issued_at)}</td>
                      <td className="px-4 py-3 text-gray-500">{fmtDate(c.expires_at)}</td>
                      <td className="px-4 py-3 text-gray-500">{fmtDT(c.redeemed_at)}</td>
                      <td className="px-4 py-3 text-gray-500 text-xs">{c.redeemed_store_id ?? "—"}</td>
                    </tr>
                  ))}
                  {coupons.length === 0 && (
                    <tr>
                      <td colSpan={7} className="px-4 py-10 text-center text-gray-400">
                        데이터가 없습니다
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}

          {couponPages > 1 && (
            <Pagination
              page={couponPage}
              totalPages={couponPages}
              total={couponTotal}
              onPage={setCouponPage}
            />
          )}
        </div>

        {/* Redeem Logs Table */}
        <div className="bg-white rounded-2xl overflow-hidden shadow-sm">
          <div className="px-5 py-4 border-b border-gray-100 flex flex-wrap items-center justify-between gap-3">
            <h2 className="font-black text-gray-800">검증/사용 로그</h2>
            <div className="flex gap-2 flex-wrap">
              <select
                value={logAction}
                onChange={(e) => { setLogAction(e.target.value); setLogPage(1); }}
                className="border border-gray-200 rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:border-[#960853]"
              >
                <option value="">전체 액션</option>
                <option value="validate">검증</option>
                <option value="redeem_success">사용 성공</option>
                <option value="redeem_fail">사용 실패</option>
              </select>
              <button
                onClick={() => downloadCSV("logs")}
                className="bg-gray-100 hover:bg-gray-200 text-gray-700 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors"
              >
                CSV ↓
              </button>
            </div>
          </div>

          {loadingLogs ? (
            <div className="p-10 text-center text-gray-400">불러오는 중...</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 text-gray-500 text-xs uppercase">
                  <tr>
                    <th className="px-4 py-3 text-left">시간</th>
                    <th className="px-4 py-3 text-left">코드</th>
                    <th className="px-4 py-3 text-left">액션</th>
                    <th className="px-4 py-3 text-left">사유</th>
                    <th className="px-4 py-3 text-left">매장</th>
                    <th className="px-4 py-3 text-left">직원</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {logs.map((l) => (
                    <tr key={l.id} className="hover:bg-gray-50/50 transition-colors">
                      <td className="px-4 py-3 text-gray-500 whitespace-nowrap">{fmtDT(l.created_at)}</td>
                      <td className="px-4 py-3 font-mono font-bold text-[#960853] tracking-wider">{l.code}</td>
                      <td className="px-4 py-3">
                        <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${ACTION_BADGE[l.action_type] ?? "bg-gray-100"}`}>
                          {l.action_type === "validate" ? "검증" : l.action_type === "redeem_success" ? "사용 성공" : "사용 실패"}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-gray-500 text-xs">{l.reason ?? "—"}</td>
                      <td className="px-4 py-3 text-gray-500 text-xs">{l.store_id ?? "—"}</td>
                      <td className="px-4 py-3 text-gray-500 text-xs">{l.staff_id ?? "—"}</td>
                    </tr>
                  ))}
                  {logs.length === 0 && (
                    <tr>
                      <td colSpan={6} className="px-4 py-10 text-center text-gray-400">
                        데이터가 없습니다
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}

          {logPages > 1 && (
            <Pagination page={logPage} totalPages={logPages} total={logTotal} onPage={setLogPage} />
          )}
        </div>
      </div>

      <AdBannerManager token={token} />

      {showCreateModal && (
        <CreateCouponModal
          token={token}
          onClose={() => setShowCreateModal(false)}
          onCreated={() => {
            fetchStats();
            fetchCoupons();
          }}
        />
      )}
    </div>
  );
}

// ─────────────────────────────────────────────
// Sub-components
// ─────────────────────────────────────────────
function StatCard({
  title,
  value,
  icon,
  color,
  valueColor = "text-gray-900",
}: {
  title: string;
  value: string;
  icon: string;
  color: string;
  valueColor?: string;
}) {
  return (
    <div className={`${color} rounded-2xl p-5`}>
      <div className="text-2xl mb-1">{icon}</div>
      <p className="text-xs text-gray-500 font-semibold">{title}</p>
      <p className={`text-2xl font-black ${valueColor}`}>{value}</p>
    </div>
  );
}

function Pagination({
  page,
  totalPages,
  total,
  onPage,
}: {
  page: number;
  totalPages: number;
  total: number;
  onPage: (p: number) => void;
}) {
  return (
    <div className="px-4 py-3 border-t border-gray-100 flex items-center justify-between text-sm text-gray-500">
      <span>총 {total.toLocaleString()}건</span>
      <div className="flex items-center gap-1">
        <button
          disabled={page === 1}
          onClick={() => onPage(page - 1)}
          className="px-2 py-1 rounded hover:bg-gray-100 disabled:opacity-30 disabled:cursor-not-allowed"
        >
          ‹
        </button>
        <span className="px-2 font-medium text-gray-800">
          {page} / {totalPages}
        </span>
        <button
          disabled={page >= totalPages}
          onClick={() => onPage(page + 1)}
          className="px-2 py-1 rounded hover:bg-gray-100 disabled:opacity-30 disabled:cursor-not-allowed"
        >
          ›
        </button>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────
// Admin Login
// ─────────────────────────────────────────────
function AdminLogin({ onLogin }: { onLogin: (token: string) => void }) {
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/admin/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });
      const data = await res.json();
      if (data.ok) {
        onLogin(password);
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
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl shadow-xl w-full max-w-xs p-8">
        <div className="text-center mb-6">
          <div className="text-4xl mb-2">🔐</div>
          <h1 className="text-xl font-black text-gray-900">관리자 로그인</h1>
          <p className="text-gray-500 text-sm">쿠폰 관리 대시보드</p>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="관리자 비밀번호"
            className="w-full border-2 border-gray-200 rounded-xl px-4 py-3 focus:outline-none focus:border-[#960853]"
            autoFocus
          />
          {error && <p className="text-red-500 text-sm">{error}</p>}
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-[#960853] text-white py-3 rounded-xl font-bold hover:bg-[#6e0339] transition-colors disabled:opacity-50"
          >
            {loading ? "확인 중..." : "로그인"}
          </button>
        </form>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────
// Page Root
// ─────────────────────────────────────────────
export default function AdminCouponsPage() {
  const [token, setToken] = useState<string | null>(null);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    // Always require password — no localStorage persistence
    setHydrated(true);
  }, []);

  if (!hydrated) return null;
  if (!token) return <AdminLogin onLogin={setToken} />;
  return <Dashboard token={token} />;
}
