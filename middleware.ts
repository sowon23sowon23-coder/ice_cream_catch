import { NextRequest, NextResponse } from "next/server";

export function middleware(req: NextRequest) {
  if (req.nextUrl.pathname !== "/") {
    return NextResponse.next();
  }

  return NextResponse.redirect(new URL("/entry", req.url));
}

export const config = {
  matcher: ["/"],
};
