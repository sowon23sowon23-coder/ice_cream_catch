import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createServerClient, verifyAdminToken } from "@/app/lib/supabaseServer";

const VALID_POSITIONS = ["leaderboard", "home", "coupon"] as const;

const UpdateSchema = z.object({
  id: z.enum(VALID_POSITIONS),
  imageUrl: z.string().max(1000).default(""),
  linkUrl: z.string().url().max(1000).or(z.literal("")).optional(),
  altText: z.string().max(200).optional(),
  active: z.boolean().optional(),
});

export async function POST(req: NextRequest) {
  if (!verifyAdminToken(req.headers.get("authorization"))) {
    return NextResponse.json({ error: "인증이 필요합니다." }, { status: 401 });
  }

  try {
    const body = await req.json();
    const parsed = UpdateSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "잘못된 요청입니다.", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const { id, imageUrl, linkUrl, altText, active } = parsed.data;
    const supabase = createServerClient();

    const { data, error } = await supabase
      .from("ad_banners")
      .upsert({
        id,
        image_url: imageUrl,
        link_url: linkUrl || null,
        ...(altText !== undefined ? { alt_text: altText } : {}),
        ...(active !== undefined ? { active } : {}),
        updated_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({ success: true, banner: data });
  } catch (err) {
    console.error("[admin/ads] Error:", err);
    return NextResponse.json(
      { error: "광고 저장 중 오류가 발생했습니다." },
      { status: 500 }
    );
  }
}
