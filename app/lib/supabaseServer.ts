import { createClient } from "@supabase/supabase-js";

/**
 * Server-side Supabase client.
 * Uses the service role key if available (bypasses RLS),
 * falls back to the anon key for read operations.
 */
export function createServerClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  // Service role key is needed for atomic RPC and admin operations
  const key =
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
  return createClient(url, key);
}

export function verifyAdminToken(authHeader: string | null): boolean {
  if (!authHeader) return false;
  const token = authHeader.replace("Bearer ", "").trim();
  return token === process.env.ADMIN_PANEL_TOKEN;
}

export function verifyStaffToken(authHeader: string | null): boolean {
  if (!authHeader) return false;
  const token = authHeader.replace("Bearer ", "").trim();
  return (
    token === process.env.STAFF_TOKEN ||
    token === process.env.ADMIN_PANEL_TOKEN
  );
}
