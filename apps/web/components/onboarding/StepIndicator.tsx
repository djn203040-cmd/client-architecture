import { STEP_ORDER, type OnboardingStep } from "@client/shared/validators";

const STEP_LABELS: Record<OnboardingStep, string> = {
  gmail: "Gmail",
  voice: "Voice",
  "first-lead": "First lead",
  notifications: "Notifications",
};

interface Props {
  currentStep: OnboardingStep;
  progress: Record<string, string | null | undefined>;
}

export function StepIndicator({ currentStep, progress }: Props) {
  const currentIdx = STEP_ORDER.indexOf(currentStep);

  return (
    <div className="flex items-center gap-2" aria-label="Onboarding progress">
      {STEP_ORDER.map((step, idx) => {
        const isCompleted = idx < currentIdx;
        const isActive = idx === currentIdx;

        return (
          <div key={step} className="flex items-center gap-2">
            <div className="flex flex-col items-center gap-1">
              <div
                className={[
                  "w-2.5 h-2.5 rounded-full transition-all duration-200",
                  isCompleted
                    ? "bg-[oklch(60%_0.14_60)]"
                    : isActive
                      ? "bg-[oklch(60%_0.14_60)] ring-2 ring-[oklch(60%_0.14_60)]/30 ring-offset-2"
                      : "bg-border",
                ].join(" ")}
                aria-current={isActive ? "step" : undefined}
              />
              <span
                className={[
                  "text-[10px] font-medium whitespace-nowrap",
                  isActive ? "text-foreground" : "text-muted-foreground",
                ].join(" ")}
              >
                {STEP_LABELS[step]}
              </span>
            </div>
            {idx < STEP_ORDER.length - 1 && (
              <div
                className={[
                  "w-8 h-px mb-4 transition-colors",
                  isCompleted ? "bg-[oklch(60%_0.14_60)]" : "bg-border",
                ].join(" ")}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}
