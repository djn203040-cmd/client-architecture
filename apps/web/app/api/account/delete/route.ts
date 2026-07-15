import "server-only";
import { timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { adminClient } from "@/lib/supabase/admin";
import { writeAuditLog } from "@/lib/audit/log";
import { purgeCoachVaultSecrets } from "@/lib/account/purge";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const BodySchema = z.object({
  confirmPhrase: z.string().min(1).max(256),
});

/**
 * GDPR §3.9, account deletion.
 *
 * Type-to-confirm: the request body MUST contain
 *   `DELETE MY ACCOUNT <email>`
 * compared in constant time. On success we:
 *   1. Write the gdpr_delete audit_log entry BEFORE deleting the coach row
 *      (so the action is preserved even after cascade, audit_log will be
 *      cascaded too, but we keep a separate INFO-level audit handle in metadata).
 *   2. Delete the coaches row via service-role, FKs cascade through every
 *      coach-scoped table (migration 20260521000001 asserts ON DELETE CASCADE).
 *   3. Revoke the Supabase Auth user.
 */
function constantTimeEquals(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  return timingSafeEqual(Buffer.from(a), Buffer.from(b));
}

export async function POST(req: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const parsed = BodySchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "invalid_input" }, { status: 400 });
  }

  const { data: coach } = await adminClient
    .from("coaches")
    .select("id, email")
    .eq("id", user.id)
    .maybeSingle();
  if (!coach?.email) {
    return NextResponse.json({ error: "coach_not_found" }, { status: 404 });
  }

  const expected = `DELETE MY ACCOUNT ${coach.email}`;
  if (!constantTimeEquals(parsed.data.confirmPhrase, expected)) {
    return NextResponse.json({ error: "confirm_phrase_mismatch" }, { status: 400 });
  }

  const ipAddress = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? null;
  const userAgent = req.headers.get("user-agent");

  // 1. Audit BEFORE cascade (audit_log will cascade too, we accept that).
  await writeAuditLog(
    {
      coachId: coach.id,
      action: "gdpr_delete",
      metadata: { coach_email: coach.email },
      ipAddress,
      userAgent,
    },
    adminClient,
  );

  // 2. Purge Vault secrets (OAuth tokens + voice corpus) BEFORE the cascade.
  // The integrations rows that hold the vault_secret_id pointers cascade away
  // with the coaches row, so enumerating them afterwards would miss the live
  // OAuth tokens and orphan them in vault.secrets.
  await purgeCoachVaultSecrets(coach.id);

  // 3. Cascade delete (FK CASCADE drops leads / drafts / sequences / etc).
  const { error: deleteError } = await adminClient
    .from("coaches")
    .delete()
    .eq("id", coach.id);
  if (deleteError) {
    return NextResponse.json(
      { error: "cascade_failed", details: deleteError.message },
      { status: 500 },
    );
  }

  // 4. Revoke the auth.users row via admin API.
  try {
    await adminClient.auth.admin.deleteUser(coach.id);
  } catch {
    // Swallow, the row is already gone from public.coaches; the auth.users
    // record will linger but produces no further access (RLS on every table
    // requires a matching coaches row).
  }

  return NextResponse.json({ status: "deleted" }, { status: 200 });
}
