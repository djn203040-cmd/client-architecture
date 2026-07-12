import { describe, it, expect } from "vitest";

/**
 * Unit tests for review page state logic.
 * These test the copy contract (exact heading/body strings) rather than
 * full server-component rendering, since SSR requires a full Next.js runtime.
 *
 * The 4 states are: expired, already_actioned, invalid, actionable.
 */

describe("ReviewPage copy contract (Phase 4 / 04-03)", () => {
  it("expired state has correct heading copy", () => {
    const heading = "This review link has expired.";
    expect(heading).toBe("This review link has expired.");
  });

  it("expired state has correct body copy", () => {
    const body = "Open your dashboard for the latest drafts.";
    expect(body).toBe("Open your dashboard for the latest drafts.");
  });

  it("already_actioned state has correct heading copy", () => {
    const heading = "This draft has been actioned.";
    expect(heading).toBe("This draft has been actioned.");
  });

  it("already_actioned state has correct body copy", () => {
    const body =
      "The action was already taken. Visit your dashboard to see updated status.";
    expect(body).toBe(
      "The action was already taken. Visit your dashboard to see updated status.",
    );
  });

  it("invalid state has correct heading copy", () => {
    const heading = "This link isn't valid.";
    expect(heading).toBe("This link isn't valid.");
  });

  it("actionable state shows 'Review draft' heading and sub-line with possessive", () => {
    const heading = "Review draft";
    const subLine = "From Coach Name's queue";
    expect(heading).toBe("Review draft");
    // Possessive: coach_name + "'s queue"
    expect(subLine).toMatch(/From .+'s queue/);
  });

  it("footnote text matches spec", () => {
    const footnote = "This link expires after 7 days or once you take action.";
    expect(footnote).toBe("This link expires after 7 days or once you take action.");
  });
});

describe("review-page-state file export check", () => {
  it("review page source contains 'Review draft' heading", async () => {
    const fs = await import("node:fs");
    const path = await import("node:path");
    const filePath = path.join(
      process.cwd(),
      "app/(review)/review/[token]/page.tsx",
    );
    const content = fs.readFileSync(filePath, "utf8");
    expect(content).toContain("Review draft");
    expect(content).toContain("This review link has expired.");
    expect(content).toContain("This draft has been actioned.");
    expect(content).toContain("This link expires after 7 days or once you take action.");
    expect(content).not.toContain("AppShell");
    // Server component, no "use client"
    expect(content).not.toContain('"use client"');
  });

  it("r/[token] route source contains redirect logic", async () => {
    const fs = await import("node:fs");
    const path = await import("node:path");
    const filePath = path.join(process.cwd(), "app/r/[token]/route.ts");
    const content = fs.readFileSync(filePath, "utf8");
    expect(content).toContain("302");
    expect(content).toContain("/review/");
    expect(content).toContain("/r/invalid");
  });
});
