import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { InviteCoachSchema } from "@client/shared/validators";
import { inviteCoach } from "@/lib/auth/invite-coach";
import { adminInviteLimiter } from "@/lib/security/ratelimit";

export async function POST(request: Request) {
  // Auth gate: must be admin (defense-in-depth — middleware already enforces, T-1-04)
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user || user.app_metadata?.["role"] !== "admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Rate limit (INFRA-009): 5 invites / 60s per admin
  if (adminInviteLimiter) {
    const { success, limit, remaining } = await adminInviteLimiter.limit(user.id);
    if (!success) {
      return NextResponse.json(
        { error: "Rate limit exceeded — wait a minute" },
        {
          status: 429,
          headers: {
            "X-RateLimit-Limit": String(limit),
            "X-RateLimit-Remaining": String(remaining),
          },
        },
      );
    }
  }

  // Validate body with Zod before touching any service
  const body = await request.json().catch(() => null);
  const parsed = InviteCoachSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid input", details: parsed.error.issues },
      { status: 400 },
    );
  }

  // Invite via Supabase Admin API + create coaches row
  try {
    const result = await inviteCoach(parsed.data);
    return NextResponse.json(result);
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Invite failed";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
