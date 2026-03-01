import { NextRequest, NextResponse } from "next/server";
import { type EntryContactType, formatEntryCode, normalizeEmail, normalizeUsPhone } from "../../lib/entry";
import { getServerSupabase } from "../../lib/serverSupabase";

type EntryRequest = {
  contactType?: EntryContactType;
  contactValue?: string;
  consent?: boolean;
};

function getClientIp(req: NextRequest): string {
  const forwarded = req.headers.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0].trim();
  return req.headers.get("x-real-ip") || "unknown";
}

function normalizeByType(contactType: EntryContactType, rawValue: string): string | null {
  if (contactType === "phone") return normalizeUsPhone(rawValue);
  return normalizeEmail(rawValue);
}

export async function POST(req: NextRequest) {
  const supabase = getServerSupabase();
  if (!supabase) {
    return NextResponse.json({ error: "Server is not configured." }, { status: 500 });
  }

  const ip = getClientIp(req);
  const key = `entry:ip:${ip}`;
  const rateLimitRes = await supabase.rpc("check_rate_limit", {
    p_key: key,
    p_limit: 3,
    p_window_seconds: 60,
  });

  if (rateLimitRes.error) {
    return NextResponse.json({ error: "Rate limit check failed." }, { status: 500 });
  }

  const rpcData = rateLimitRes.data as unknown;
  const allowed =
    typeof rpcData === "boolean"
      ? rpcData
      : Array.isArray(rpcData)
        ? Boolean((rpcData[0] as { allowed?: boolean } | undefined)?.allowed)
        : Boolean((rpcData as { allowed?: boolean } | null)?.allowed);

  if (!allowed) {
    return NextResponse.json({ error: "Too many requests. Please try again in a minute." }, { status: 429 });
  }

  let body: EntryRequest;
  try {
    body = (await req.json()) as EntryRequest;
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  const contactType = body.contactType;
  const contactValue = (body.contactValue || "").trim();
  const consent = body.consent === true;

  if (contactType !== "phone" && contactType !== "email") {
    return NextResponse.json({ error: "Invalid contact type." }, { status: 400 });
  }
  if (!consent) {
    return NextResponse.json({ error: "Consent is required." }, { status: 400 });
  }

  const normalized = normalizeByType(contactType, contactValue);
  if (!normalized) {
    return NextResponse.json({ error: "Invalid contact format." }, { status: 400 });
  }

  const nowIso = new Date().toISOString();
  let entryId: number | null = null;
  let isNew = false;

  const insertRes = await supabase
    .from("entries")
    .insert([
      {
        contact_type: contactType,
        contact_value: normalized,
        consent_at: nowIso,
      },
    ])
    .select("id")
    .single();

  if (!insertRes.error && insertRes.data) {
    entryId = Number(insertRes.data.id);
    isNew = true;
  } else if (insertRes.error?.code === "23505") {
    const existingRes = await supabase
      .from("entries")
      .select("id")
      .eq("contact_type", contactType)
      .eq("contact_value", normalized)
      .single();

    if (existingRes.error || !existingRes.data) {
      return NextResponse.json({ error: "Failed to resolve existing entry." }, { status: 500 });
    }
    entryId = Number(existingRes.data.id);
    isNew = false;
  } else {
    return NextResponse.json({ error: insertRes.error?.message || "Failed to create entry." }, { status: 500 });
  }

  if (!entryId || !Number.isFinite(entryId)) {
    return NextResponse.json({ error: "Failed to create entry." }, { status: 500 });
  }

  const entryCode = formatEntryCode(entryId);
  const response = NextResponse.json({ entryId, entryCode, isNew });
  response.cookies.set("entry_id", String(entryId), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 120,
  });

  return response;
}
