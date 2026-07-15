import type { ReactNode } from "react";
import Link from "next/link";
import { STEP_ORDER, type OnboardingStep } from "@client/shared/validators";
import { getServerDictionary } from "@/lib/i18n/server";
import { StepIndicator } from "./StepIndicator";
import { TimezoneCapture } from "./TimezoneCapture";

const DANIEL_EMAIL = "djn203040@gmail.com";

interface Props {
  currentStep: OnboardingStep;
  progress: Record<string, string | null | undefined>;
  /** When null, the coach has no saved zone yet, capture it client-side. */
  coachTimezone: string | null;
  children: ReactNode;
}

export async function WizardShell({ currentStep, progress, coachTimezone, children }: Props) {
  const t = await getServerDictionary();
  const stepIdx = STEP_ORDER.indexOf(currentStep);
  const prevStep = stepIdx > 0 ? STEP_ORDER[stepIdx - 1] : null;
  const helpHref = `mailto:${DANIEL_EMAIL}?subject=${encodeURIComponent(t.onboarding.shell.helpMailSubject)}`;

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
          <div className="px-8 pt-8 pb-2 space-y-1">
            {prevStep && (
              <Link
                href={`/onboarding/${prevStep}` as never}
                className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors -ml-1 mb-1"
              >
                <span aria-hidden>←</span> {t.onboarding.shell.back}
              </Link>
            )}
            <p className="text-xs text-muted-foreground">
              {t.onboarding.shell.stepMeta(stepIdx + 1, STEP_ORDER.length)} ·{" "}
              {t.onboarding.shell.estimates[currentStep]}
            </p>
            <h1 className="text-2xl font-semibold leading-snug">{t.onboarding.shell.headings[currentStep]}</h1>
          </div>
          <div className="px-8 pb-8 pt-4">{children}</div>
        </div>

        {/* Human escape hatch: a real person is one click away on every step. */}
        <p className="text-center text-xs text-muted-foreground">
          {t.onboarding.shell.help}{" "}
          <a href={helpHref} className="underline underline-offset-2 hover:text-foreground font-medium">
            {t.onboarding.shell.helpLink}
          </a>{" "}
          {t.onboarding.shell.helpTail}
        </p>

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
