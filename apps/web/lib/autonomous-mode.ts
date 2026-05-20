export type AutonomousMode = "off" | "mode_a" | "mode_b";
export type ApiMode = "manual" | "mode_a" | "mode_b";

const CONFIRMATION_PHRASE = "send without review";

/**
 * Pure helper: given a coach's DB autonomous_mode, return what status a new draft should have.
 * Mode A bypasses the queue → approved. All others → pending (manual review).
 */
export function createDraftForCoach(
  coachMode: AutonomousMode | string,
  _draftInput: Record<string, unknown>,
): { status: "approved" | "pending" } {
  return { status: coachMode === "mode_a" ? "approved" : "pending" };
}

/**
 * Pure helper: validate an autonomous-mode change request.
 * Mode A requires the exact confirmation phrase (case-sensitive, trimmed).
 * Returns { ok, reason } — caller is responsible for DB write.
 */
export function setAutonomousMode(
  mode: ApiMode | string,
  phrase?: string,
): { ok: boolean; reason?: string } {
  if (mode === "mode_a" && (phrase ?? "").trim() !== CONFIRMATION_PHRASE) {
    return { ok: false, reason: "phrase_mismatch" };
  }
  return { ok: true };
}

/** Map the API-friendly mode name to the DB enum value. */
export function apiModeToDbMode(mode: ApiMode): AutonomousMode {
  return mode === "manual" ? "off" : mode;
}

/** Map the DB value back to the API-friendly mode name. */
export function dbModeToApiMode(dbMode: AutonomousMode | string | null | undefined): ApiMode {
  if (dbMode === "mode_a") return "mode_a";
  if (dbMode === "mode_b") return "mode_b";
  return "manual";
}

export interface TDraftOutcomeEvent {
  name: string;
  data: Record<string, unknown>;
}

export interface TDraftOutcome {
  status: "approved" | "pending";
  events: TDraftOutcomeEvent[];
}

/**
 * Pure helper: given a coach's autonomous mode, return the terminal draft status
 * and the Inngest events to fire after generation completes.
 *   mode_a  → approved, fire send_via_gmail immediately
 *   mode_b  → pending, start 24h auto-send timer
 *   off/null → pending, start follow-up CTA + notify coach on all channels
 */
export function buildDraftOutcome(
  mode: string | null | undefined,
  draftId: string,
  coachId: string,
  leadName: string,
  confidenceLevel: "high" | "low",
  now: string,
): TDraftOutcome {
  if (mode === "mode_a") {
    return {
      status: "approved",
      events: [{ name: "draft/send_via_gmail", data: { draftId, coachId, source: "mode_a" } }],
    };
  }

  if (mode === "mode_b") {
    const scheduledSendAt = new Date(
      new Date(now).getTime() + 24 * 60 * 60 * 1000,
    ).toISOString();
    return {
      status: "pending",
      events: [{ name: "draft/created_mode_b", data: { draftId, coachId, scheduledSendAt } }],
    };
  }

  return {
    status: "pending",
    events: [
      { name: "draft/created_pending", data: { draftId, coachId, createdAt: now } },
      {
        name: "notification/draft_ready",
        data: {
          coachId,
          eventType: "draft_ready",
          payload: { draftId, leadName, confidenceLevel },
        },
      },
    ],
  };
}
