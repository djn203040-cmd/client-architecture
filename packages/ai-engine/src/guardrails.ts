import type { TLeadStatus } from './types';

export const HARD_BLOCK_STATES: TLeadStatus[] = ['unsubscribed', 'do_not_contact', 'bounced'];

export function isHardBlocked(status: TLeadStatus): boolean {
  return HARD_BLOCK_STATES.includes(status);
}

export function scanNeverSayList(draftText: string, neverSayList: string[]): string[] {
  const lower = draftText.toLowerCase();
  return neverSayList.filter((phrase) => lower.includes(phrase.toLowerCase()));
}

export function assertCoachIdScope(paramCoachId: string, contextCoachId: string): void {
  if (paramCoachId !== contextCoachId) {
    throw new Error(
      `Coach ID scope violation: param coachId "${paramCoachId}" does not match context coachId "${contextCoachId}"`
    );
  }
}
