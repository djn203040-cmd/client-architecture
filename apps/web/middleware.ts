import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

export async function middleware(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return request.cookies.getAll(); },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => {
            request.cookies.set(name, value);
            supabaseResponse.cookies.set(name, value, options);
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
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  }

  // Admin route protection (T-1-04)
  if (request.nextUrl.pathname.startsWith("/admin")) {
    const isAdmin = user?.app_metadata?.["role"] === "admin";
    if (!user || !isAdmin) {
      return NextResponse.redirect(new URL("/login", request.url));
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
      return NextResponse.redirect(new URL("/login", request.url));
    }
  }

  return supabaseResponse;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|api/inngest|api/webhooks|api/auth/gmail).*)"],
};
