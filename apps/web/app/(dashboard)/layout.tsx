import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { cookies, headers } from "next/headers";
import { AppShell } from "@/components/shell/AppShell";
import { TourProvider } from "@/components/tour/TourProvider";
import { OnboardingBanner } from "@/components/dashboard/OnboardingBanner";
import { type OnboardingProgress, coerceLanguage } from "@client/shared/validators";
import { nextIncompleteStep } from "@/lib/onboarding/progress";
import { I18nProvider } from "@/lib/i18n/provider";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: coach } = await supabase
    .from("coaches")
    .select("*")
    .eq("id", user.id)
    .maybeSingle();
  if (!coach) {
    // Authenticated but no coaches row, orphan auth user (e.g. created directly
    // in Supabase dashboard, skipping the invite flow that provisions the coach
    // record). Sign them out so /login doesn't bounce them right back here.
    await supabase.auth.signOut();
    redirect("/login?error=no_coach_record");
  }

  const progress = (coach.onboarding_progress ?? {}) as OnboardingProgress;
  const pathname = (await headers()).get("x-pathname") ?? "";
  const isSettingsRoute = pathname.startsWith("/settings");

  // First-visit redirect gate: send incomplete coaches to the wizard once per session.
  // Cookie must be set in a Route Handler (not a Server Component), so we redirect
  // through /api/onboarding-gate which sets the cookie then forwards to the wizard.
  // Settings is always accessible, coaches need it to fix integrations mid-onboarding.
  if (!coach.onboarding_completed_at && !isSettingsRoute) {
    const nextStep = nextIncompleteStep(progress);
    if (nextStep) {
      const cookieStore = await cookies();
      const alreadyRedirected = cookieStore.get("onb_redirected")?.value === "1";
      if (!alreadyRedirected) {
        redirect(`/api/onboarding-gate?to=/onboarding/${nextStep}` as never);
      }
    }
  }

  return (
    <I18nProvider locale={coerceLanguage(coach.language)}>
      <TourProvider autoStart={!!coach.onboarding_completed_at}>
        <AppShell coachName={coach.name}>
          {!coach.onboarding_completed_at && (
            <OnboardingBanner progress={progress} coachCreatedAt={coach.created_at} />
          )}
          {children}
        </AppShell>
      </TourProvider>
    </I18nProvider>
  );
}
