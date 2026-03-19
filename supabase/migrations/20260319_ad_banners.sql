-- ============================================
-- Ad Banners Table
-- ============================================
CREATE TABLE IF NOT EXISTS public.ad_banners (
  id TEXT PRIMARY KEY,          -- position key: 'leaderboard' | 'home' | 'coupon'
  image_url TEXT NOT NULL DEFAULT '',
  link_url TEXT,
  alt_text TEXT NOT NULL DEFAULT '요거트랜드 광고',
  active BOOLEAN NOT NULL DEFAULT TRUE,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Seed: one row per position
INSERT INTO public.ad_banners (id, image_url, link_url, alt_text) VALUES
  ('leaderboard', '', NULL, '요거트랜드 광고'),
  ('home',        '', NULL, '요거트랜드 광고'),
  ('coupon',      '', NULL, '요거트랜드 광고')
ON CONFLICT (id) DO NOTHING;
