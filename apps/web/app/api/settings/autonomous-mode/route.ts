import "server-only";
import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { adminClient } from "@/lib/supabase/admin";
import { apiModeToDbMode } from "@/lib/autonomous-mode";
import {
  AUTONOMOUS_MODE_A_PHRASE,
  matchesConfirmPhrase,
} from "@/lib/i18n/confirm-phrases";

export const dynamic = "force-dynamic";

const BodySchema = z.object({
  mode: z.enum(["manual", "mode_a", "mode_b"]),
  confirmation_phrase: z.string().optional(),
});

export async function PATCH(req: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const parsed = BodySchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid input", details: parsed.error.issues }, { status: 400 });
  }
  const { mode, confirmation_phrase } = parsed.data;

  // Server-side authority for Mode A high-friction gate (T-04-06-01). Accepts
  // the confirmation phrase in either supported language — the gate is friction,
  // not a secret, so we don't need to look up the coach's locale here.
  if (mode === "mode_a") {
    if (!matchesConfirmPhrase(confirmation_phrase ?? "", AUTONOMOUS_MODE_A_PHRASE)) {
      return NextResponse.json({ ok: false, reason: "phrase_mismatch" }, { status: 400 });
    }
  }

  const { error } = await adminClient
    .from("coaches")
    .update({ autonomous_mode: apiModeToDbMode(mode), updated_at: new Date().toISOString() })
    .eq("id", user.id);

  if (error) {
    return NextResponse.json(
      { ok: false, reason: `update_failed:${error.code ?? "unknown"}` },
      { status: 500 },
    );
  }

  // Audit log on Mode A toggle, best-effort, activity_log table may not exist (T-04-06-04)
  if (mode === "mode_a") {
    try {
      await adminClient
        .from("activity_log")
        .insert({
          coach_id: user.id,
          lead_id: null,
          event_type: "autonomous_mode_a_enabled",
          payload: { source: "settings_ui" },
        });
    } catch {
      // Non-fatal, table may not exist in schema
    }
  }

  return NextResponse.json({ ok: true, mode });
}
