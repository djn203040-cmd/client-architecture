import "server-only";
import { NextResponse } from "next/server";
import { adminClient } from "@/lib/supabase/admin";
import { verifyTwilioSignature } from "@/lib/twilio/signature";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const STATUS_MAP: Record<string, "sent" | "delivered" | "failed"> = {
  queued: "sent",
  accepted: "sent",
  sending: "sent",
  sent: "sent",
  delivered: "delivered",
  read: "delivered",
  failed: "failed",
  undelivered: "failed",
};

export async function POST(req: Request) {
  const rawBody = await req.text();
  const params = Object.fromEntries(
    new URLSearchParams(rawBody),
  ) as Record<string, string>;

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "";
  const fullUrl = `${appUrl}/api/webhooks/twilio/status`;
  const signature = req.headers.get("x-twilio-signature") ?? "";
  const authToken = process.env.TWILIO_AUTH_TOKEN ?? "";

  const valid = verifyTwilioSignature({ authToken, signature, fullUrl, params });
  if (!valid) return new NextResponse("Unauthorized", { status: 401 });

  const sid = params.MessageSid;
  const rawStatus = params.MessageStatus;

  if (!sid) {
    return NextResponse.json({ ok: false, error: "missing_params" }, { status: 400 });
  }

  if (!rawStatus) {
    return NextResponse.json({ ok: false, error: "missing_params" }, { status: 400 });
  }

  const mapped = STATUS_MAP[rawStatus.toLowerCase()];
  if (!mapped) {
    return NextResponse.json({ ok: true, ignored: rawStatus });
  }

  const update: Record<string, unknown> = { status: mapped };
  if (mapped === "delivered") {
    update.delivered_at = new Date().toISOString();
  }
  if (mapped === "failed") {
    const code = params.ErrorCode ?? "unknown";
    const msg = params.ErrorMessage;
    update.error_message = msg
      ? `twilio:${code}:${msg}`
      : `twilio:${code}`;
  }

  await adminClient
    .from("notification_log")
    .update(update)
    .eq("external_id", sid)
    .in("channel", ["whatsapp", "sms"]);

  return NextResponse.json({ ok: true });
}
