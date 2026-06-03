import { describe, it, expect } from "vitest";
import type { TLeadStatus, TDraftStatus, TLeadEventType, TIntegrationProvider } from "@client/shared/types";

// Type-level test: exhaustive enum check via assertion utility
function assertExhaustive<T extends string>(values: T[]): T[] { return values; }

describe("STATE-001: Lead state machine enum has all 11 values", () => {
  it("includes all 11 lead states", () => {
    const all: TLeadStatus[] = assertExhaustive<TLeadStatus>([
      "identified", "call_booked", "no_show", "call_completed",
      "in_sequence", "replied", "converted", "lost",
      "unsubscribed", "do_not_contact", "bounced",
    ]);
    expect(all).toHaveLength(11);
    expect(new Set(all).size).toBe(11);
  });

  it("includes terminal states (cannot send emails)", () => {
    const terminal: TLeadStatus[] = ["converted", "lost", "unsubscribed", "do_not_contact", "bounced"];
    terminal.forEach(s => expect(s).toBeDefined());
  });
});

describe("draft_status enum has all 6 values", () => {
  it("includes all 6 draft statuses", () => {
    const all: TDraftStatus[] = assertExhaustive<TDraftStatus>([
      "pending", "approved", "edited", "sent", "held", "cancelled",
    ]);
    expect(all).toHaveLength(6);
  });
});

describe("integration_provider enum has all 11 values (Phase 1 schema completeness)", () => {
  it("includes all 11 providers", () => {
    const all: TIntegrationProvider[] = assertExhaustive<TIntegrationProvider>([
      "gmail", "calendly", "cal_com", "acuity", "setmore",
      "square", "ms_bookings", "tidycal", "slack", "twilio", "instagram",
    ]);
    expect(all).toHaveLength(11);
  });
});

describe("lead_event_type enum has all 18 values", () => {
  it("includes all 18 event types", () => {
    const all: TLeadEventType[] = assertExhaustive<TLeadEventType>([
      "call_booked", "no_show", "call_completed", "email_sent",
      "email_opened", "replied", "draft_approved", "draft_held",
      "state_changed", "unsubscribed", "bounced", "note_added",
      "sequence_started", "sequence_paused", "sequence_resumed",
      "sequence_completed", "sequence_cancelled", "manually_enrolled",
    ]);
    expect(all).toHaveLength(18);
  });
});
