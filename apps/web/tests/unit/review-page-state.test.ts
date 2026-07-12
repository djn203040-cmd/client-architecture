import { describe, it, expect } from "vitest";
import { getDictionary } from "../../lib/i18n/dictionaries";

/**
 * Unit tests for review page state logic.
 * The copy contract (exact heading/body strings) now lives in the i18n
 * dictionary (t.review), which is the source of truth the page renders from.
 *
 * The 4 states are: expired, already_actioned, invalid, actionable.
 */

const en = getDictionary("en");
const da = getDictionary("da");

describe("ReviewPage copy contract (Phase 4 / 04-03)", () => {
  it("expired state has correct heading copy", () => {
    expect(en.review.expired.heading).toBe("This review link has expired.");
  });

  it("expired state has correct body copy", () => {
    expect(en.review.expired.body).toBe("Open your dashboard for the latest drafts.");
  });

  it("already_actioned state has correct heading copy", () => {
    expect(en.review.alreadyActioned.heading).toBe("This draft has been actioned.");
  });

  it("already_actioned state has correct body copy", () => {
    expect(en.review.alreadyActioned.body).toBe(
      "The action was already taken. Visit your dashboard to see updated status.",
    );
  });

  it("invalid state has correct heading copy", () => {
    expect(en.review.invalid.heading).toBe("This link isn't valid.");
  });

  it("actionable state shows 'Review draft' heading and sub-line with possessive", () => {
    expect(en.review.header.title).toBe("Review draft");
    // Possessive: coach_name + "'s queue"
    expect(en.review.header.fromQueue("Coach Name")).toMatch(/From .+'s queue/);
  });

  it("footnote text matches spec", () => {
    expect(en.review.footer.expiryNote).toBe(
      "This link expires after 7 days or once you take action.",
    );
  });

  it("Danish copy is present and idiomatic (not a passthrough of English)", () => {
    expect(da.review.header.title).toBe("Gennemgå udkast");
    expect(da.review.expired.heading).not.toBe(en.review.expired.heading);
  });
});

describe("review-page-state file export check", () => {
  it("review page derives locale and stays a server component", async () => {
    const fs = await import("node:fs");
    const path = await import("node:path");
    const filePath = path.join(
      process.cwd(),
      "app/(review)/review/[token]/page.tsx",
    );
    const content = fs.readFileSync(filePath, "utf8");
    // Reads copy from the dictionary rather than inlining it.
    expect(content).toContain("getDictionary");
    expect(content).toContain("t.review");
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
