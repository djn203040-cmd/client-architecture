import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock adminClient before importing the module under test
vi.mock("@/lib/supabase/admin", () => ({
  adminClient: {
    from: vi.fn(),
  },
}));

import { matchTranscriptToLead } from "@/lib/transcripts/lead-matching";
import { adminClient } from "@/lib/supabase/admin";

function makeLead(overrides: Partial<{ id: string; name: string; email: string; created_at: string }> = {}) {
  return {
    id: overrides.id ?? "lead-uuid-1",
    name: overrides.name ?? "Jane Doe",
    email: overrides.email ?? "jane@example.com",
    created_at: overrides.created_at ?? new Date().toISOString(),
  };
}

function mockLeads(leads: ReturnType<typeof makeLead>[]) {
  const chainMock = {
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    then: undefined as unknown,
  };
  // Make the chain thenable so `await adminClient.from(...).select(...).eq(...)` resolves
  Object.defineProperty(chainMock, "then", {
    get() { return (resolve: (v: { data: typeof leads }) => void) => resolve({ data: leads }); },
  });
  vi.mocked(adminClient.from).mockReturnValue(chainMock as unknown as ReturnType<typeof adminClient.from>);
}

beforeEach(() => vi.clearAllMocks());

describe("matchTranscriptToLead, email matching", () => {
  it("returns leadId + matchedBy=email on exact email match (case-insensitive)", async () => {
    mockLeads([makeLead({ id: "lead-1", email: "Jane@Example.COM" })]);
    const result = await matchTranscriptToLead({
      coachId: "coach-1",
      attendeeEmails: ["jane@example.com"],
      attendeeNames: [],
      callAt: new Date().toISOString(),
    });
    expect(result).toMatchObject({ leadId: "lead-1", matchedBy: "email" });
  });

  it("returns no match when email does not match", async () => {
    mockLeads([makeLead({ email: "other@example.com" })]);
    const result = await matchTranscriptToLead({
      coachId: "coach-1",
      attendeeEmails: ["notmatching@example.com"],
      attendeeNames: [],
      callAt: new Date().toISOString(),
    });
    expect(result.leadId).toBeNull();
  });
});

describe("matchTranscriptToLead, name+timestamp fuzzy matching", () => {
  it("returns high confidence match when name matches and call is within 3 days of lead created_at", async () => {
    const created = new Date();
    created.setDate(created.getDate() - 1); // 1 day ago, within window
    mockLeads([makeLead({ id: "lead-2", name: "John Smith", email: "other@x.com", created_at: created.toISOString() })]);
    const result = await matchTranscriptToLead({
      coachId: "coach-1",
      attendeeEmails: [],
      attendeeNames: ["John Smith"],
      callAt: new Date().toISOString(),
    });
    expect(result).toMatchObject({ leadId: "lead-2", matchedBy: "name_timestamp", confidence: "high" });
  });

  it("returns low confidence suggestion when name matches but timestamp is outside 3 day window", async () => {
    const created = new Date();
    created.setDate(created.getDate() - 10); // 10 days ago, outside window
    mockLeads([makeLead({ id: "lead-3", name: "Alice Brown", email: "other@x.com", created_at: created.toISOString() })]);
    const result = await matchTranscriptToLead({
      coachId: "coach-1",
      attendeeEmails: [],
      attendeeNames: ["Alice Brown"],
      callAt: new Date().toISOString(),
    });
    expect(result.leadId).toBeNull();
    expect(result.suggestion).toMatchObject({ leadId: "lead-3", leadName: "Alice Brown" });
  });

  it("returns null when nothing matches", async () => {
    mockLeads([makeLead({ name: "Somebody Else", email: "nobody@x.com" })]);
    const result = await matchTranscriptToLead({
      coachId: "coach-1",
      attendeeEmails: [],
      attendeeNames: ["Complete Stranger"],
      callAt: new Date().toISOString(),
    });
    expect(result).toMatchObject({ leadId: null, matchedBy: null, suggestion: null });
  });

  it("returns null when lead list is empty", async () => {
    mockLeads([]);
    const result = await matchTranscriptToLead({
      coachId: "coach-1",
      attendeeEmails: ["anyone@x.com"],
      attendeeNames: ["Anyone"],
      callAt: new Date().toISOString(),
    });
    expect(result).toMatchObject({ leadId: null, suggestion: null });
  });
});
