import { STEP_ORDER, type OnboardingStep } from "@client/shared/validators";

export type CompleteStepResult =
  | { ok: true; completed: boolean }
  | { ok: false; code: string | null; error: string | null };

/**
 * Mark a wizard step complete. Every step component routes through this so
 * error handling and forward navigation stay identical everywhere.
 */
export async function completeStep(step: OnboardingStep): Promise<CompleteStepResult> {
  try {
    const r = await fetch("/api/onboarding/complete-step", {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ step }),
    });
    const body = (await r.json().catch(() => ({}))) as {
      completed?: boolean;
      code?: string;
      error?: string;
    };
    if (!r.ok) return { ok: false, code: body.code ?? null, error: body.error ?? null };
    return { ok: true, completed: body.completed ?? false };
  } catch {
    return { ok: false, code: null, error: null };
  }
}

/**
 * Where to go after completing `step`: the following step in order (already
 * completed steps are revisitable, so this is always allowed), or the
 * dashboard when the wizard is done.
 */
export function nextRoute(step: OnboardingStep, completed: boolean): string {
  if (completed) return "/dashboard";
  const idx = STEP_ORDER.indexOf(step);
  const next = STEP_ORDER[idx + 1];
  return next ? `/onboarding/${next}` : "/dashboard";
}

/**
 * Localized message for a failed completeStep call: prefer the machine code's
 * translation, fall back to the server's human string, then the step's own
 * generic fallback.
 */
export function advanceErrorMessage(
  result: Extract<CompleteStepResult, { ok: false }>,
  errors: Record<string, string>,
  fallback: string,
): string {
  const localized = result.code ? errors[result.code] : undefined;
  return localized ?? result.error ?? fallback;
}
