import { NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { resendCoachInvite } from "@/lib/auth/invite-coach";
import { adminInviteLimiter } from "@/lib/security/ratelimit";

const ParamsSchema = z.object({ id: z.string().uuid() });

export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  // Auth gate: must be admin (defense-in-depth, middleware already enforces)
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user || user.app_metadata?.["role"] !== "admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Shares the invite limiter: 5 / 60s per admin
  if (adminInviteLimiter) {
    const { success } = await adminInviteLimiter.limit(user.id);
    if (!success) {
      return NextResponse.json({ error: "Rate limit exceeded, wait a minute" }, { status: 429 });
    }
  }

  const parsed = ParamsSchema.safeParse(await params);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid coach id" }, { status: 400 });
  }

  try {
    const result = await resendCoachInvite(parsed.data.id);
    return NextResponse.json(result);
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Resend failed";
    const status = msg === "Coach not found" ? 404 : msg.startsWith("This coach has already") ? 409 : 500;
    return NextResponse.json({ error: msg }, { status });
  }
}
