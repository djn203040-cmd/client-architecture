/**
 * Escape the five HTML-significant characters for safe interpolation into an
 * HTML string. Use this anywhere untrusted (lead-controlled) text is spliced
 * into HTML we generate — outgoing emails, coach-notification emails, etc.
 */
export function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

/** Plain-text -> minimal HTML (escaped, newlines -> <br>). */
export function textToHtml(text: string): string {
  return escapeHtml(text).replace(/\r?\n/g, "<br>\n");
}
