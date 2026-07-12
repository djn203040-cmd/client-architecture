import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import {
  OnboardingStepEnum,
  SalesToolkitSchema,
  EMPTY_SALES_TOOLKIT,
  type OnboardingProgress,
} from "@client/shared/validators";
import { nextIncompleteStep } from "@/lib/onboarding/progress";
import { WizardShell } from "@/components/onboarding/WizardShell";
import { StepGmail } from "@/components/onboarding/StepGmail";
import { StepBooking } from "@/components/onboarding/StepBooking";
import { StepCalendar } from "@/components/onboarding/StepCalendar";
import { StepSales } from "@/components/onboarding/StepSales";
import { StepVoice } from "@/components/onboarding/StepVoice";
import { StepFirstLead } from "@/components/onboarding/StepFirstLead";
import { StepNotifications } from "@/components/onboarding/StepNotifications";
import type { TVoiceProfile } from "@client/shared/validators";
import {
  CALENDAR_PROVIDER_IDS,
  CALENDAR_PROVIDERS,
  isOAuthConfigured,
  type CalendarProviderId,
} from "@/lib/calendar/providers";

interface Props {
  params: Promise<{ step: string }>;
}

export default async function OnboardingStepPage({ params }: Props) {
  const { step: rawStep } = await params;
  const parsed = OnboardingStepEnum.safeParse(rawStep);
  if (!parsed.success) notFound();

  const step = parsed.data;

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: coach } = await supabase
    .from("coaches")
    .select("voice_model, onboarding_progress, notification_settings, onboarding_completed_at, public_booking_url, active_calendar_provider, timezone, sales_toolkit")
    .eq("id", user.id)
    .single();

  const progress = (coach?.onboarding_progress ?? {}) as OnboardingProgress;
  const nextStep = nextIncompleteStep(progress);

  // Prevent step skipping, redirect to the actual next step
  if (nextStep && step !== nextStep) redirect(`/onboarding/${nextStep}` as never);

  // All steps done but completed_at never got set (orphaned state), self-heal and exit.
  if (!nextStep) {
    if (!coach?.onboarding_completed_at) {
      await supabase
        .from("coaches")
        .update({ onboarding_completed_at: new Date().toISOString() })
        .eq("id", user.id);
    }
    redirect("/dashboard" as never);
  }

  let stepContent: React.ReactNode;

  if (step === "gmail") {
    stepContent = <StepGmail />;
  } else if (step === "booking") {
    stepContent = <StepBooking initialUrl={coach?.public_booking_url ?? null} />;
  } else if (step === "calendar") {
    const oauthConfigured = CALENDAR_PROVIDER_IDS.reduce(
      (acc, id) => {
        acc[id] = isOAuthConfigured(CALENDAR_PROVIDERS[id]);
        return acc;
      },
      {} as Record<CalendarProviderId, boolean>,
    );
    stepContent = (
      <StepCalendar
        activeProvider={(coach?.active_calendar_provider as CalendarProviderId | null) ?? null}
        oauthConfigured={oauthConfigured}
      />
    );
  } else if (step === "sales") {
    const parsedToolkit = SalesToolkitSchema.safeParse(coach?.sales_toolkit ?? {});
    stepContent = (
      <StepSales
        initialToolkit={parsedToolkit.success ? parsedToolkit.data : EMPTY_SALES_TOOLKIT}
      />
    );
  } else if (step === "voice") {
    // coaches.voice_model defaults to an empty JSONB {}. Treat anything without
    // a real profile shape as "not built yet" (null) so the wizard shows the
    // importer instead of crashing VoiceProfileCard on undefined arrays.
    const rawVoiceModel = coach?.voice_model as
      | TVoiceProfile
      | null
      | Record<string, never>;
    const voiceModel =
      rawVoiceModel &&
      typeof rawVoiceModel === "object" &&
      "tone_adjectives" in rawVoiceModel
        ? (rawVoiceModel as TVoiceProfile)
        : null;
    const exampleCount = voiceModel?.selected_examples?.length ?? 0;
    stepContent = (
      <StepVoice initialVoiceModel={voiceModel} initialExampleCount={exampleCount} />
    );
  } else if (step === "first-lead") {
    stepContent = <StepFirstLead />;
  } else {
    // notifications
    const [{ data: prefs }, { data: integrations }] = await Promise.all([
      supabase.from("notification_preferences").select("event_type, channel, enabled").eq("coach_id", user.id),
      supabase.from("integrations").select("provider, status").eq("coach_id", user.id),
    ]);

    stepContent = (
      <StepNotifications
        initialPrefs={prefs ?? []}
        integrations={integrations ?? []}
      />
    );
  }

  return (
    <WizardShell
      currentStep={step}
      progress={progress}
      coachTimezone={(coach?.timezone as string | null) ?? null}
    >
      {stepContent}
    </WizardShell>
  );
}
