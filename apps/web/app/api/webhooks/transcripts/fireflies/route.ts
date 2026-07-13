import { adminClient } from "@/lib/supabase/admin";
import { encryptTranscript } from "@/lib/crypto/transcript-cipher";
import { verifyFirefliesSignature, matchTranscriptToLead } from "@/lib/transcripts/lead-matching";

interface FirefliesPayload {
  meetingId: string;
  eventType: string;
  clientReferenceId?: string;
}

interface FirefliesAttendee {
  email: string | null;
  displayName: string | null;
}

interface FirefliesSentence {
  speaker_name: string;
  text: string;
}

interface FirefliesTranscript {
  id: string;
  title: string;
  date: number; // unix timestamp ms
  meeting_attendees: FirefliesAttendee[];
  sentences: FirefliesSentence[];
}

export async function POST(request: Request) {
  const rawBody = await request.text();
  const coachId = new URL(request.url).searchParams.get("coachId");
  if (!coachId) return new Response("Missing coachId", { status: 400 });

  const valid = verifyFirefliesSignature(
    rawBody,
    request.headers.get("x-hub-signature"),
    process.env.FIREFLIES_WEBHOOK_SECRET!
  );
  if (!valid) return new Response("Unauthorized", { status: 401 });

  // Verify coach exists
  const { data: coach } = await adminClient.from("coaches").select("id").eq("id", coachId).maybeSingle();
  if (!coach) return new Response("Coach not found", { status: 400 });

  const payload = JSON.parse(rawBody) as FirefliesPayload;
  const { meetingId } = payload;

  // Deduplicate: skip if we already stored this transcript
  const { data: existing } = await adminClient
    .from("transcripts")
    .select("id")
    .eq("coach_id", coachId)
    .eq("provider", "fireflies")
    .eq("external_id", meetingId)
    .maybeSingle();
  if (existing) return new Response("OK", { status: 200 });

  // Fetch full transcript via GraphQL
  const gqlResponse = await fetch("https://api.fireflies.ai/graphql", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${process.env.FIREFLIES_API_KEY}`,
    },
    body: JSON.stringify({
      query: `query Transcript($id: String!) {
        transcript(id: $id) {
          id title date
          meeting_attendees { email displayName }
          sentences { speaker_name text }
        }
      }`,
      variables: { id: meetingId },
    }),
  });

  if (!gqlResponse.ok) return new Response("OK", { status: 200 });

  const gqlData = await gqlResponse.json() as { data?: { transcript: FirefliesTranscript } };
  const transcript = gqlData.data?.transcript;
  if (!transcript) return new Response("OK", { status: 200 });

  const attendeeEmails = transcript.meeting_attendees.map((a) => a.email ?? "").filter(Boolean);
  const attendeeNames = transcript.meeting_attendees.map((a) => a.displayName ?? "").filter(Boolean);
  const callAt = new Date(transcript.date).toISOString();
  const content = transcript.sentences.map((s) => `${s.speaker_name}: ${s.text}`).join("\n");

  const match = await matchTranscriptToLead({ coachId, attendeeEmails, attendeeNames, callAt });

  const { data: inserted } = await adminClient.from("transcripts").insert({
    coach_id: coachId,
    lead_id: match.leadId,
    provider: "fireflies",
    content: encryptTranscript(content),
    matched_by: match.matchedBy,
    call_at: callAt,
    external_id: meetingId,
    token_count: content.split(/\s+/).length,
  }).select("id").single();

  if (match.leadId && inserted) {
    void fetch(new URL("/api/drafts/generate", request.url).toString(), {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ leadId: match.leadId }),
    });
  }

  return new Response("OK", { status: 200 });
}
