import { createHmac } from "crypto";
import { adminClient } from "@/lib/supabase/admin";
import { verifyZoomSignature, matchTranscriptToLead } from "@/lib/transcripts/lead-matching";
import { parseVtt } from "@/lib/transcripts/vtt-parser";

interface ZoomRecordingFile {
  file_type: string;
  download_url: string;
}

interface ZoomPayloadObject {
  uuid: string;
  account_email: string;
  start_time: string;
  duration: number;
  recording_files: ZoomRecordingFile[];
  participant_audio_files?: Array<{ meeting_attendees?: Array<{ email?: string; name?: string }> }>;
}

interface ZoomUrlValidationPayload {
  event: "endpoint.url_validation";
  payload: { plainToken: string };
}

interface ZoomTranscriptPayload {
  event: "recording.transcript_completed";
  payload: { object: ZoomPayloadObject };
}

type ZoomPayload = ZoomUrlValidationPayload | ZoomTranscriptPayload;

export async function POST(request: Request) {
  const rawBody = await request.text();
  const signature = request.headers.get("x-zm-signature");
  const timestamp = request.headers.get("x-zm-request-timestamp");

  const valid = verifyZoomSignature(rawBody, signature, timestamp, process.env.ZOOM_WEBHOOK_SECRET_TOKEN!);
  if (!valid) return new Response("Unauthorized", { status: 401 });

  const payload = JSON.parse(rawBody) as ZoomPayload;

  // URL validation challenge
  if (payload.event === "endpoint.url_validation") {
    const { plainToken } = payload.payload;
    const encryptedToken = createHmac("sha256", process.env.ZOOM_WEBHOOK_SECRET_TOKEN!)
      .update(plainToken)
      .digest("hex");
    return Response.json({ plainToken, encryptedToken });
  }

  if (payload.event !== "recording.transcript_completed") {
    return new Response("OK", { status: 200 });
  }

  const obj = payload.payload.object;
  const transcriptFile = obj.recording_files.find((f) => f.file_type === "TRANSCRIPT");
  if (!transcriptFile) return new Response("OK", { status: 200 });

  // Resolve coach from integrations table via Zoom account email
  const { data: integration } = await adminClient
    .from("integrations")
    .select("coach_id, vault_secret_id")
    .eq("provider", "zoom")
    .maybeSingle();

  if (!integration) {
    // Coach has not connected Zoom — return 200 so Zoom stops retrying
    return new Response("OK", { status: 200 });
  }

  const { coach_id: coachId, vault_secret_id: vaultSecretId } = integration;

  // Retrieve Zoom access token from Vault
  let zoomAccessToken: string | null = null;
  try {
    const { data: secret } = await adminClient.rpc("vault.decryptSecret", {
      secret_id: vaultSecretId,
    }) as { data: { decrypted_secret: string } | null };
    zoomAccessToken = secret?.decrypted_secret ?? null;
  } catch {
    // Vault lookup failed — store empty-content transcript and return
    await adminClient.from("transcripts").insert({
      coach_id: coachId,
      lead_id: null,
      provider: "zoom",
      content: "",
      matched_by: null,
      call_at: obj.start_time,
      external_id: obj.uuid,
      duration_seconds: obj.duration * 60,
    });
    return new Response("OK", { status: 200 });
  }

  // Download VTT
  let content = "";
  if (zoomAccessToken) {
    const vttResponse = await fetch(transcriptFile.download_url, {
      headers: { Authorization: `Bearer ${zoomAccessToken}` },
    });
    if (vttResponse.ok) {
      content = parseVtt(await vttResponse.text());
    }
  }

  // Extract attendees for matching
  const attendeeEmails: string[] = [];
  const attendeeNames: string[] = [];
  for (const audioFile of obj.participant_audio_files ?? []) {
    for (const attendee of audioFile.meeting_attendees ?? []) {
      if (attendee.email) attendeeEmails.push(attendee.email);
      if (attendee.name) attendeeNames.push(attendee.name);
    }
  }

  const callAt = obj.start_time;
  const match = await matchTranscriptToLead({ coachId, attendeeEmails, attendeeNames, callAt });

  const { data: inserted } = await adminClient.from("transcripts").insert({
    coach_id: coachId,
    lead_id: match.leadId,
    provider: "zoom",
    content,
    matched_by: match.matchedBy,
    call_at: callAt,
    external_id: obj.uuid,
    duration_seconds: obj.duration * 60,
    token_count: content ? content.split(/\s+/).length : null,
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
