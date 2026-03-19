"use client";

import { useEffect, useState } from "react";

type BannerData = {
  imageUrl: string;
  linkUrl: string | null;
  altText: string;
  active: boolean;
};

type BannersMap = Record<string, BannerData>;

// Module-level cache — shared across all AdBanner instances on the same page
let _cache: BannersMap | null = null;
let _promise: Promise<BannersMap> | null = null;

async function loadBanners(): Promise<BannersMap> {
  if (_cache) return _cache;
  if (!_promise) {
    _promise = fetch("/api/ads")
      .then((r) => r.json())
      .then((data) => {
        _cache = data.banners ?? {};
        _promise = null;
        return _cache!;
      })
      .catch(() => {
        _promise = null;
        return {};
      });
  }
  return _promise;
}

// ─────────────────────────────────────────────
// Placeholder shown when image_url is empty
// ─────────────────────────────────────────────
function Placeholder({ className }: { className?: string }) {
  return (
    <div
      className={`flex items-center justify-center bg-gradient-to-r from-[#fdf0f6] to-[#f3c6de] border border-[#f3c6de] rounded-xl overflow-hidden ${className ?? ""}`}
    >
      <div className="text-center py-3 px-6">
        <p className="text-xs font-black uppercase tracking-[0.2em] text-[#960853]/40 mb-0.5">
          YOGURTLAND
        </p>
        <p className="text-sm font-black text-[#960853]/30">광고 배너</p>
        <p className="text-[10px] text-[#960853]/25 mt-0.5">관리자 페이지에서 이미지 설정</p>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────
// AdBanner Component
// ─────────────────────────────────────────────
export default function AdBanner({
  position,
  className,
}: {
  position: "leaderboard" | "home" | "coupon";
  className?: string;
}) {
  const [banner, setBanner] = useState<BannerData | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    loadBanners().then((map) => {
      setBanner(map[position] ?? null);
      setReady(true);
    });
  }, [position]);

  // Not loaded yet — reserve space to avoid layout shift
  if (!ready) {
    return <div className={`h-16 rounded-xl bg-gray-100/50 animate-pulse ${className ?? ""}`} />;
  }

  // Hidden by admin or no data
  if (!banner || !banner.active) return null;

  // No image set — show placeholder
  if (!banner.imageUrl) {
    return <Placeholder className={className} />;
  }

  const img = (
    <img
      src={banner.imageUrl}
      alt={banner.altText}
      className="w-full h-auto rounded-xl object-cover block"
      draggable={false}
    />
  );

  return (
    <div className={className}>
      {banner.linkUrl ? (
        <a href={banner.linkUrl} target="_blank" rel="noopener noreferrer">
          {img}
        </a>
      ) : (
        img
      )}
    </div>
  );
}
