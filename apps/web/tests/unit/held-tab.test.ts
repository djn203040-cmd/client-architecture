import { describe, it, expect } from "vitest";
import { readFileSync } from "fs";
import { fileURLToPath } from "url";
import path from "path";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const src = readFileSync(
  path.resolve(__dirname, "../../components/drafts/HeldTab.tsx"),
  "utf8",
);

describe("HeldTab, structural contracts", () => {
  it("uses useDraftRealtime with status=held", () => {
    expect(src).toContain('status: "held"');
  });

  it("empty state shows 'Nothing on hold.'", () => {
    expect(src).toContain("Nothing on hold.");
  });

  it("sorts by held_at DESC", () => {
    expect(src).toContain("held_at");
    expect(src).toContain("localeCompare");
  });

  it("renders DraftCard with variant=held", () => {
    expect(src).toContain('variant="held"');
  });

  it("badge section only renders when count > 0 (via parent DraftQueueScaffold)", () => {
    // HeldTab itself doesn't render a badge, that's DraftQueueScaffold's job
    // Verify HeldTab does not duplicate badge logic
    expect(src).not.toContain("heldCount");
  });
});

describe("HeldTab, component under 60 lines", () => {
  it("stays within line budget", () => {
    const lines = src.split("\n").length;
    expect(lines).toBeLessThanOrEqual(60);
  });
});

describe("DraftQueueScaffold, tab contract", () => {
  const scaffoldSrc = readFileSync(
    path.resolve(__dirname, "../../components/drafts/DraftQueueScaffold.tsx"),
    "utf8",
  );

  it("renders three tabs: Pending, Held, Unmatched", () => {
    expect(scaffoldSrc).toContain("Pending");
    expect(scaffoldSrc).toContain("Held");
    expect(scaffoldSrc).toContain("Unmatched");
  });

  it("held tabpanel has id=tabpanel-held", () => {
    expect(scaffoldSrc).toContain('id="tabpanel-held"');
  });

  it("badge is only shown when count > 0 (badge prop is undefined when 0)", () => {
    // Our TabButton only renders badge when badge !== undefined
    expect(scaffoldSrc).toContain("badge={heldCount > 0 ? heldCount : undefined}");
  });

  it("CelebrationEmptyState only fires after justEmptied=true, not initial empty", () => {
    expect(scaffoldSrc).toContain("justEmptied");
    // Should guard: only show when !draftsLoading && justEmptied
    expect(scaffoldSrc).toContain("justEmptied ?");
  });
});
