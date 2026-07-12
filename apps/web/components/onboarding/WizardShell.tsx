import type { ReactNode } from "react";
import type { OnboardingStep } from "@client/shared/validators";
import { getServerDictionary } from "@/lib/i18n/server";
import { StepIndicator } from "./StepIndicator";
import { TimezoneCapture } from "./TimezoneCapture";

interface Props {
  currentStep: OnboardingStep;
  progress: Record<string, string | null | undefined>;
  /** When null, the coach has no saved zone yet, capture it client-side. */
  coachTimezone: string | null;
  children: ReactNode;
}

export async function WizardShell({ currentStep, progress, coachTimezone, children }: Props) {
  const t = await getServerDictionary();
  return (
    <div className="min-h-screen flex flex-col items-center justify-start pt-8 pb-16 px-4">
      {!coachTimezone && <TimezoneCapture />}
      <div className="w-full max-w-xl space-y-8">
        {/* Header */}
        <div className="flex flex-col items-center gap-6">
          <div className="flex items-center justify-center gap-2">
            <span className="font-semibold tracking-tight text-base">{t.onboarding.shell.brand}</span>
          </div>
          <StepIndicator currentStep={currentStep} progress={progress} />
        </div>

        {/* Card */}
        <div className="rounded-2xl border border-border/60 bg-card/80 backdrop-blur-md shadow-sm dark:bg-white/5 dark:border-white/10 dark:shadow-[inset_0_1px_0_rgba(255,255,255,0.08)]">
          <div className="px-8 pt-8 pb-2">
            <h1 className="text-2xl font-semibold leading-snug">{t.onboarding.shell.headings[currentStep]}</h1>
          </div>
          <div className="px-8 pb-8 pt-4">{children}</div>
        </div>

        {/* Dev-only skip link */}
        {process.env.NODE_ENV !== "production" && (
          <p className="text-center text-xs text-muted-foreground">
            <span className="opacity-50">{t.onboarding.shell.devOnly}</span>
            <a href="/dashboard" className="underline underline-offset-2 hover:text-foreground">
              {t.onboarding.shell.skipOnboarding}
            </a>
          </p>
        )}
      </div>
    </div>
  );
}
