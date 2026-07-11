import "server-only";
import { adminClient } from "@/lib/supabase/admin";
import { inngest } from "@/inngest/client";
import { verifyGmailPubSubJwt } from "@/lib/security/verify-gmail-pubsub";

export const dynamic = "force-dynamic";

interface PubSubMessage {
  message: {
    data: string; // base64url-encoded JSON: { emailAddress: string, historyId: string }
    messageId: string;
    publishTime: string;
  };
  subscription: string;
}

/**
 * Expected JWT audience, set when creating the push subscription. Falls back
 * to the full endpoint URL when not configured explicitly.
 */
function expectedAudience(req: Request): string {
  const fromEnv = process.env["GMAIL_PUBSUB_PUSH_AUDIENCE"];
  if (fromEnv) return fromEnv;
  const url = new URL(req.url);
  return `${url.protocol}//${url.host}${url.pathname}`;
}

export async function POST(request: Request) {
  // Verify the Google-signed JWT BEFORE reading the payload (T-06-02-01).
  const verification = await verifyGmailPubSubJwt(
    request.headers.get("authorization"),
    {
      expectedAudience: expectedAudience(request),
      ...(process.env["GMAIL_PUBSUB_PUSH_SERVICE_ACCOUNT"]
        ? { expectedEmail: process.env["GMAIL_PUBSUB_PUSH_SERVICE_ACCOUNT"] }
        : {}),
    },
  );
  if (!verification.ok) {
    // 401 for forged JWTs. We don't return 200 here, only Google-signed
    // pushes should reach us; a forged push is not a real Pub/Sub retry.
    return new Response("Unauthorized", { status: 401 });
  }

  try {
    const body = (await request.json()) as PubSubMessage;

    // Validate structure, ACK malformed messages to prevent GCP retry storms (T-03-13)
    if (!body?.message?.data || !body.message.messageId) {
      return new Response("OK", { status: 200 });
    }

    let decoded: { emailAddress: string; historyId: string };
    try {
      decoded = JSON.parse(
        Buffer.from(body.message.data, "base64url").toString("utf8")
      ) as { emailAddress: string; historyId: string };
    } catch {
      return new Response("OK", { status: 200 });
    }

    const { emailAddress, historyId } = decoded;
    if (!emailAddress || !historyId) {
      return new Response("OK", { status: 200 });
    }

    // Route to the correct coach by Gmail email address
    const { data: coach } = await adminClient
      .from("coaches")
      .select("id")
      .eq("email", emailAddress)
      .maybeSingle();

    // Always ACK even if coach not found, prevents retry storms (T-03-11)
    if (!coach) {
      return new Response("OK", { status: 200 });
    }

    // Fire Inngest event for async processing (must respond within GCP 10s deadline)
    await inngest.send({
      name: "gmail/notification_received",
      data: {
        coachId: coach.id,
        historyId,
        emailAddress,
        pubsubMessageId: body.message.messageId,
      },
    });

    return new Response("OK", { status: 200 });
  } catch {
    // Any error after verification: still return 200 to prevent GCP retry storm (T-03-13)
    return new Response("OK", { status: 200 });
  }
}
