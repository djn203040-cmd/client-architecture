import "server-only";
import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { adminClient } from "@/lib/supabase/admin";
import { writeAuditLog } from "@/lib/audit/log";
import { getResendClient } from "@/lib/resend/client";
import { purgeCoachVaultSecrets } from "@/lib/account/purge";
import { DANGER_PHRASES, matchesConfirmPhrase } from "@/lib/i18n/confirm-phrases";
import type { TAuditAction } from "@client/shared/validators";

export const dynamic = "force-dynamic";

const ConfirmSchema = z.object({ confirmPhrase: z.string() });

type ActionConfig = {
  auditAction: TAuditAction;
  /**
   * Validates the typed confirmation against `email` (needed only by
   * delete-account, which confirms against the coach's own email). The
   * disconnect actions accept their phrase in either supported language.
   */
  matches: (input: string, email: string) => boolean;
};

const ACTION_MAP: Record<string, ActionConfig> = {
  "disconnect-gmail": {
    auditAction: "gmail_disconnected",
    matches: (input) => matchesConfirmPhrase(input, DANGER_PHRASES["disconnect-gmail"]),
  },
  "disconnect-slack": {
    auditAction: "slack_disconnected",
    matches: (input) => matchesConfirmPhrase(input, DANGER_PHRASES["disconnect-slack"]),
  },
  "disconnect-twilio": {
    auditAction: "twilio_disconnected",
    matches: (input) => matchesConfirmPhrase(input, DANGER_PHRASES["disconnect-twilio"]),
  },
  "delete-account": {
    auditAction: "account_deleted",
    matches: (input, email) => input === email,
  },
};

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ action: string }> },
) {
  const { action } = await params;
  const config = ACTION_MAP[action];
  if (!config) return NextResponse.json({ error: "Unknown action" }, { status: 404 });

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => null);
  const parsed = ConfirmSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Invalid input" }, { status: 400 });

  const { data: coach } = await supabase
    .from("coaches")
    .select("email, name")
    .eq("id", user.id)
    .single();
  if (!coach) return NextResponse.json({ error: "Coach not found" }, { status: 404 });

  if (!config.matches(parsed.data.confirmPhrase, coach.email ?? "")) {
    return NextResponse.json({ error: "Confirmation phrase does not match" }, { status: 400 });
  }

  const ipAddress = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? null;
  const userAgent = req.headers.get("user-agent");

  if (action === "disconnect-gmail") {
    const { data: integration } = await supabase
      .from("integrations")
      .select("vault_secret_id")
      .eq("coach_id", user.id)
      .eq("provider", "gmail")
      .single();

    if (integration?.vault_secret_id) {
      try {
        await adminClient.rpc("delete_vault_secret" as never, {
          secret_id: integration.vault_secret_id,
        });
      } catch {
        // Best-effort vault cleanup
      }
    }

    await adminClient
      .from("integrations")
      .update({ status: "disconnected", vault_secret_id: null })
      .eq("coach_id", user.id)
      .eq("provider", "gmail");
  } else if (action === "disconnect-slack") {
    await adminClient
      .from("integrations")
      .update({ status: "disconnected", vault_secret_id: null })
      .eq("coach_id", user.id)
      .eq("provider", "slack");
  } else if (action === "disconnect-twilio") {
    await adminClient
      .from("integrations")
      .update({ status: "disconnected", vault_secret_id: null })
      .eq("coach_id", user.id)
      .eq("provider", "twilio");
  } else if (action === "delete-account") {
    const resend = getResendClient();
    await resend.emails.send({
      from: "Sonorous <noreply@sonorous.digital>",
      to: coach.email ?? user.email!,
      subject: "Your account has been deleted",
      html: `<p>Hi ${coach.name ?? "there"},</p><p>Your Sonorous account has been deleted as requested. If this was a mistake, please contact us immediately.</p>`,
    }).catch(() => null);

    await resend.emails.send({
      from: "Sonorous <noreply@sonorous.digital>",
      to: "djn203040@gmail.com",
      subject: `Coach account deleted: ${coach.email}`,
      html: `<p>Coach <strong>${coach.name}</strong> (${coach.email}) deleted their account.</p>`,
    }).catch(() => null);

    await writeAuditLog(
      { coachId: user.id, action: config.auditAction, metadata: {}, ipAddress, userAgent },
      adminClient,
    );

    // Purge Vault secrets (OAuth tokens + voice corpus) BEFORE the cascade drops
    // the integrations rows that point at them — otherwise the tokens orphan.
    await purgeCoachVaultSecrets(user.id);

    await adminClient.from("coaches").delete().eq("id", user.id);

    // Remove the Supabase Auth record too, or the "deleted" coach can still log
    // in and their email/PII lingers in auth.users (incomplete GDPR erasure).
    try {
      await adminClient.auth.admin.deleteUser(user.id);
    } catch {
      // Best-effort: the coaches row is already gone, so RLS denies all access
      // regardless; a lingering auth row grants nothing.
    }

    return NextResponse.json({ ok: true });
  }

  await writeAuditLog(
    { coachId: user.id, action: config.auditAction, metadata: {}, ipAddress, userAgent },
    adminClient,
  );

  return NextResponse.json({ ok: true });
}
