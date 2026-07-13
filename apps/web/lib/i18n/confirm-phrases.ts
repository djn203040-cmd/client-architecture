import type { TLanguage } from "@client/shared/validators";

// Type-to-confirm phrases for high-friction gates (autonomous Mode A, danger
// zone). These are shown to the coach in their own language and typed back
// verbatim, so a Danish coach isn't asked to type an English phrase in an
// otherwise-Danish UI.
//
// The gate is deliberate friction, NOT a secret. The server therefore accepts
// the phrase in EITHER supported language (see `matchesConfirmPhrase`) so it
// never has to load the coach's locale just to validate — and a coach who
// switched languages mid-flow can still confirm.
//
// Lives outside the message dictionary on purpose: these strings are validated
// server-side, so keeping them in one small, server-safe module (no React, no
// "use client") makes the security-relevant literals easy to audit.

/** Autonomous Mode A gate — "send drafts without any review". */
export const AUTONOMOUS_MODE_A_PHRASE: Record<TLanguage, string> = {
  en: "send without review",
  da: "send uden gennemgang",
};

/** Danger-zone actions confirmed by a fixed, localized phrase. */
export type DangerPhraseAction =
  | "disconnect-gmail"
  | "disconnect-slack"
  | "disconnect-twilio";

/**
 * Danger-zone disconnect phrases, per action slug. `delete-account` is not
 * here: it confirms against the coach's own email, which is locale-neutral.
 */
export const DANGER_PHRASES: Record<DangerPhraseAction, Record<TLanguage, string>> = {
  "disconnect-gmail": { en: "disconnect gmail", da: "afbryd gmail" },
  "disconnect-slack": { en: "disconnect slack", da: "afbryd slack" },
  "disconnect-twilio": { en: "disconnect twilio", da: "afbryd twilio" },
};

const normalize = (s: string) => s.trim().toLowerCase();

/**
 * True if `input` matches the expected phrase in ANY supported language.
 * Trim- and case-insensitive so trailing spaces / capitalization don't trip up
 * a coach who typed the right words.
 */
export function matchesConfirmPhrase(
  input: string,
  phrases: Record<TLanguage, string>,
): boolean {
  const got = normalize(input);
  return Object.values(phrases).some((p) => normalize(p) === got);
}
