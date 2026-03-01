import { NextRequest, NextResponse } from "next/server";

export function middleware(req: NextRequest) {
  if (req.nextUrl.pathname !== "/") {
    return NextResponse.next();
  }

  const entryId = req.cookies.get("entry_id")?.value;
  if (!entryId) {
    return NextResponse.redirect(new URL("/entry", req.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/"],
};
