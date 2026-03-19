-- Allow anon users to read coupons (for wallet page)
ALTER TABLE public.coupons ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon_read_own_coupons" ON public.coupons;
CREATE POLICY "anon_read_own_coupons"
  ON public.coupons
  FOR SELECT
  TO anon, authenticated
  USING (true);
