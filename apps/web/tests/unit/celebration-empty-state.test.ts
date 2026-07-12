import { describe, it, expect } from "vitest";
import { readFileSync } from "fs";
import { fileURLToPath } from "url";
import path from "path";
import { getDictionary } from "../../lib/i18n/dictionaries";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const src = readFileSync(
  path.resolve(__dirname, "../../components/drafts/CelebrationEmptyState.tsx"),
  "utf8",
);

// Copy now lives in the i18n dictionary (the source of truth), not inline.
const en = getDictionary("en");
const da = getDictionary("da");

describe("CelebrationEmptyState, copy contract", () => {
  it("contains exact heading: You're all caught up.", () => {
    expect(en.drafts.emptyState.title).toBe("You're all caught up.");
    // Danish is present and idiomatic, not a passthrough of the English.
    expect(da.drafts.emptyState.title).toBe("Du er helt ajour.");
  });

  it("does NOT contain exclamation variant", () => {
    expect(en.drafts.emptyState.title).not.toContain("!");
    expect(src).not.toContain("You're all caught up!");
    expect(src).not.toContain("You&apos;re all caught up!");
  });

  it("CTA links to /", () => {
    expect(src).toMatch(/href=["']\//);
    expect(en.drafts.emptyState.backToDashboard).toBe("Back to dashboard");
  });

  it("uses Framer Motion for the checkmark animation (pathLength)", () => {
    expect(src).toContain("pathLength");
    expect(src).toContain("useReducedMotion");
  });

  it("reduced-motion path renders checkmark instantly (pathLength: 1 on initial)", () => {
    expect(src).toContain("{ pathLength: 1 }");
  });
});

describe("CelebrationEmptyState, component under 150 lines", () => {
  it("stays within line budget", () => {
    const lines = src.split("\n").length;
    expect(lines).toBeLessThanOrEqual(150);
  });
});
