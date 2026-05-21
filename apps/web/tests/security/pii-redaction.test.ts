/**
 * PII redaction contract.
 */
import { describe, expect, it } from "vitest";
import { redact, redactString, scrubSentryEvent } from "../../lib/logging/redact";

describe("redactString", () => {
  it("strips emails", () => {
    expect(redactString("contact: user@example.com please")).toBe(
      "contact: [email] please",
    );
  });

  it("strips phone numbers", () => {
    expect(redactString("call +1 415-555-0123 now")).toBe("call [phone] now");
  });

  it("strips JWT tokens", () => {
    const jwt = "eyJabcdefghijk.eyJpayloaddata.signaturepart";
    expect(redactString(`token=${jwt}`)).toBe("token=[jwt]");
  });

  it("strips Bearer tokens", () => {
    expect(redactString("Authorization: Bearer sk-secrettoken12345")).toBe(
      "Authorization: Bearer [redacted]",
    );
  });
});

describe("redact (object walker)", () => {
  it("redacts PII keys recursively", () => {
    const input = {
      user: {
        email: "user@example.com",
        name: "Test User",
        meta: { phone: "+14155550123" },
      },
      lead: {
        first_name: "Alice",
        last_name: "Bobson",
        address: "123 Main St",
      },
      okay: { count: 5 },
    };
    const out = redact(input);
    expect(out.user.email).toBe("[REDACTED]");
    expect(out.user.name).toBe("[REDACTED]");
    expect(out.user.meta.phone).toBe("[REDACTED]");
    expect(out.lead.first_name).toBe("[REDACTED]");
    expect(out.lead.last_name).toBe("[REDACTED]");
    expect(out.lead.address).toBe("[REDACTED]");
    expect(out.okay.count).toBe(5);
  });

  it("redacts emails embedded in string values when key is innocuous", () => {
    const out = redact({ trace: "operation failed for user@example.com" });
    expect(out.trace).toBe("operation failed for [email]");
  });

  it("redacts nested arrays of leads (Inngest payload shape)", () => {
    const out = redact({
      leads: [
        { email: "a@x.com", name: "A" },
        { email: "b@x.com", name: "B" },
      ],
    });
    expect(out.leads[0]!.email).toBe("[REDACTED]");
    expect(out.leads[1]!.name).toBe("[REDACTED]");
  });

  it("handles circular references", () => {
    const obj: Record<string, unknown> = { name: "x" };
    obj["self"] = obj;
    const out = redact(obj) as { name: string; self: unknown };
    expect(out.name).toBe("[REDACTED]");
    expect(out.self).toBe("[Circular]");
  });

  it("redacts authorization and cookie headers in HTTP envelopes", () => {
    const req = {
      headers: {
        authorization: "Bearer sk-ant-abc123",
        cookie: "session=xyz",
      },
      url: "https://example.com",
    };
    const out = redact(req);
    expect(out.headers.authorization).toBe("[REDACTED]");
    expect(out.headers.cookie).toBe("[REDACTED]");
  });

  it("scrubSentryEvent passes events through redact", () => {
    const event = {
      message: "user@example.com hit the limit",
      user: { email: "user@example.com" },
    };
    const out = scrubSentryEvent(event);
    expect(out.message).toBe("[email] hit the limit");
    expect(out.user.email).toBe("[REDACTED]");
  });

  it("leaves non-PII fields untouched", () => {
    const out = redact({ status: "ok", count: 42, flags: [true, false] });
    expect(out).toEqual({ status: "ok", count: 42, flags: [true, false] });
  });
});
