import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { buildCsp, generateCspNonce, STATIC_SECURITY_HEADERS } from "./lib/security/csp";

function applySecurityHeaders(res: NextResponse, nonce: string, isDev: boolean): void {
  for (const [k, v] of Object.entries(STATIC_SECURITY_HEADERS)) {
    res.headers.set(k, v);
  }
  res.headers.set("Content-Security-Policy", buildCsp({ nonce, isDev }));
  // Expose nonce to server components via downstream request headers.
  res.headers.set("x-csp-nonce", nonce);
}

export async function middleware(request: NextRequest) {
  const isDev = process.env.NODE_ENV !== "production";
  const nonce = generateCspNonce();

  // Forward the nonce + pathname on the inbound request so server components can read them.
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-csp-nonce", nonce);
  requestHeaders.set("x-pathname", request.nextUrl.pathname);

  let supabaseResponse = NextResponse.next({
    request: { headers: requestHeaders },
  });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return request.cookies.getAll(); },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => {
            request.cookies.set(name, value);
            supabaseResponse.cookies.set(name, value, {
              ...options,
              httpOnly: true,
              secure: !isDev,
              sameSite: "lax",
            });
          });
        },
      },
    }
  );

  // IMPORTANT: getUser() — not getSession() (RESEARCH.md anti-pattern)
  const { data: { user } } = await supabase.auth.getUser();

  // Admin API route protection (T-1-04 defense-in-depth) — return JSON 401, not redirect
  if (request.nextUrl.pathname.startsWith("/api/admin")) {
    const isAdmin = user?.app_metadata?.["role"] === "admin";
    if (!user || !isAdmin) {
      const res = NextResponse.json({ error: "Unauthorized" }, { status: 401 });
      applySecurityHeaders(res, nonce, isDev);
      return res;
    }
  }

  // Admin route protection (T-1-04)
  if (request.nextUrl.pathname.startsWith("/admin")) {
    const isAdmin = user?.app_metadata?.["role"] === "admin";
    if (!user || !isAdmin) {
      const res = NextResponse.redirect(new URL("/login", request.url));
      applySecurityHeaders(res, nonce, isDev);
      return res;
    }
  }

  // Protected dashboard routes
  if (
    request.nextUrl.pathname.startsWith("/leads") ||
    request.nextUrl.pathname.startsWith("/drafts") ||
    request.nextUrl.pathname.startsWith("/settings") ||
    request.nextUrl.pathname.startsWith("/dashboard")
  ) {
    if (!user) {
      const res = NextResponse.redirect(new URL("/login", request.url));
      applySecurityHeaders(res, nonce, isDev);
      return res;
    }
  }

  applySecurityHeaders(supabaseResponse, nonce, isDev);
  return supabaseResponse;
}

export const config = {
  matcher: [
    // Run middleware on every page + API route EXCEPT static assets and
    // signature-verified webhook endpoints (they handle their own auth).
    "/((?!_next/static|_next/image|favicon.ico|api/inngest|api/webhooks|api/auth/gmail).*)",
  ],
};
