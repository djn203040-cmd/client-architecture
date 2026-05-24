import "server-only";
import { NextResponse, type NextRequest } from "next/server";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import {
  CompleteStepSchema,
  STEP_TO_PROGRESS_KEY,
  STEP_ORDER,
  type OnboardingProgress,
} from "@client/shared/validators";
import { nextIncompleteStep } from "@/lib/onboarding/progress";

export async function PATCH(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const parsed = CompleteStepSchema.safeParse(await req.json());
  if (!parsed.success) return NextResponse.json({ error: "Invalid step" }, { status: 400 });

  const { step } = parsed.data;

  // Server-side gate per step
  if (step === "gmail") {
    const { data: integ } = await supabase
      .from("integrations")
      .select("status")
      .eq("coach_id", user.id)
      .eq("provider", "gmail")
      .maybeSingle();
    if (integ?.status !== "connected") {
      return NextResponse.json({ error: "Gmail not connected" }, { status: 409 });
    }
  }

  if (step === "voice") {
    const { data: coach } = await supabase
      .from("coaches")
      .select("voice_model")
      .eq("id", user.id)
      .single();
    const vm = coach?.voice_model as { selected_examples?: string[] } | null;
    if (!vm?.selected_examples || vm.selected_examples.length < 8) {
      return NextResponse.json({ error: "Voice model requires at least 8 examples" }, { status: 409 });
    }
  }

  if (step === "first-lead") {
    const { data: demoDraft } = await supabase
      .from("drafts")
      .select("id")
      .eq("coach_id", user.id)
      .eq("status", "sent")
      .eq("generation_context->>demo" as never, "true")
      .maybeSingle();
    if (!demoDraft) {
      return NextResponse.json({ error: "Demo draft not approved yet" }, { status: 409 });
    }
  }

  if (step === "notifications") {
    const { data: prefs } = await supabase
      .from("notification_preferences")
      .select("channel, enabled")
      .eq("coach_id", user.id);
    const nonDashboardEnabled = prefs?.some(
      (p) => p.channel !== "dashboard" && p.enabled,
    );
    if (!nonDashboardEnabled) {
      // Check if coach acknowledged dashboard-only
      const { data: coach } = await supabase
        .from("coaches")
        .select("notification_settings")
        .eq("id", user.id)
        .single();
      const settings = coach?.notification_settings as { dashboard_only_acknowledged?: boolean } | null;
      if (!settings?.dashboard_only_acknowledged) {
        return NextResponse.json(
          { error: "Enable at least one notification channel or acknowledge dashboard-only mode" },
          { status: 409 },
        );
      }
    }
  }

  // Write progress key
  const progressKey = STEP_TO_PROGRESS_KEY[step];
  const now = new Date().toISOString();

  const { data: coach } = await supabase
    .from("coaches")
    .select("onboarding_progress")
    .eq("id", user.id)
    .single();

  const currentProgress = (coach?.onboarding_progress ?? {}) as OnboardingProgress;
  const updatedProgress = { ...currentProgress, [progressKey]: now };

  // Check if all steps are complete
  const allComplete = STEP_ORDER.every((s) => Boolean(updatedProgress[STEP_TO_PROGRESS_KEY[s]]));

  const updatePayload: Record<string, unknown> = { onboarding_progress: updatedProgress };
  if (allComplete) updatePayload.onboarding_completed_at = now;

  const { error: updateError } = await supabase
    .from("coaches")
    .update(updatePayload)
    .eq("id", user.id);
  if (updateError) {
    return NextResponse.json(
      { error: `Couldn't save progress (${updateError.code ?? "unknown"})` },
      { status: 500 },
    );
  }

  // Invalidate the cached onboarding step pages. Without this, a route the
  // client prefetched while the step was still incomplete (cached as a
  // redirect back to the unfinished step) is replayed on router.push and
  // bounces the coach backwards.
  revalidatePath("/onboarding/[step]", "page");

  const nextStep = nextIncompleteStep(updatedProgress);
  return NextResponse.json({ nextStep, completed: allComplete });
}
