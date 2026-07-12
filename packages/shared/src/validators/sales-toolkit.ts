import { z } from "zod";

// The coach's "how you sell" toolkit, captured once and injected into every
// draft so the AI can handle objections the way this coach actually would.
// See issue #39 (v1) and the v2 methodology + styles + packages update.
//
// Two things live here now:
//   1. HOW the coach sells (posture) — `sales_style` + `approach_override`. These
//      shape the SYSTEM prompt (global sales methodology), independent of the data
//      block below. A coach who only picks a style still gets a shaped posture.
//   2. WHAT the coach sells + their objection tools — `packages`, `bridges`,
//      `downsells`, `philosophy`, `leverage_points`. These render as the
//      <sales_toolkit> DATA block in each draft's user prompt.
//
// Backward compatible by construction: every field is optional with a sane
// default, so a pre-v2 row ({philosophy, bridges, downsells, leverage_points})
// still parses, and an empty toolkit reproduces the pre-toolkit behavior exactly.

// The three first-run sales styles. The coach picks one during onboarding; it's
// quick and shapes the AI's whole selling posture. `null` = no pick yet, which
// falls back to the balanced base methodology (≈ the pre-v2 gentle posture).
export const SalesStyleEnum = z.enum(["guide", "closer", "strategist"]);
export type TSalesStyle = z.infer<typeof SalesStyleEnum>;

// UI-facing metadata for the style picker. The actual prompt fragments that
// steer the model live server-side in @client/ai-engine (prompts/sales.ts);
// this is only what the coach reads when choosing. Single source of truth for
// the onboarding picker, the settings form, and any admin view.
export interface SalesStyleMeta {
  id: TSalesStyle;
  label: string;
  tagline: string;
  description: string;
  bestFor: string;
  // A concrete "how it sounds" example, so a coach can hear the difference
  // before picking. All three answer the SAME objection (SALES_STYLE_SCENARIO)
  // so they read as a direct comparison.
  example: string;
}

// The shared objection every style example responds to, so the three examples
// are directly comparable.
export const SALES_STYLE_SCENARIO =
  'A warm lead replies: "I love this, but $4,000 is a stretch for me right now."';

export const SALES_STYLES: readonly SalesStyleMeta[] = [
  {
    id: "guide",
    label: "The Guide",
    tagline: "Nurturing and unhurried",
    description:
      "You lead with genuine curiosity and let people arrive at the decision themselves. Lots of questions, real listening, and only a gentle nudge when someone hesitates. You never push.",
    bestFor:
      "Transformation, life, health, and relationship coaches, and anyone whose audience recoils from feeling 'sold to'.",
    example:
      "I completely hear you, and there's zero rush on my end. Can I ask, when you picture having this fully handled a few months from now, what changes for you? Sometimes 'it's a stretch' is really 'is now the right time,' and I'd rather help you get clear on that than talk you into anything. If it helps, we could also start smaller and see how it feels.",
  },
  {
    id: "closer",
    label: "The Closer",
    tagline: "Direct and decisive",
    description:
      "You diagnose the problem quickly, then name the objection out loud and make a clear, confident ask. Honest urgency, no dancing around it, you help people stop overthinking and commit.",
    bestFor:
      "Business, sales, mindset, and fitness coaches whose clients respect straight talk and short decision cycles.",
    example:
      "Fair, and thanks for saying it straight. Honest question: is the money genuinely not there, or are you not yet sure it's worth it? Those are two different problems. If it's worth-it, let's settle that right now. If it's timing, we can split it into three payments so you start this week instead of 'someday.' Want me to set that up?",
  },
  {
    id: "strategist",
    label: "The Strategist",
    tagline: "Value architect",
    description:
      "You win on the offer itself: stack the value, lower the risk, present the right package, and reach for the payment plan or lighter option that removes the exact obstacle, so saying yes becomes the obvious move.",
    bestFor:
      "Coaches with tiered programs and clear pricing ladders, and higher-ticket offers where structure and ROI matter most.",
    example:
      "Makes sense, let's look at it properly. The full program is $4,000 for the 12 weeks and everything in it. Lined up against what staying stuck is costing you, the math usually flips. But if cash flow is the real constraint, I'd rather keep your momentum than lose it, so we could do a 3-payment plan, or start with the 4-week intensive and roll it into the full thing. Which feels right?",
  },
] as const;

// A generic objection-handling option (bridge or downsell): a short name plus
// when the AI should reach for it.
const ToolkitOptionSchema = z.object({
  // e.g. "4-week intensive" or "Payment plan (3-month split)"
  name: z.string().trim().min(1, "Give it a short name").max(120),
  // When the AI should reach for it, e.g. "if price is the stated objection
  // but interest is real".
  when_to_offer: z.string().trim().max(400).default(""),
});
export type TToolkitOption = z.infer<typeof ToolkitOptionSchema>;

// A real program the coach sells. Rich enough that the AI understands the offer
// ladder — so it can position a bridge/downsell against a concrete package
// instead of guessing at pricing. Only `name` is required; the rest are
// optional free text so a coach can capture as much or as little as they want.
const PackageSchema = z.object({
  // e.g. "12-Week 1:1 Container"
  name: z.string().trim().min(1, "Give it a name").max(120),
  // Free text so any pricing model fits: "$4,000", "3× $1,500/mo", "from $2k".
  price: z.string().trim().max(120).default(""),
  // Structure & duration, e.g. "12 weeks, weekly 60-min calls + Voxer access".
  format: z.string().trim().max(200).default(""),
  // What's inside, e.g. "Workbook, 2 live intensives, private community".
  includes: z.string().trim().max(600).default(""),
  // Who it's the right fit for, e.g. "Founders stuck under $10k/mo".
  ideal_for: z.string().trim().max(300).default(""),
});
export type TSalesPackage = z.infer<typeof PackageSchema>;

export const SalesToolkitSchema = z.object({
  // Posture (shapes the system prompt): the picked style, and an optional later
  // "tweak how I sell" override the coach can add down the line if the base
  // methodology doesn't fit them.
  sales_style: SalesStyleEnum.nullable().default(null),
  approach_override: z.string().trim().max(1500).default(""),
  // 1-3 sentence personal sales philosophy.
  philosophy: z.string().trim().max(800).default(""),
  // The coach's real programs / pricing ladder.
  packages: z.array(PackageSchema).max(12).default([]),
  // Ways to bridge a stated objection (payment plans, lighter scope, etc).
  bridges: z.array(ToolkitOptionSchema).max(12).default([]),
  // Lighter / shorter versions of the offer to fall back to.
  downsells: z.array(ToolkitOptionSchema).max(12).default([]),
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
  sales_style: null,
  approach_override: "",
  philosophy: "",
  packages: [],
  bridges: [],
  downsells: [],
  leverage_points: "",
};

// True when the toolkit carries no usable DATA-block content. Used to decide
// whether to inject the <sales_toolkit> block at all — an empty toolkit is
// omitted so the draft engine behaves exactly as it did before the feature
// existed. NOTE: this deliberately ignores `sales_style` and `approach_override`
// — those shape the SYSTEM prompt, not the data block, so a style-only toolkit
// is still "empty" for the purposes of the <sales_toolkit> block.
export function isSalesToolkitEmpty(t: TSalesToolkit | null | undefined): boolean {
  if (!t) return true;
  return (
    t.philosophy.trim().length === 0 &&
    t.leverage_points.trim().length === 0 &&
    t.packages.length === 0 &&
    t.downsells.length === 0 &&
    t.bridges.length === 0
  );
}

// Coerce a raw JSONB value (coaches.sales_toolkit) into a validated toolkit, or
// null when it is empty / malformed. Tolerant by design: a bad row must never
// break draft generation, it just falls back to the pre-toolkit behavior.
//
// A toolkit with ONLY a style/override set (no data-block content) is still
// returned (not null), because the style must reach the system prompt. Callers
// that only care about the data block use isSalesToolkitEmpty() themselves.
export function coerceSalesToolkit(raw: unknown): TSalesToolkit | null {
  const parsed = SalesToolkitSchema.safeParse(raw ?? {});
  if (!parsed.success) return null;
  const t = parsed.data;
  const hasPosture = t.sales_style !== null || t.approach_override.trim().length > 0;
  if (isSalesToolkitEmpty(t) && !hasPosture) return null;
  return t;
}
