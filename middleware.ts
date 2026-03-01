import { NextRequest, NextResponse } from "next/server";

export function middleware(req: NextRequest) {
  if (req.nextUrl.pathname !== "/") {
    return NextResponse.next();
  }

  const entryId = req.cookies.get("entry_id")?.value;
  const target = entryId ? "/game" : "/entry";
  return NextResponse.redirect(new URL(target, req.url));
}

export const config = {
  matcher: ["/"],
};

