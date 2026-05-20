import "server-only";
import { adminClient } from "@/lib/supabase/admin";
import type { TApproveAtomicResult } from "@client/shared";

export type ApproveActor =
  | "dashboard"
  | "slack"
  | "review_link"
  | "mode_b"
  | "reapprove";

export type HoldActor =
  | "dashboard"
  | "slack"
  | "review_link"
  | "hold_cascade";

function rowToResult(row: unknown): TApproveAtomicResult {
  const r = row as { ok: boolean; reason: string; new_status: string | null };
  return {
    ok: !!r.ok,
    reason: r.reason ?? "unknown",
    new_status: (r.new_status as TApproveAtomicResult["new_status"]) ?? null,
  };
}

export async function approveDraftAtomic(
  draftId: string,
  actor: ApproveActor,
): Promise<TApproveAtomicResult> {
  const { data, error } = await adminClient
    .rpc("approve_draft_atomic", { p_draft_id: draftId, p_actor: actor });

  if (error) {
    return { ok: false, reason: `rpc_error:${error.code ?? "unknown"}`, new_status: null };
  }

  const row = Array.isArray(data) ? data[0] : data;
  if (!row) return { ok: false, reason: "no_result", new_status: null };
  return rowToResult(row);
}

export async function holdDraftAtomic(
  draftId: string,
  actor: HoldActor,
): Promise<TApproveAtomicResult> {
  const { data, error } = await adminClient
    .rpc("hold_draft_atomic", { p_draft_id: draftId, p_actor: actor });

  if (error) {
    return { ok: false, reason: `rpc_error:${error.code ?? "unknown"}`, new_status: null };
  }

  const row = Array.isArray(data) ? data[0] : data;
  if (!row) return { ok: false, reason: "no_result", new_status: null };
  return rowToResult(row);
}

export async function consumeReviewToken(args: {
  tokenId: string;
  coachId: string;
  draftId: string;
  action: "approve" | "hold";
}): Promise<{ ok: boolean; reason: string }> {
  const { data, error } = await adminClient
    .rpc("consume_review_token", {
      p_token_id: args.tokenId,
      p_coach_id: args.coachId,
      p_draft_id: args.draftId,
      p_action: args.action,
    });

  if (error) return { ok: false, reason: `rpc_error:${error.code ?? "unknown"}` };

  const row = Array.isArray(data) ? data[0] : data;
  if (!row) return { ok: false, reason: "no_result" };

  const r = row as { ok: boolean; reason: string };
  return { ok: !!r.ok, reason: r.reason ?? "unknown" };
}
