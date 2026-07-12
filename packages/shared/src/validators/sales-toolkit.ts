import { z } from "zod";

// The coach's "how you sell" toolkit, captured once and injected into every
// draft so the AI can handle objections the way this coach actually would.
// See issue #39. Every field is optional with a sane empty default: an empty
// toolkit must reproduce the pre-toolkit behavior exactly (no regression).

const ToolkitOptionSchema = z.object({
  // e.g. "4-week intensive" or "Payment plan (3-month split)"
  name: z.string().trim().min(1, "Give it a short name").max(120),
  // When the AI should reach for it, e.g. "if price is the stated objection
  // but interest is real".
  when_to_offer: z.string().trim().max(400).default(""),
});
export type TToolkitOption = z.infer<typeof ToolkitOptionSchema>;

export const SalesToolkitSchema = z.object({
  // 1-3 sentence personal sales philosophy.
  philosophy: z.string().trim().max(800).default(""),
  // Lighter / shorter versions of the offer to fall back to.
  downsells: z.array(ToolkitOptionSchema).max(12).default([]),
  // Ways to bridge a stated objection (payment plans, lighter scope, etc).
  bridges: z.array(ToolkitOptionSchema).max(12).default([]),
  // Free text: what discovery questions the coach asks, so the AI knows what
  // kind of data it might have on a lead to leverage.
  leverage_points: z.string().trim().max(1500).default(""),
});
export type TSalesToolkit = z.infer<typeof SalesToolkitSchema>;

// The full object the settings form / onboarding step PATCHes. We accept a
// complete toolkit (autosave sends the whole shape) and let the schema fill in
// defaults for any missing key.
export const SalesToolkitPatchSchema = SalesToolkitSchema;

export const EMPTY_SALES_TOOLKIT: TSalesToolkit = {
  philosophy: "",
  downsells: [],
  bridges: [],
  leverage_points: "",
};

// True when the toolkit carries no usable content. Used to decide whether to
// inject the <sales_toolkit> block at all — an empty toolkit is omitted so the
// draft engine behaves exactly as it did before the feature existed.
export function isSalesToolkitEmpty(t: TSalesToolkit | null | undefined): boolean {
  if (!t) return true;
  return (
    t.philosophy.trim().length === 0 &&
    t.leverage_points.trim().length === 0 &&
    t.downsells.length === 0 &&
    t.bridges.length === 0
  );
}

// Coerce a raw JSONB value (coaches.sales_toolkit) into a validated toolkit, or
// null when it is empty / malformed. Tolerant by design: a bad row must never
// break draft generation, it just falls back to the pre-toolkit behavior.
export function coerceSalesToolkit(raw: unknown): TSalesToolkit | null {
  const parsed = SalesToolkitSchema.safeParse(raw ?? {});
  if (!parsed.success) return null;
  return isSalesToolkitEmpty(parsed.data) ? null : parsed.data;
}
