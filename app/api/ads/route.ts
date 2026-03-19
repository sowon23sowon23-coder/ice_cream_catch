import { NextResponse } from "next/server";
import { createServerClient } from "@/app/lib/supabaseServer";

export async function GET() {
  try {
    const supabase = createServerClient();
    const { data, error } = await supabase
      .from("ad_banners")
      .select("id, image_url, link_url, alt_text, active");

    if (error) throw error;

    // Return as a map keyed by position id for easy lookup
    const banners: Record<string, { imageUrl: string; linkUrl: string | null; altText: string; active: boolean }> = {};
    for (const row of data ?? []) {
      banners[row.id] = {
        imageUrl: row.image_url ?? "",
        linkUrl: row.link_url ?? null,
        altText: row.alt_text ?? "요거트랜드 광고",
        active: row.active ?? true,
      };
    }

    return NextResponse.json({ banners }, {
      headers: { "Cache-Control": "s-maxage=60, stale-while-revalidate=300" },
    });
  } catch (err) {
    console.error("[ads] Error:", err);
    return NextResponse.json({ banners: {} }, { status: 500 });
  }
}
