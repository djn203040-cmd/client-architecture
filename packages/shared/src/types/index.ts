import type { Database } from "@client/database";

export type TLead = Database["public"]["Tables"]["leads"]["Row"];
export type TLeadInsert = Database["public"]["Tables"]["leads"]["Insert"];
export type TLeadUpdate = Database["public"]["Tables"]["leads"]["Update"];

export type TCoach = Database["public"]["Tables"]["coaches"]["Row"];
export type TIntegration = Database["public"]["Tables"]["integrations"]["Row"];
export type TLeadEvent = Database["public"]["Tables"]["lead_events"]["Row"];
export type TDraft = Database["public"]["Tables"]["drafts"]["Row"];
export type TSequence = Database["public"]["Tables"]["sequences"]["Row"];
export type TDraftEdit = Database["public"]["Tables"]["draft_edits"]["Row"];

// Enum aliases (re-exported for hand-coded validators)
export type TLeadStatus = Database["public"]["Enums"]["lead_status"];
export type TLeadSource = Database["public"]["Enums"]["lead_source"];
export type TDraftStatus = Database["public"]["Enums"]["draft_status"];
export type TIntegrationProvider = Database["public"]["Enums"]["integration_provider"];
export type TLeadEventType = Database["public"]["Enums"]["lead_event_type"];
export type TSequenceStatus = Database["public"]["Enums"]["sequence_status"];
export type TNotificationChannel = Database["public"]["Enums"]["notification_channel"];
export type TIntegrationStatus = Database["public"]["Enums"]["integration_status"];

export * from "./calendar";
