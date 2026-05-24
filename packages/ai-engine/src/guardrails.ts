import type { TLeadStatus } from './types';

export const HARD_BLOCK_STATES: TLeadStatus[] = ['unsubscribed', 'do_not_contact', 'bounced'];

export function isHardBlocked(status: TLeadStatus): boolean {
  return HARD_BLOCK_STATES.includes(status);
}

export function scanNeverSayList(draftText: string, neverSayList: string[]): string[] {
  const lower = draftText.toLowerCase();
  return neverSayList.filter((phrase) => lower.includes(phrase.toLowerCase()));
}

// Hard guarantee no em-dash ("—") or en-dash ("–") reaches a coach, even if
// the model ignores the system-prompt rule. Dashes used as punctuation become
// a comma. Ordinary hyphens ("-", U+002D) in compound words are untouched.
export function stripDashes(draftText: string): string {
  return draftText
    .replace(/\s*[—–]\s*/g, ', ')
    .replace(/\s+,/g, ',')
    .replace(/,\s*,/g, ',');
}

export function assertCoachIdScope(paramCoachId: string, contextCoachId: string): void {
  if (paramCoachId !== contextCoachId) {
    throw new Error(
      `Coach ID scope violation: param coachId "${paramCoachId}" does not match context coachId "${contextCoachId}"`
    );
  }
}
