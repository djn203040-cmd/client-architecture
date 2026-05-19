import { createHmac, timingSafeEqual } from "crypto";
import { adminClient } from "@/lib/supabase/admin";

export function verifyFirefliesSignature(
  rawBody: string,
  signatureHeader: string | null,
  secret: string
): boolean {
  if (!signatureHeader) return false;
  const expected = "sha256=" + createHmac("sha256", secret).update(rawBody).digest("hex");
  const a = Buffer.from(signatureHeader);
  const b = Buffer.from(expected);
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}

export function verifyZoomSignature(
  rawBody: string,
  signature: string | null,
  timestamp: string | null,
  secret: string
): boolean {
  if (!signature || !timestamp) return false;
  const message = `v0:${timestamp}:${rawBody}`;
  const expected = "v0=" + createHmac("sha256", secret).update(message).digest("hex");
  const a = Buffer.from(signature);
  const b = Buffer.from(expected);
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}

type MatchResult =
  | { leadId: string; matchedBy: "email" | "name_timestamp"; confidence?: "high" | "low"; suggestion?: undefined }
  | { leadId: null; matchedBy: null; confidence?: "low"; suggestion: { leadId: string; leadName: string } | null };

function normalizeName(name: string): string {
  return name.toLowerCase().trim().replace(/\s+/g, " ");
}

export async function matchTranscriptToLead(params: {
  coachId: string;
  attendeeEmails: string[];
  attendeeNames: string[];
  callAt: string;
}): Promise<MatchResult> {
  const { coachId, attendeeEmails, attendeeNames, callAt } = params;

  const { data: leads } = await adminClient
    .from("leads")
    .select("id, name, email, created_at")
    .eq("coach_id", coachId);

  if (!leads || leads.length === 0) {
    return { leadId: null, matchedBy: null, suggestion: null };
  }

  // Pass 1: exact email match (case-insensitive)
  const normalizedEmails = attendeeEmails.map((e) => e.toLowerCase());
  for (const lead of leads) {
    if (lead.email && normalizedEmails.includes(lead.email.toLowerCase())) {
      return { leadId: lead.id, matchedBy: "email" };
    }
  }

  // Pass 2: fuzzy name match + timestamp proximity
  const callDate = new Date(callAt);
  const windowMs = 3 * 24 * 60 * 60 * 1000; // ±3 days
  const normalizedAttendees = attendeeNames.map(normalizeName);

  let highMatch: (typeof leads)[0] | null = null;
  let lowMatch: (typeof leads)[0] | null = null;

  for (const lead of leads) {
    const leadName = normalizeName(lead.name);
    const leadCreated = new Date(lead.created_at);
    const withinWindow = Math.abs(callDate.getTime() - leadCreated.getTime()) <= windowMs;

    const nameMatches = normalizedAttendees.some((attendee) => {
      if (attendee === leadName) return true;
      // first+last bidirectional match
      const [af, ...ar] = attendee.split(" ");
      const [lf, ...lr] = leadName.split(" ");
      return af === lf && ar.join(" ") === lr.join(" ");
    });

    if (nameMatches) {
      if (withinWindow) {
        highMatch = lead;
        break;
      } else {
        lowMatch = lead;
      }
    }
  }

  if (highMatch) {
    return { leadId: highMatch.id, matchedBy: "name_timestamp", confidence: "high" };
  }

  if (lowMatch) {
    return { leadId: null, matchedBy: null, confidence: "low", suggestion: { leadId: lowMatch.id, leadName: lowMatch.name } };
  }

  return { leadId: null, matchedBy: null, suggestion: null };
}
