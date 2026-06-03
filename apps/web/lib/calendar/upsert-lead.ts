import "server-only";
import { adminClient } from "@/lib/supabase/admin";
import type { TCalendarEvent, TLeadStatus, TLeadSource } from "@client/shared";

// Statuses we must never downgrade on a new booking (D-11 never-regress).
// The terminal status uses the renamed enum value 'lost' (migration
// 20260601000002 renamed the old terminal label to 'lost').
const TERMINAL_STATUSES: ReadonlySet<TLeadStatus> = new Set<TLeadStatus>([
  "converted",
  "lost",
  "do_not_contact",
]);

// Calendar provider -> lead_source. The provider enum and lead_source enum share
// the same provider labels for the 7 calendars.
function providerToSource(provider: TCalendarEvent["provider"]): TLeadSource {
  switch (provider) {
    case "calendly":
    case "cal_com":
    case "acuity":
    case "setmore":
    case "square":
    case "ms_bookings":
    case "tidycal":
      return provider;
    default:
      return "manual";
  }
}

/**
 * Resolve (or create) the lead for a booking. Returns the lead id.
 *
 * - Dedup by (coach_id, email) when an email is present; otherwise by
 *   (coach_id, phone) (D-04).
 * - Never regresses an existing terminal/DNC lead's status or contactability
 *   (D-11): a new booking on a converted/lost/do_not_contact lead leaves it
 *   untouched and just returns its id.
 * - No-email bookings create a placeholder lead flagged
 *   external_ids.email_pending = true; an email is never fabricated.
 *
 * Server-only: uses the service-role admin client.
 */
export async function upsertLeadFromBooking(event: TCalendarEvent): Promise<string> {
  const coachId = event.coachId;

  // 1) Find an existing lead — by email if we have one, else by phone.
  let existing: { id: string; status: TLeadStatus; do_not_contact: boolean } | null = null;

  if (event.leadEmail) {
    const { data } = await adminClient
      .from("leads")
      .select("id, status, do_not_contact")
      .eq("coach_id", coachId)
      .eq("email", event.leadEmail)
      .maybeSingle();
    existing = data ?? null;
  } else if (event.leadPhone) {
    const { data } = await adminClient
      .from("leads")
      .select("id, status, do_not_contact")
      .eq("coach_id", coachId)
      .eq("phone", event.leadPhone)
      .maybeSingle();
    existing = data ?? null;
  }

  if (existing) {
    const isTerminal = TERMINAL_STATUSES.has(existing.status) || existing.do_not_contact;

    if (isTerminal) {
      // Never-regress: do not touch status/contactability on terminal or DNC leads.
      return existing.id;
    }

    // Benign existing lead: may refresh name/phone but MUST NOT downgrade status.
    const refresh: { name?: string; phone?: string } = {};
    if (event.leadName) refresh.name = event.leadName;
    if (event.leadPhone) refresh.phone = event.leadPhone;
    if (Object.keys(refresh).length > 0) {
      await adminClient.from("leads").update(refresh).eq("id", existing.id);
    }
    return existing.id;
  }

  // 2) No existing lead — create one. Never fabricate an email.
  const placeholderName =
    event.leadName ?? `Lead — ${event.provider} booking`;

  const externalIds: Record<string, unknown> = {};
  if (!event.leadEmail) externalIds.email_pending = true;

  const { data: inserted, error } = await adminClient
    .from("leads")
    .insert({
      coach_id: coachId,
      name: placeholderName,
      email: event.leadEmail ?? null,
      phone: event.leadPhone ?? null,
      source: providerToSource(event.provider),
      status: "call_booked" as TLeadStatus,
      external_ids: externalIds,
    })
    .select("id")
    .single();

  if (error || !inserted) {
    throw new Error(`upsertLeadFromBooking: insert failed (${error?.code ?? "unknown"})`);
  }

  return inserted.id;
}
