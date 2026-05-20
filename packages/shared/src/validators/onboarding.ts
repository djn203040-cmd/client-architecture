import { z } from "zod";

export const OnboardingStepEnum = z.enum(["gmail", "voice", "first-lead", "notifications"]);
export type OnboardingStep = z.infer<typeof OnboardingStepEnum>;

export const OnboardingProgressSchema = z.object({
  gmail_connected_at: z.string().datetime().nullable().optional(),
  voice_model_completed_at: z.string().datetime().nullable().optional(),
  first_lead_completed_at: z.string().datetime().nullable().optional(),
  notifications_picked_at: z.string().datetime().nullable().optional(),
  banner_dismissed_until: z.string().datetime().nullable().optional(),
});
export type OnboardingProgress = z.infer<typeof OnboardingProgressSchema>;

export const CompleteStepSchema = z.object({
  step: OnboardingStepEnum,
});

export const STEP_TO_PROGRESS_KEY: Record<OnboardingStep, keyof OnboardingProgress> = {
  gmail: "gmail_connected_at",
  voice: "voice_model_completed_at",
  "first-lead": "first_lead_completed_at",
  notifications: "notifications_picked_at",
};

export const STEP_ORDER: readonly OnboardingStep[] = [
  "gmail",
  "voice",
  "first-lead",
  "notifications",
] as const;
