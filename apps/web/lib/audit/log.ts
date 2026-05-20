import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { AuditActionEnum, type TAuditAction } from "@client/shared/validators";

interface AuditEntry {
  coachId: string;
  action: TAuditAction;
  metadata?: Record<string, unknown>;
  ipAddress?: string | null;
  userAgent?: string | null;
}

export async function writeAuditLog(
  entry: AuditEntry,
  supabaseAdmin: SupabaseClient,
): Promise<void> {
  const parsed = AuditActionEnum.safeParse(entry.action);
  if (!parsed.success) throw new Error(`Invalid audit action: ${entry.action}`);

  const { error } = await supabaseAdmin.from("audit_log").insert({
    coach_id: entry.coachId,
    action: parsed.data,
    metadata: entry.metadata ?? {},
    ip_address: entry.ipAddress ?? null,
    user_agent: entry.userAgent ?? null,
  });

  if (error) throw new Error(`Audit log write failed: ${error.message}`);
}
