import "server-only";

/**
 * Injects a 1×1 tracking pixel before </body> in an HTML email body.
 * Token encodes draftId; never exposes raw DB IDs in URL (GMAIL-006).
 * @param htmlBody - Full HTML email body
 * @param draftId - Draft UUID to track
 * @returns HTML body with tracking pixel injected
 */
export function injectTrackingPixel(htmlBody: string, draftId: string): string {
  const token = Buffer.from(
    JSON.stringify({ draftId, t: Date.now() })
  ).toString("base64url");

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "";
  const pixelUrl = `${appUrl}/api/track/open?d=${token}`;
  const pixel = `<img src="${pixelUrl}" width="1" height="1" style="display:none" alt="" />`;

  return htmlBody.toLowerCase().includes("</body>")
    ? htmlBody.replace(/<\/body>/i, `${pixel}</body>`)
    : htmlBody + pixel;
}
