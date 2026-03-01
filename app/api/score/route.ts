import { NextRequest, NextResponse } from "next/server";
import { getServerSupabase } from "../../lib/serverSupabase";

type ScoreRequest = {
  score?: number;
};

function parseEntryId(req: NextRequest): number | null {
  const raw = req.cookies.get("entry_id")?.value;
  if (!raw) return null;
  const id = Number(raw);
  if (!Number.isInteger(id) || id <= 0) return null;
  return id;
}

export async function POST(req: NextRequest) {
  const entryId = parseEntryId(req);
  if (!entryId) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  let body: ScoreRequest;
  try {
    body = (await req.json()) as ScoreRequest;
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  const score = Number(body.score);
  if (!Number.isFinite(score) || score < 0) {
    return NextResponse.json({ error: "Invalid score." }, { status: 400 });
  }

  const safeScore = Math.floor(score);
  const supabase = getServerSupabase();
  if (!supabase) {
    return NextResponse.json({ error: "Server is not configured." }, { status: 500 });
  }

  const currentRes = await supabase
    .from("entries")
    .select("score_best")
    .eq("id", entryId)
    .single();

  if (currentRes.error || !currentRes.data) {
    return NextResponse.json({ error: "Entry not found." }, { status: 404 });
  }

  const currentBest = Number(currentRes.data.score_best || 0);
  if (safeScore > currentBest) {
    const updateRes = await supabase
      .from("entries")
      .update({ score_best: safeScore })
      .eq("id", entryId);

    if (updateRes.error) {
      return NextResponse.json({ error: "Failed to update score." }, { status: 500 });
    }
  }

  return NextResponse.json({ ok: true });
}
