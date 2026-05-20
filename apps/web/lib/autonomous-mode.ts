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
