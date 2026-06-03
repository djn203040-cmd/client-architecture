import "server-only";
import { adminClient } from "@/lib/supabase/admin";

// D-02: the "How did the call go?" prompt fires this many minutes after the
// call's scheduled end. Configurable per coach in coaches.sequence_config.
const DEFAULT_CALL_OUTCOME_BUFFER_MINUTES = 30;

/**
 * Resolve the per-coach call-outcome prompt buffer (minutes after ends_at).
 * Reads coaches.sequence_config.call_outcome_buffer_minutes; falls back to 30.
 * A non-positive or non-numeric value falls back to the default so the monitor
 * and poller never prompt early or with a negative offset.
 */
export async function getCallOutcomeBufferMinutes(coachId: string): Promise<number> {
  const { data } = await adminClient
    .from("coaches")
    .select("sequence_config")
    .eq("id", coachId)
    .maybeSingle();

  const config = data?.sequence_config as
    | { call_outcome_buffer_minutes?: unknown }
    | null;
  const raw = config?.call_outcome_buffer_minutes;

  if (typeof raw === "number" && Number.isFinite(raw) && raw > 0) {
    return Math.floor(raw);
  }
  return DEFAULT_CALL_OUTCOME_BUFFER_MINUTES;
}
