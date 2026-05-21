import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { cookies, headers } from "next/headers";
import { AppShell } from "@/components/shell/AppShell";
import { OnboardingBanner } from "@/components/dashboard/OnboardingBanner";
import { type OnboardingProgress } from "@client/shared/validators";
import { nextIncompleteStep } from "@/lib/onboarding/progress";

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
  if (!coach) redirect("/login");

  const progress = (coach.onboarding_progress ?? {}) as OnboardingProgress;
  const pathname = (await headers()).get("x-pathname") ?? "";
  const isSettingsRoute = pathname.startsWith("/settings");

  // First-visit redirect gate: send incomplete coaches to the wizard once per session.
  // Cookie must be set in a Route Handler (not a Server Component), so we redirect
  // through /api/onboarding-gate which sets the cookie then forwards to the wizard.
  // Settings is always accessible — coaches need it to fix integrations mid-onboarding.
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
    <AppShell coachName={coach.name}>
      {!coach.onboarding_completed_at && (
        <OnboardingBanner progress={progress} coachCreatedAt={coach.created_at} />
      )}
      {children}
    </AppShell>
  );
}
