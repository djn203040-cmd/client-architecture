import { NextRequest, NextResponse } from "next/server";

export function GET(request: NextRequest) {
  const requested = request.nextUrl.searchParams.get("to") ?? "/onboarding/welcome";
  // Only ever redirect to an internal, same-origin path. `new URL(to, base)`
  // would let an absolute ("https://evil.com") or protocol-relative ("//evil.com")
  // target override the origin — an open redirect off a trusted domain.
  const to =
    requested.startsWith("/") && !requested.startsWith("//") && !requested.includes("\\")
      ? requested
      : "/onboarding/welcome";
  const response = NextResponse.redirect(new URL(to, request.url));
  response.cookies.set("onb_redirected", "1", {
    httpOnly: false,
    sameSite: "lax",
    path: "/",
  });
  return response;
}
