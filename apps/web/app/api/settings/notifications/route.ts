import "server-only";
import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { adminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

const BodySchema = z.object({
  event_type: z.enum([
    "draft_ready",
    "lead_replied",
    "call_outcome_pending",
    "integration_broken",
    "hard_bounce",
  ]),
  channel: z.enum(["dashboard", "email", "slack", "whatsapp", "sms"]),
  enabled: z.boolean(),
});

// Alternate body: the onboarding wizard's "only notify me on the dashboard"
// checkbox. Stored on coaches.notification_settings, where the onboarding
// completion gate reads it.
const AcknowledgeSchema = z.object({
  acknowledge_dashboard_only: z.boolean(),
});

export async function PATCH(req: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => null);

  const ackParsed = AcknowledgeSchema.safeParse(body);
  if (ackParsed.success) {
    const { data: coach } = await adminClient
      .from("coaches")
      .select("notification_settings")
      .eq("id", user.id)
      .single();
    const current = (coach?.notification_settings ?? {}) as Record<string, unknown>;
    const { error } = await adminClient
      .from("coaches")
      .update({
        notification_settings: {
          ...current,
          dashboard_only_acknowledged: ackParsed.data.acknowledge_dashboard_only,
        },
      })
      .eq("id", user.id);
    if (error) {
      return NextResponse.json({ ok: false, reason: "update_failed" }, { status: 500 });
    }
    return NextResponse.json({ ok: true });
  }

  const parsed = BodySchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Invalid input" }, { status: 400 });

  const { event_type, channel, enabled } = parsed.data;

  // D-13: Dashboard is always ON, reject attempts to disable it
  if (channel === "dashboard" && !enabled) {
    return NextResponse.json({ ok: false, reason: "dashboard_always_on" }, { status: 400 });
  }

  // D-15: Hard bounce × SMS is locked ON, reject attempts to disable it
  if (event_type === "hard_bounce" && channel === "sms" && !enabled) {
    return NextResponse.json({ ok: false, reason: "hard_bounce_sms_always_on" }, { status: 400 });
  }

  const { error } = await adminClient.from("notification_preferences").upsert(
    {
      coach_id: user.id,
      event_type,
      channel,
      enabled,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "coach_id,event_type,channel" },
  );

  if (error) {
    return NextResponse.json(
      { ok: false, reason: `update_failed:${error.code ?? "unknown"}` },
      { status: 500 },
    );
  }

  return NextResponse.json({ ok: true });
}
