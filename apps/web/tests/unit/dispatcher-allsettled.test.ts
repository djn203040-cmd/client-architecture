// @vitest-environment node
import { describe, it, expect } from "vitest";

// 06-PLAN.md §1.2 — "Multi-channel dispatcher: Promise.allSettled semantics —
// one channel failure does not block others."
//
// The dispatcher fans out via Promise.allSettled across the 5 channels (dashboard,
// email, slack, whatsapp, sms). A rejection from one channel must not abort the
// others; results carry per-channel status.

describe("Notification-Dispatcher: allSettled fan-out semantics", () => {
  it("one rejection does not abort the other fulfilled channels", async () => {
    const results = await Promise.allSettled([
      Promise.resolve({ channel: "dashboard", ok: true }),
      Promise.reject(new Error("email transport failed")),
      Promise.resolve({ channel: "slack", ok: true }),
      Promise.resolve({ channel: "whatsapp", ok: true }),
      Promise.resolve({ channel: "sms", ok: true }),
    ]);

    expect(results).toHaveLength(5);
    expect(results.filter((r) => r.status === "fulfilled")).toHaveLength(4);
    expect(results.filter((r) => r.status === "rejected")).toHaveLength(1);

    const rejected = results.find((r) => r.status === "rejected");
    expect((rejected as PromiseRejectedResult).reason).toBeInstanceOf(Error);
  });

  it("every channel can reject and others still resolve cleanly", async () => {
    const results = await Promise.allSettled([
      Promise.reject(new Error("a")),
      Promise.reject(new Error("b")),
      Promise.resolve("c"),
      Promise.reject(new Error("d")),
      Promise.resolve("e"),
    ]);
    expect(results.filter((r) => r.status === "fulfilled")).toHaveLength(2);
    expect(results.filter((r) => r.status === "rejected")).toHaveLength(3);
  });

  it("an empty channel set returns an empty result array (no throw)", async () => {
    const results = await Promise.allSettled([]);
    expect(results).toEqual([]);
  });

  it("rejection reason is preserved per channel — call site can log per-channel failure", async () => {
    const channelTags = ["dashboard", "email", "slack", "whatsapp", "sms"];
    const results = await Promise.allSettled(
      channelTags.map((tag, i) =>
        i === 1 ? Promise.reject(new Error(`${tag}-down`)) : Promise.resolve(tag),
      ),
    );
    const rejected = results[1] as PromiseRejectedResult;
    expect(rejected.status).toBe("rejected");
    expect((rejected.reason as Error).message).toBe("email-down");
  });
});
