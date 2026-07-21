import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { buildCsp, generateCspNonce, HSTS_HEADER, STATIC_SECURITY_HEADERS } from "./lib/security/csp";
import { LEGACY_PROD_HOST, SITE_HOST_DA, SITE_HOST_EN, SITE_URL_EN } from "./lib/site-urls";

function applySecurityHeaders(res: NextResponse, nonce: string, isDev: boolean): void {
  for (const [k, v] of Object.entries(STATIC_SECURITY_HEADERS)) {
    // HSTS is https-only (RFC 6797 §7.2). Over the plain-HTTP dev/test server it
    // makes WebKit upgrade every asset to https://localhost and the app dies
    // unhydrated. Production (Vercel, TLS) still gets the full header set.
    if (isDev && k === HSTS_HEADER) continue;
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

  // ── Host routing: .com is the canonical app domain, .dk serves the Danish
  // landing. Assets (anything with a file extension) and API routes always
  // fall through so frames, webhooks, and OAuth callbacks keep working on
  // whichever host they were registered against.
  const host = (request.headers.get("host") ?? "").toLowerCase().split(":")[0];
  const { pathname, search } = request.nextUrl;
  const isPageRequest = !pathname.startsWith("/api/") && !/\.[^/]+$/.test(pathname);

  if (host === `www.${SITE_HOST_EN}` || host === `www.${SITE_HOST_DA}`) {
    const res = NextResponse.redirect(`https://${host.slice(4)}${pathname}${search}`, 308);
    applySecurityHeaders(res, nonce, isDev);
    return res;
  }

  if (host === SITE_HOST_DA) {
    if (pathname === "/") {
      // Danish landing at the .dk root; keep the URL bar clean.
      requestHeaders.set("x-pathname", "/da");
      const res = NextResponse.rewrite(new URL("/da", request.url), {
        request: { headers: requestHeaders },
      });
      applySecurityHeaders(res, nonce, isDev);
      return res;
    }
    if (pathname !== "/da" && isPageRequest) {
      // App lives on the .com — login, dashboard, unsubscribe, all of it.
      const res = NextResponse.redirect(`${SITE_URL_EN}${pathname}${search}`, 308);
      applySecurityHeaders(res, nonce, isDev);
      return res;
    }
  }

  if (host === LEGACY_PROD_HOST && isPageRequest) {
    // Old links in already-sent emails land on the canonical domain. API
    // routes are excluded: provider webhooks registered against this host
    // must keep resolving here, not chase redirects.
    const res = NextResponse.redirect(`${SITE_URL_EN}${pathname}${search}`, 308);
    applySecurityHeaders(res, nonce, isDev);
    return res;
  }

  const supabaseResponse = NextResponse.next({
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

  // IMPORTANT: getUser(), not getSession() (RESEARCH.md anti-pattern)
  const { data: { user } } = await supabase.auth.getUser();

  // Admin API route protection (T-1-04 defense-in-depth), return JSON 401, not redirect
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
