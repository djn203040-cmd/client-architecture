import "server-only";
import { NextResponse } from "next/server";
import { verifyReviewToken } from "@/lib/review-token";
import { adminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

// Read-only, explicitly does NOT import or call consumeReviewToken
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ token: string }> },
) {
  const { token } = await params;
  const payload = verifyReviewToken(token);
  if (!payload) {
    return NextResponse.json({ error: "invalid_token" }, { status: 401 });
  }

  const { data: draft } = await adminClient
    .from("drafts")
    .select(
      "id, body, subject, status, scheduled_send_at, confidence_level, lead_id, review_token_nonce, touchpoint_index, total_touchpoints",
    )
    .eq("id", payload.draftId)
    .single();

  if (!draft) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }

  if (draft.review_token_nonce !== payload.nonce) {
    return NextResponse.json({ error: "already_actioned" }, { status: 410 });
  }

  return NextResponse.json({ draft });
}
