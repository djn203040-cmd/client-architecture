import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { ResolveStuckSendSchema } from "@client/shared/validators";
import {
  checkGmailForSend,
  fetchStuckSends,
  resolveStuckSend,
} from "@/lib/admin/stuck-sends";

/** Drafts stranded in `sending` (#139). Daniel-only. */
export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user || user.app_metadata?.["role"] !== "admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  return NextResponse.json({ stuck: await fetchStuckSends() });
}

/**
 * Check or resolve one stuck send. `check` is read-only against the coach's
 * Gmail; `mark_sent` / `resend` apply the operator's decision.
 */
export async function POST(request: Request) {
  // Auth gate: must be admin (defense-in-depth, middleware already enforces, T-1-04)
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user || user.app_metadata?.["role"] !== "admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  const parsed = ResolveStuckSendSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid input", details: parsed.error.issues },
      { status: 400 },
    );
  }

  const { draftId, action } = parsed.data;

  if (action === "check") {
    return NextResponse.json(await checkGmailForSend(draftId));
  }

  const result = await resolveStuckSend(draftId, action);
  // A refusal here is a legitimate outcome (already sent, already resolved), not
  // a server fault — 409 so the client can show the reason without treating it
  // as a crash.
  return NextResponse.json(result, { status: result.ok ? 200 : 409 });
}
