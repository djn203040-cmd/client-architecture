import Link from "next/link";
import { STEP_ORDER, type OnboardingProgress } from "@client/shared/validators";
import { completedCount, nextIncompleteStep } from "@/lib/onboarding/progress";

const TOTAL_STEPS = STEP_ORDER.length;

interface Props {
  progress: OnboardingProgress;
  coachCreatedAt: string;
}

export function OnboardingBanner({ progress, coachCreatedAt }: Props) {
  // 7-day permanent server-side dismiss
  const createdMs = new Date(coachCreatedAt).getTime();
  const sevenDaysMs = 7 * 24 * 60 * 60 * 1000;
  if (Date.now() - createdMs > sevenDaysMs) return null;

  const done = completedCount(progress);
  if (done >= TOTAL_STEPS) return null;

  const nextStep = nextIncompleteStep(progress);
  if (!nextStep) return null;

  const remaining = TOTAL_STEPS - done;

  return (
    <div className="sticky top-0 z-20 flex items-center justify-between gap-4 px-4 py-2.5 bg-card/80 backdrop-blur-md border-b border-border dark:bg-white/5 dark:border-white/10">
      <p className="text-sm font-medium">
        Finish setup, {" "}
        <span className="text-muted-foreground font-normal">
          {remaining} of {TOTAL_STEPS} step{remaining !== 1 ? "s" : ""} remaining
        </span>
      </p>
      <Link
        href={`/onboarding/${nextStep}` as never}
        className="shrink-0 text-sm font-medium underline underline-offset-2 hover:text-muted-foreground transition-colors"
      >
        Resume
      </Link>
    </div>
  );
}
