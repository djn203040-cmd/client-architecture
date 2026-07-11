import { describe, it, expect } from "vitest";
import { readFileSync } from "fs";
import { fileURLToPath } from "url";
import path from "path";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const src = readFileSync(
  path.resolve(__dirname, "../../components/drafts/CelebrationEmptyState.tsx"),
  "utf8",
);

describe("CelebrationEmptyState, copy contract", () => {
  it("contains exact heading: You're all caught up.", () => {
    // The component uses &apos; for the apostrophe, accept either form
    const hasExactCopy =
      src.includes("You’re all caught up.") ||
      src.includes("You&apos;re all caught up.") ||
      src.includes("You're all caught up.");
    expect(hasExactCopy).toBe(true);
  });

  it("does NOT contain exclamation variant", () => {
    expect(src).not.toContain("You're all caught up!");
    expect(src).not.toContain("You&apos;re all caught up!");
  });

  it("CTA links to /", () => {
    expect(src).toMatch(/href=["']\//);
    expect(src).toContain("Back to dashboard");
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
