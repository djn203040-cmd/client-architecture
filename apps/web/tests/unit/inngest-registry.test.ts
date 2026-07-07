import { describe, expect, it } from "vitest";
import { inngestFunctions } from "@/inngest/registry";

/**
 * #85 — registry guardrail. Issue #75 was a prod outage: `sequence-reengage`
 * had 6 events in `cancelOn`, exceeding Inngest's hard cap of 5. That single
 * over-limit function failed the whole-app sync and SILENTLY FROZE the entire
 * function registry, so every newly-added function stopped registering on prod.
 *
 * These tests turn that silent freeze into a red CI check: add a 6th `cancelOn`
 * to any function, or a duplicate id, and the build fails here first.
 */

// Inngest exposes a function's config at `fn.opts` (id, triggers, cancelOn, ...).
type FnOpts = { id?: string; cancelOn?: unknown[] };
function optsOf(fn: unknown): FnOpts {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- reason: introspecting Inngest function internals
  return ((fn as any)?.opts ?? {}) as FnOpts;
}

const INNGEST_CANCEL_ON_CAP = 5;

describe("Inngest function registry guardrail (#85 / prevents #75)", () => {
  it("registers at least the known functions", () => {
    expect(inngestFunctions.length).toBeGreaterThanOrEqual(16);
  });

  it("every function has cancelOn.length <= 5 (Inngest's hard cap)", () => {
    const offenders = inngestFunctions
      .map((fn) => optsOf(fn))
      .filter((o) => Array.isArray(o.cancelOn) && o.cancelOn.length > INNGEST_CANCEL_ON_CAP)
      .map((o) => `${o.id} (${o.cancelOn!.length})`);

    expect(
      offenders,
      `These functions exceed Inngest's 5-event cancelOn cap and would silently freeze the whole registry on sync (see #75): ${offenders.join(", ")}`,
    ).toEqual([]);
  });

  it("has no duplicate function ids", () => {
    const ids = inngestFunctions.map((fn) => optsOf(fn).id).filter(Boolean) as string[];
    const dupes = ids.filter((id, i) => ids.indexOf(id) !== i);
    expect(dupes, `Duplicate Inngest function ids: ${dupes.join(", ")}`).toEqual([]);
  });

  it("every function exposes a readable id (introspection contract holds)", () => {
    // If a future Inngest upgrade moves config off `fn.opts`, this fails loudly
    // rather than letting the cancelOn guardrail silently pass on empty objects.
    for (const fn of inngestFunctions) {
      expect(typeof optsOf(fn).id).toBe("string");
    }
  });
});
