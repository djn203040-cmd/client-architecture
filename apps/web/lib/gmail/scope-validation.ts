import { REQUIRED_GMAIL_SCOPES } from "./auth";

export type ScopeCheck = { ok: boolean; missing: string[]; granted: string[] };

export function validateGmailScopes(grantedScopes: string[]): ScopeCheck {
  const missing = REQUIRED_GMAIL_SCOPES.filter(s => !grantedScopes.includes(s));
  return { ok: missing.length === 0, missing: [...missing], granted: grantedScopes };
}

export function parseScopeString(scope: string | null | undefined): string[] {
  if (!scope) return [];
  return scope.split(/\s+/).filter(Boolean);
}
