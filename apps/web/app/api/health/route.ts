import { NextResponse } from "next/server";
import { adminClient } from "@/lib/supabase/admin";
import { healthLimiter, enforce, ipFromRequest } from "@/lib/security/ratelimit";

// 06-PLAN.md §1.10, Health check with per-dependency status.
// Public endpoint; rate-limited at the edge (Upstash). No PII leaked.

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type Status = "ok" | "degraded" | "down" | "unknown";

interface DepHealth {
  status: Status;
  latency_ms?: number;
  error?: string;
}

async function probeSupabase(): Promise<DepHealth> {
  const start = Date.now();
  try {
    const { error } = await adminClient.from("coaches").select("id", { head: true, count: "exact" }).limit(1);
    if (error) return { status: "down", error: error.message, latency_ms: Date.now() - start };
    return { status: "ok", latency_ms: Date.now() - start };
  } catch (e) {
    return { status: "down", error: e instanceof Error ? e.message : "unknown", latency_ms: Date.now() - start };
  }
}

function probeInngest(): DepHealth {
  return {
    status: process.env["INNGEST_SIGNING_KEY"] ? "ok" : "unknown",
  };
}

function probeGmail(): DepHealth {
  return {
    status: process.env["GOOGLE_CLIENT_ID"] && process.env["GOOGLE_CLIENT_SECRET"] ? "ok" : "unknown",
  };
}

function probeTwilio(): DepHealth {
  return {
    status: process.env["TWILIO_ACCOUNT_SID"] && process.env["TWILIO_AUTH_TOKEN"] ? "ok" : "unknown",
  };
}

export async function GET(req: Request) {
  const rl = await enforce(healthLimiter, ipFromRequest(req));
  if (!rl.success) {
    return NextResponse.json(
      { error: "rate_limited" },
      { status: 429, headers: { "Retry-After": "60" } },
    );
  }

  const [supabase] = await Promise.all([probeSupabase()]);
  const deps = {
    supabase,
    inngest: probeInngest(),
    gmail_api: probeGmail(),
    twilio: probeTwilio(),
  };

  const ok = Object.values(deps).every((d) => d.status === "ok" || d.status === "unknown");

  return NextResponse.json(
    {
      ok,
      timestamp: new Date().toISOString(),
      deps,
    },
    {
      status: ok ? 200 : 503,
      headers: { "Cache-Control": "no-store" },
    },
  );
}
