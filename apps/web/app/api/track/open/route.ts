import "server-only";
import { adminClient } from "@/lib/supabase/admin";
import { enforce, ipFromRequest, trackOpenLimiter } from "@/lib/security/ratelimit";

export const dynamic = "force-dynamic";

// 1×1 transparent GIF, standard tracking pixel (GMAIL-006)
const TRANSPARENT_GIF = Buffer.from(
  "R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7",
  "base64"
);

const GIF_RESPONSE_HEADERS = {
  "Content-Type": "image/gif",
  "Cache-Control": "no-store, no-cache, must-revalidate",
  Pragma: "no-cache",
  "Content-Length": String(TRANSPARENT_GIF.length),
};

export async function GET(request: Request) {
  // Always return the pixel regardless of processing outcome (GMAIL-007)
  const token = new URL(request.url).searchParams.get("d");

  // Rate-limit the DB work per IP (#86). A throttled hit still gets the GIF, 
  // real clients never see an error, but we skip the reads + insert entirely,
  // so a scripted flood can't amplify into unbounded Supabase writes.
  const { success } = await enforce(trackOpenLimiter, ipFromRequest(request));

  if (token && success) {
    try {
      const payload = JSON.parse(
        Buffer.from(token, "base64url").toString("utf8")
      ) as { draftId: string; t: number };

      if (payload.draftId) {
        const { data: draft } = await adminClient
          .from("drafts")
          .select("id, coach_id, lead_id")
          .eq("id", payload.draftId)
          .maybeSingle();

        if (draft) {
          // Idempotent: skip if already logged an open event for this draft
          const { data: existing } = await adminClient
            .from("email_events")
            .select("id")
            .eq("draft_id", draft.id)
            .eq("event_type", "opened")
            .maybeSingle();

          if (!existing) {
            await adminClient.from("email_events").insert({
              draft_id: draft.id,
              coach_id: draft.coach_id,
              lead_id: draft.lead_id,
              event_type: "opened",
              open_source: "pixel",
            });
          }
        }
      }
    } catch {
      // Malformed token, silently ignore, still serve the pixel
    }
  }

  return new Response(TRANSPARENT_GIF, { headers: GIF_RESPONSE_HEADERS });
}
