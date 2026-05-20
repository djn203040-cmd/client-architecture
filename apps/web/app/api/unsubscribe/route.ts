import "server-only";
import { adminClient } from "@/lib/supabase/admin";
import { inngest } from "@/inngest/client";
import { verifyUnsubscribeToken } from "@/lib/unsubscribe-token";
import { LEAD_UNSUBSCRIBED } from "@client/shared/constants/events";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const token = new URL(request.url).searchParams.get("token");

  if (!token) {
    return new Response(null, {
      status: 302,
      headers: { Location: "/unsubscribe?error=invalid_token" },
    });
  }

  const payload = verifyUnsubscribeToken(token);
  if (!payload) {
    return new Response(null, {
      status: 302,
      headers: { Location: "/unsubscribe?error=invalid_token" },
    });
  }

  const { leadId, coachId } = payload;

  const { data: lead } = await adminClient
    .from("leads")
    .select("id, status")
    .eq("id", leadId)
    .eq("coach_id", coachId)
    .maybeSingle();

  if (!lead) {
    return new Response(null, {
      status: 302,
      headers: { Location: "/unsubscribe?error=not_found" },
    });
  }

  if (lead.status === "unsubscribed") {
    return new Response(null, {
      status: 302,
      headers: { Location: "/unsubscribe?done=1" },
    });
  }

  await adminClient
    .from("leads")
    .update({ status: "unsubscribed", do_not_contact: true })
    .eq("id", leadId);

  await adminClient
    .from("sequences")
    .update({ status: "cancelled" })
    .eq("lead_id", leadId)
    .eq("coach_id", coachId)
    .in("status", ["active", "paused"]);

  await adminClient
    .from("drafts")
    .update({ status: "cancelled" })
    .eq("lead_id", leadId)
    .eq("coach_id", coachId)
    .eq("status", "pending");

  await adminClient.from("lead_events").insert({
    lead_id: leadId,
    coach_id: coachId,
    event_type: "state_changed",
    payload: { to: "unsubscribed", trigger: "unsubscribe_link" },
    triggered_by: "system",
  });

  await inngest.send({
    name: LEAD_UNSUBSCRIBED,
    data: { coachId, leadId },
  });

  return new Response(null, {
    status: 302,
    headers: { Location: "/unsubscribe?done=1" },
  });
}
