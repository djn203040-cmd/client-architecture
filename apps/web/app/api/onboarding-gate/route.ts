import { NextRequest, NextResponse } from "next/server";

export function GET(request: NextRequest) {
  const to = request.nextUrl.searchParams.get("to") ?? "/onboarding/welcome";
  const response = NextResponse.redirect(new URL(to, request.url));
  response.cookies.set("onb_redirected", "1", {
    httpOnly: false,
    sameSite: "lax",
    path: "/",
  });
  return response;
}
