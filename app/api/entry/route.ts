import { NextResponse, type NextRequest } from "next/server";
import {
  type EntryContactType,
  formatEntryCode,
  normalizeEmail,
  normalizeUsPhone,
} from "@/app/lib/entry";
import { createServerClient } from "@/app/lib/supabaseServer";

type EntryRequest = {
  contactType?: EntryContactType;
  contactValue?: string;
  consent?: boolean;
};

function normalizeByType(contactType: EntryContactType, rawValue: string): string | null {
  if (contactType === "phone") return normalizeUsPhone(rawValue);
  return normalizeEmail(rawValue);
}

export async function POST(req: NextRequest) {
  const supabase = createServerClient();

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
