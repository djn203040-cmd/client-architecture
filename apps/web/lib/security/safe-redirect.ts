import "server-only";

/**
 * Open-redirect guard. Only same-origin paths beginning with `/` are allowed.
 *
 * Blocks:
 *   - Absolute URLs (`https://evil.com/path`)
 *   - Protocol-relative URLs (`//evil.com/path`)
 *   - Backslash tricks (`/\\evil.com`)
 *   - Bare schemes (`javascript:`, `data:`, `mailto:`)
 *
 * Falls back to `/` when the candidate is unsafe.
 */
export function safeRedirectPath(raw: unknown, fallback = "/"): string {
  if (typeof raw !== "string") return fallback;
  const candidate = raw.trim();
  if (candidate.length === 0) return fallback;
  if (!candidate.startsWith("/")) return fallback;
  if (candidate.startsWith("//") || candidate.startsWith("/\\")) return fallback;
  if (candidate.includes("\\")) return fallback;
  // Disallow embedded scheme markers.
  if (/[a-z][a-z0-9+.-]*:/i.test(candidate)) return fallback;
  return candidate;
}
