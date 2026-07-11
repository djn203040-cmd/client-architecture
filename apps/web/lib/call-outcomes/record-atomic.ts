import "server-only";
import { adminClient } from "@/lib/supabase/admin";
import type { TCallOutcomeValue, TCallOutcomeStatus } from "@client/shared";

export type RecordOutcomeActor =
  | "dashboard"
  | "slack"
  | "lead_profile"
  | "provider"
  | "auto";

export interface TRecordCallOutcomeResult {
  ok: boolean;
  reason: string;
  new_status: TCallOutcomeStatus | null;
}

function rowToResult(row: unknown): TRecordCallOutcomeResult {
  const r = row as { ok: boolean; reason: string; new_status: string | null };
  return {
    ok: !!r.ok,
    reason: r.reason ?? "unknown",
    new_status: (r.new_status as TCallOutcomeStatus | null) ?? null,
  };
}

/**
 * Atomically resolve a call_outcomes row to a chosen outcome. Mirrors
 * approveDraftAtomic: delegates to the advisory-lock CAS RPC, which only
 * succeeds when status='awaiting_outcome', double calls / late provider
 * no_show webhooks no-op.
 */
export async function recordCallOutcomeAtomic(
  id: string,
  outcome: TCallOutcomeValue,
  actor: RecordOutcomeActor,
): Promise<TRecordCallOutcomeResult> {
  const { data, error } = await adminClient.rpc("record_call_outcome_atomic", {
    p_id: id,
    p_outcome: outcome,
    p_actor: actor,
  });

  if (error) {
    return { ok: false, reason: `rpc_error:${error.code ?? "unknown"}`, new_status: null };
  }

  const row = Array.isArray(data) ? data[0] : data;
  if (!row) return { ok: false, reason: "no_result", new_status: null };
  return rowToResult(row);
}
