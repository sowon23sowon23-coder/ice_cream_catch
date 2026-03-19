-- ============================================
-- Yogurtland Coupon System - Database Schema
-- Migration: 20260319_coupon_system.sql
-- ============================================

-- Stores table
CREATE TABLE IF NOT EXISTS public.stores (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Staff users table
CREATE TABLE IF NOT EXISTS public.staff_users (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  store_id TEXT REFERENCES public.stores(id),
  role TEXT NOT NULL DEFAULT 'staff' CHECK (role IN ('staff', 'manager', 'admin')),
  active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Coupons table
CREATE TABLE IF NOT EXISTS public.coupons (
  id BIGSERIAL PRIMARY KEY,
  code TEXT UNIQUE NOT NULL,
  user_id TEXT,
  reward_type TEXT NOT NULL DEFAULT 'discount',
  discount_amount INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'unused' CHECK (status IN ('unused', 'used', 'expired')),
  issued_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at TIMESTAMPTZ NOT NULL,
  redeemed_at TIMESTAMPTZ,
  redeemed_store_id TEXT,
  redeemed_staff_id TEXT,
  order_number TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_coupons_code ON public.coupons (code);
CREATE INDEX IF NOT EXISTS idx_coupons_status ON public.coupons (status);
CREATE INDEX IF NOT EXISTS idx_coupons_user_id ON public.coupons (user_id);
CREATE INDEX IF NOT EXISTS idx_coupons_issued_at ON public.coupons (issued_at DESC);

-- Redeem logs table
CREATE TABLE IF NOT EXISTS public.redeem_logs (
  id BIGSERIAL PRIMARY KEY,
  coupon_id BIGINT REFERENCES public.coupons(id),
  code TEXT NOT NULL,
  action_type TEXT NOT NULL CHECK (action_type IN ('validate', 'redeem_success', 'redeem_fail')),
  reason TEXT,
  store_id TEXT,
  staff_id TEXT,
  order_number TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_redeem_logs_coupon_id ON public.redeem_logs (coupon_id);
CREATE INDEX IF NOT EXISTS idx_redeem_logs_created_at ON public.redeem_logs (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_redeem_logs_store_id ON public.redeem_logs (store_id);
CREATE INDEX IF NOT EXISTS idx_redeem_logs_action ON public.redeem_logs (action_type);

-- ============================================
-- Atomic redeem function (prevents double-redemption via FOR UPDATE lock)
-- ============================================
CREATE OR REPLACE FUNCTION redeem_coupon(
  p_code TEXT,
  p_store_id TEXT,
  p_staff_id TEXT,
  p_order_number TEXT DEFAULT NULL
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_coupon coupons%ROWTYPE;
BEGIN
  -- Lock the row atomically to prevent concurrent redemption
  SELECT * INTO v_coupon
  FROM coupons
  WHERE code = p_code
  FOR UPDATE;

  -- Coupon not found
  IF NOT FOUND THEN
    INSERT INTO redeem_logs (coupon_id, code, action_type, reason, store_id, staff_id, order_number)
    VALUES (NULL, p_code, 'redeem_fail', 'not_found', p_store_id, p_staff_id, p_order_number);
    RETURN json_build_object('success', false, 'reason', 'not_found');
  END IF;

  -- Already used
  IF v_coupon.status = 'used' THEN
    INSERT INTO redeem_logs (coupon_id, code, action_type, reason, store_id, staff_id, order_number)
    VALUES (v_coupon.id, p_code, 'redeem_fail', 'already_used', p_store_id, p_staff_id, p_order_number);
    RETURN json_build_object(
      'success', false,
      'reason', 'already_used',
      'redeemed_at', v_coupon.redeemed_at
    );
  END IF;

  -- Expired (check actual time or status flag)
  IF v_coupon.expires_at < NOW() OR v_coupon.status = 'expired' THEN
    -- Mark as expired if not already
    UPDATE coupons
    SET status = 'expired', updated_at = NOW()
    WHERE id = v_coupon.id AND status = 'unused';

    INSERT INTO redeem_logs (coupon_id, code, action_type, reason, store_id, staff_id, order_number)
    VALUES (v_coupon.id, p_code, 'redeem_fail', 'expired', p_store_id, p_staff_id, p_order_number);
    RETURN json_build_object(
      'success', false,
      'reason', 'expired',
      'expires_at', v_coupon.expires_at
    );
  END IF;

  -- Atomically mark as used
  UPDATE coupons
  SET
    status = 'used',
    redeemed_at = NOW(),
    redeemed_store_id = p_store_id,
    redeemed_staff_id = p_staff_id,
    order_number = p_order_number,
    updated_at = NOW()
  WHERE id = v_coupon.id;

  -- Log success
  INSERT INTO redeem_logs (coupon_id, code, action_type, reason, store_id, staff_id, order_number)
  VALUES (v_coupon.id, p_code, 'redeem_success', NULL, p_store_id, p_staff_id, p_order_number);

  RETURN json_build_object(
    'success', true,
    'coupon_id', v_coupon.id,
    'code', v_coupon.code,
    'discount_amount', v_coupon.discount_amount,
    'reward_type', v_coupon.reward_type,
    'redeemed_at', NOW()::text
  );
END;
$$;

-- ============================================
-- Seed Data
-- ============================================

-- Sample stores
INSERT INTO public.stores (id, name, active) VALUES
  ('store_001', 'Yogurtland - 포항점', true),
  ('store_002', 'Yogurtland - 서울점', true),
  ('store_003', 'Yogurtland - 부산점', true),
  ('store_004', 'Yogurtland - 대구점', true)
ON CONFLICT (id) DO NOTHING;

-- Sample staff
INSERT INTO public.staff_users (id, name, store_id, role) VALUES
  ('staff_001', '김직원', 'store_001', 'staff'),
  ('staff_002', '이직원', 'store_001', 'staff'),
  ('manager_001', '박매니저', 'store_001', 'manager'),
  ('staff_003', '최직원', 'store_002', 'staff'),
  ('admin_001', '관리자', NULL, 'admin')
ON CONFLICT (id) DO NOTHING;

-- Sample coupons for testing
INSERT INTO public.coupons (code, user_id, reward_type, discount_amount, status, expires_at) VALUES
  ('TEST0001', 'test_user_1', 'discount', 3000, 'unused', NOW() + INTERVAL '30 days'),
  ('TEST0002', 'test_user_2', 'discount', 2000, 'unused', NOW() + INTERVAL '30 days'),
  ('TEST0003', 'test_user_3', 'discount', 1000, 'unused', NOW() + INTERVAL '30 days'),
  ('USED0001', 'test_user_4', 'discount', 3000, 'used',   NOW() + INTERVAL '30 days'),
  ('EXPR0001', 'test_user_5', 'discount', 2000, 'unused', NOW() - INTERVAL '1 day')
ON CONFLICT (code) DO NOTHING;

-- Mark USED0001 as actually redeemed
UPDATE public.coupons
SET
  redeemed_at = NOW() - INTERVAL '2 hours',
  redeemed_store_id = 'store_001',
  redeemed_staff_id = 'staff_001',
  order_number = 'ORD-0001'
WHERE code = 'USED0001';
