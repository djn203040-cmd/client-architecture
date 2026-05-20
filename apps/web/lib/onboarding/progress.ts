import {
  STEP_ORDER,
  STEP_TO_PROGRESS_KEY,
  type OnboardingProgress,
  type OnboardingStep,
} from "@client/shared/validators";

export function nextIncompleteStep(progress: OnboardingProgress): OnboardingStep | null {
  for (const step of STEP_ORDER) {
    if (!progress[STEP_TO_PROGRESS_KEY[step]]) return step;
  }
  return null;
}

export function completedCount(progress: OnboardingProgress): number {
  return STEP_ORDER.filter((s) => Boolean(progress[STEP_TO_PROGRESS_KEY[s]])).length;
}
