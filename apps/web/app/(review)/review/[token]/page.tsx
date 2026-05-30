import "server-only";
import type { ReactNode } from "react";
import type { Route } from "next";
import Link from "next/link";
import { verifyReviewToken } from "@/lib/review-token";
import { adminClient } from "@/lib/supabase/admin";
import { DraftCard } from "@/components/drafts/DraftCard";
import { Button } from "@/components/ui/button";
import type { Database } from "@client/database";

export const dynamic = "force-dynamic";
export const runtime = "nodejs"; // node:crypto for HMAC

type DraftRow = Database["public"]["Tables"]["drafts"]["Row"] & {
  leads: { name: string } | null;
};

type State =
  | { kind: "actionable"; draft: DraftRow; coachName: string; coachTimezone: string | null; token: string }
  | { kind: "already_actioned" }
  | { kind: "expired" }
  | { kind: "invalid" };

async function resolveState(token: string): Promise<State> {
  const payload = verifyReviewToken(token);
  // Invalid signature or expired expiry both fall through to expired state
  if (!payload) return { kind: "expired" };

  // Was the token nonce already consumed?
  const { data: consumed } = await adminClient
    .from("consumed_tokens")
    .select("token_id")
    .eq("token_id", payload.nonce)
    .maybeSingle();
  if (consumed) return { kind: "already_actioned" };

  // Does the nonce still match the draft?
  const { data: draft } = await adminClient
    .from("drafts")
    .select(
      "id, coach_id, lead_id, status, body, subject, scheduled_send_at, review_token_nonce, confidence_level, touchpoint_index, total_touchpoints, created_at, held_at, followup_count, ai_model, approved_at, sent_at, status_locked_at, updated_at, sequence_id, generation_context",
    )
    .eq("id", payload.draftId)
    .maybeSingle();
  if (!draft) return { kind: "invalid" };
  if (draft.review_token_nonce !== payload.nonce) return { kind: "already_actioned" };

  // Fetch lead name for display
  const { data: lead } = await adminClient
    .from("leads")
    .select("name")
    .eq("id", draft.lead_id)
    .maybeSingle();

  const { data: coach } = await adminClient
    .from("coaches")
    .select("name, timezone")
    .eq("id", payload.coachId)
    .single();

  const draftWithLead: DraftRow = {
    ...draft,
    leads: lead ? { name: lead.name } : null,
  };

  return {
    kind: "actionable",
    draft: draftWithLead,
    coachName: coach?.name ?? "your coach",
    coachTimezone: coach?.timezone ?? null,
    token,
  };
}

function StateCard({
  icon,
  heading,
  body,
  ctaHref = "/",
  ctaLabel = "Open dashboard",
}: {
  icon: ReactNode;
  heading: string;
  body: string;
  ctaHref?: Route;
  ctaLabel?: string;
}) {
  return (
    <div className="rounded-2xl backdrop-blur-md bg-white/10 dark:bg-white/5 border border-white/10 p-8 shadow-[inset_0_1px_0_rgba(255,255,255,0.08)] text-center space-y-4">
      <div className="flex justify-center text-muted-foreground">{icon}</div>
      <h1 className="text-xl font-semibold">{heading}</h1>
      <p className="text-sm text-muted-foreground max-w-[65ch] mx-auto">{body}</p>
      <Button asChild variant="ghost" className="min-h-[44px]">
        <Link href={ctaHref}>{ctaLabel}</Link>
      </Button>
    </div>
  );
}

const ClockIcon = () => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="32"
    height="32"
    viewBox="0 0 256 256"
    aria-hidden="true"
  >
    <rect width="256" height="256" fill="none" />
    <circle
      cx="128"
      cy="128"
      r="96"
      fill="none"
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth="16"
    />
    <polyline
      points="128 72 128 128 176 128"
      fill="none"
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth="16"
    />
  </svg>
);

const CheckIcon = () => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="32"
    height="32"
    viewBox="0 0 256 256"
    aria-hidden="true"
  >
    <rect width="256" height="256" fill="none" />
    <circle
      cx="128"
      cy="128"
      r="96"
      fill="none"
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth="16"
    />
    <polyline
      points="88 136 112 160 168 96"
      fill="none"
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth="16"
    />
  </svg>
);

export default async function ReviewPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const state = await resolveState(token);

  if (state.kind === "expired") {
    return (
      <StateCard
        icon={<ClockIcon />}
        heading="This review link has expired."
        body="Open your dashboard for the latest drafts."
      />
    );
  }

  if (state.kind === "already_actioned") {
    return (
      <StateCard
        icon={<CheckIcon />}
        heading="This draft has been actioned."
        body="The action was already taken. Visit your dashboard to see updated status."
      />
    );
  }

  if (state.kind === "invalid") {
    return (
      <StateCard
        icon={<ClockIcon />}
        heading="This link isn't valid."
        body="It may have been copied incorrectly. Open your dashboard for the latest drafts."
      />
    );
  }

  return (
    <div className="space-y-6">
      <p className="text-sm font-medium text-muted-foreground">Sonorous</p>
      <div className="space-y-1">
        <h1 className="text-xl font-semibold">Review draft</h1>
        <p className="text-sm text-muted-foreground">
          From {state.coachName}&apos;s queue
        </p>
      </div>
      <DraftCard
        draft={state.draft}
        surface="review"
        reviewToken={state.token}
        timeZone={state.coachTimezone}
      />
      <p className="text-xs text-muted-foreground text-center mt-8">
        This link expires after 7 days or once you take action.
      </p>
    </div>
  );
}
