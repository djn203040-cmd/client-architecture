import { describe, it, expect, vi, beforeEach } from "vitest";
import { runInngestStep } from "@/tests/utils/inngest-runner";
import type { InngestHandler } from "@/tests/utils/inngest-runner";

// Mock the send library so we exercise the Inngest orchestration (skip / deliver
// / record sequencing) without touching Gmail or the database.
const { mockLoad, mockDeliver, mockRecord, mockSafety } = vi.hoisted(() => ({
  mockLoad: vi.fn(),
  mockDeliver: vi.fn(),
  mockRecord: vi.fn(),
  mockSafety: vi.fn(),
}));

vi.mock("@/lib/gmail/send", () => ({
  loadSendContext: mockLoad,
  deliverDraft: mockDeliver,
  recordDelivery: mockRecord,
}));

// The send pipeline runs a defense-in-depth pre-send safety check (a lead can go
// DNC/unsubscribed/reply after approval but before send). Mock it so these
// orchestration tests default to "not blocked"; one test below exercises a block.
vi.mock("@/inngest/functions/sequence-step", () => ({
  runPreSendSafetyCheck: mockSafety,
}));

import { sendViaGmailHandler as _handler } from "@/inngest/functions/send-via-gmail";
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const handler = _handler as unknown as InngestHandler<any>;

const CTX = {
  draftId: "draft-1",
  coachId: "coach-1",
  leadId: "lead-1",
  toEmail: "jane@example.com",
  toName: "Jane",
  subject: "Following up",
  textBody: "Hi",
  htmlBody: "<html>Hi</html>",
  threadId: null,
  inReplyTo: null,
  touchpointIndex: 1,
  sequenceId: null,
};

function makeEvent(source = "dashboard") {
  return {
    name: "draft/send_via_gmail",
    data: { draftId: "draft-1", coachId: "coach-1", source },
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  // Default: lead is sendable. Individual tests override to exercise a block.
  mockSafety.mockResolvedValue(null);
});

describe("sendViaGmail handler", () => {
  it("sends and records on the happy path", async () => {
    mockLoad.mockResolvedValue({ ctx: CTX });
    mockDeliver.mockResolvedValue({
      gmailMessageId: "rfc-msg-id@mail.gmail.com",
      gmailThreadId: "thread-9",
    });
    mockRecord.mockResolvedValue(undefined);

    const result = await runInngestStep(handler, makeEvent());

    expect(mockDeliver).toHaveBeenCalledWith(CTX);
    expect(mockRecord).toHaveBeenCalledWith(
      CTX,
      { gmailMessageId: "rfc-msg-id@mail.gmail.com", gmailThreadId: "thread-9" },
      "dashboard",
    );
    expect(result).toMatchObject({
      sent: true,
      draftId: "draft-1",
      gmailMessageId: "rfc-msg-id@mail.gmail.com",
      gmailThreadId: "thread-9",
    });
  });

  it("skips without sending when the draft is already sent", async () => {
    mockLoad.mockResolvedValue({ skip: "already_sent" });

    const result = await runInngestStep(handler, makeEvent());

    expect(mockDeliver).not.toHaveBeenCalled();
    expect(mockRecord).not.toHaveBeenCalled();
    expect(result).toMatchObject({ sent: false, skipped: "already_sent" });
  });

  it("skips when the lead has no email", async () => {
    mockLoad.mockResolvedValue({ skip: "no_lead_email" });

    const result = await runInngestStep(handler, makeEvent());

    expect(mockDeliver).not.toHaveBeenCalled();
    expect(result).toMatchObject({ sent: false, skipped: "no_lead_email" });
  });

  it("defers a manually-approved sequence draft whose scheduled time is still in the future", async () => {
    const future = new Date(Date.now() + 60 * 60 * 1000).toISOString();
    mockLoad.mockResolvedValue({ ctx: { ...CTX, scheduledSendAt: future } });

    const result = await runInngestStep(handler, makeEvent("dashboard"));

    expect(mockDeliver).not.toHaveBeenCalled();
    expect(mockRecord).not.toHaveBeenCalled();
    expect(result).toMatchObject({ sent: false, skipped: "awaiting_scheduled_time" });
  });

  it("sends a future-scheduled draft when the scheduled-send timer fires it", async () => {
    const future = new Date(Date.now() + 60 * 60 * 1000).toISOString();
    mockLoad.mockResolvedValue({ ctx: { ...CTX, scheduledSendAt: future } });
    mockDeliver.mockResolvedValue({ gmailMessageId: "x", gmailThreadId: "y" });
    mockRecord.mockResolvedValue(undefined);

    const result = await runInngestStep(handler, makeEvent("sequence_scheduled"));

    expect(mockDeliver).toHaveBeenCalled();
    expect(result).toMatchObject({ sent: true });
  });

  it("sends a sequence draft whose scheduled time has already passed (late manual approval)", async () => {
    const past = new Date(Date.now() - 60 * 60 * 1000).toISOString();
    mockLoad.mockResolvedValue({ ctx: { ...CTX, scheduledSendAt: past } });
    mockDeliver.mockResolvedValue({ gmailMessageId: "x", gmailThreadId: "y" });
    mockRecord.mockResolvedValue(undefined);

    const result = await runInngestStep(handler, makeEvent("dashboard"));

    expect(mockDeliver).toHaveBeenCalled();
    expect(result).toMatchObject({ sent: true });
  });

  it("blocks the send when the pre-send safety check fails (lead went DNC/unsubscribed after approval)", async () => {
    mockLoad.mockResolvedValue({ ctx: CTX });
    mockSafety.mockResolvedValue("dnc_flag");

    const result = await runInngestStep(handler, makeEvent("sequence_scheduled"));

    expect(mockDeliver).not.toHaveBeenCalled();
    expect(mockRecord).not.toHaveBeenCalled();
    expect(result).toMatchObject({ sent: false, skipped: "dnc_flag" });
  });

  it("defaults source to 'unknown' when omitted", async () => {
    mockLoad.mockResolvedValue({ ctx: CTX });
    mockDeliver.mockResolvedValue({ gmailMessageId: "x", gmailThreadId: "y" });
    mockRecord.mockResolvedValue(undefined);

    await runInngestStep(handler, {
      name: "draft/send_via_gmail",
      data: { draftId: "draft-1", coachId: "coach-1" },
    });

    expect(mockRecord).toHaveBeenCalledWith(CTX, expect.anything(), "unknown");
  });
});
