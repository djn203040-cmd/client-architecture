import "server-only";
import { NextResponse } from "next/server";
import { adminClient } from "@/lib/supabase/admin";
import { verifyResendSignature } from "@/lib/resend/signature";

export const dynamic = "force-dynamic";

type ResendEvent = {
  type: string;
  data: { email_id: string; created_at?: string };
};

const STATUS_MAP: Record<string, "sent" | "delivered" | "failed"> = {
  "email.sent": "sent",
  "email.delivered": "delivered",
  "email.bounced": "failed",
  "email.complained": "failed",
  "email.delivery_delayed": "sent", // not yet confirmed failed
};

export async function POST(req: Request) {
  const rawBody = await req.text();
  const valid = await verifyResendSignature({
    rawBody,
    headers: {
      "svix-id": req.headers.get("svix-id") ?? "",
      "svix-timestamp": req.headers.get("svix-timestamp") ?? "",
      "svix-signature": req.headers.get("svix-signature") ?? "",
    },
    secret: process.env.RESEND_WEBHOOK_SECRET ?? "",
  });

  if (!valid) {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  let event: ResendEvent;
  try {
    event = JSON.parse(rawBody) as ResendEvent;
  } catch {
    return new NextResponse("Bad Request", { status: 400 });
  }

  const newStatus = STATUS_MAP[event.type];
  if (!newStatus) {
    return NextResponse.json({ ok: true, ignored: event.type });
  }

  await adminClient
    .from("notification_log")
    .update({
      status: newStatus,
      sent_at: event.data.created_at ?? new Date().toISOString(),
    })
    .eq("external_id", event.data.email_id)
    .eq("channel", "email");

  return NextResponse.json({ ok: true });
}
