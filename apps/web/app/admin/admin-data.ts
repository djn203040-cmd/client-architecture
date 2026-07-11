import "server-only";
import { adminClient } from "@/lib/supabase/admin";
import type { Database } from "@client/database";

type TCoach = Database["public"]["Tables"]["coaches"]["Row"];
type TIntegration = Database["public"]["Tables"]["integrations"]["Row"];
type TLead = Database["public"]["Tables"]["leads"]["Row"];

export type CoachRosterRow = TCoach & {
  gmail_status: Database["public"]["Enums"]["integration_status"] | null;
  watch_expiry_at: string | null;
  lead_count: number;
  active_sequence_count: number;
  onboarding_completed_at: string | null;
  onboarding_progress: Record<string, string | null> | null;
  // Pay-per-use AI cost, in USD, from the ai_usage ledger (coach_ai_usage_summary).
  ai_cost_month: number;
  ai_cost_total: number;
};

// Shape of one coach_ai_usage_summary() row. adminClient is untyped (no Database
// generic), so the RPC result is cast to this at the boundary.
type UsageSummaryRow = {
  coach_id: string;
  month_cost: number | string;
  month_input: number | string;
  month_output: number | string;
  total_cost: number | string;
  event_count: number | string;
};

// ADMIN-005: adminClient bypasses RLS, used ONLY in this server-only module.
export async function fetchCoachRoster(): Promise<CoachRosterRow[]> {
  const { data: coaches } = await adminClient
    .from("coaches")
    .select("*")
    .order("created_at", { ascending: true });

  if (!coaches || coaches.length === 0) return [];

  const ids = coaches.map((c) => c.id);

  const [{ data: integs }, { data: leadCounts }, { data: seqCounts }, { data: usageRows }] =
    await Promise.all([
      adminClient
        .from("integrations")
        .select("coach_id, status, watch_expiry_at, provider")
        .in("coach_id", ids)
        .eq("provider", "gmail"),
      adminClient.from("leads").select("coach_id").in("coach_id", ids),
      adminClient.from("sequences").select("coach_id, status").in("coach_id", ids),
      adminClient.rpc("coach_ai_usage_summary"),
    ]);

  const usageByCoach = new Map<string, UsageSummaryRow>(
    ((usageRows as UsageSummaryRow[] | null) ?? []).map((u) => [u.coach_id, u]),
  );

  return coaches.map((c) => {
    const usage = usageByCoach.get(c.id);
    const raw = c as typeof c & {
      onboarding_completed_at?: string | null;
      onboarding_progress?: Record<string, string | null> | null;
    };
    const integ = integs?.find((i) => i.coach_id === c.id);
    return {
      ...c,
      gmail_status: integ?.status ?? null,
      watch_expiry_at: integ?.watch_expiry_at ?? null,
      lead_count: leadCounts?.filter((l) => l.coach_id === c.id).length ?? 0,
      active_sequence_count:
        seqCounts?.filter((s) => s.coach_id === c.id && s.status === "active").length ?? 0,
      onboarding_completed_at: raw.onboarding_completed_at ?? null,
      onboarding_progress: raw.onboarding_progress ?? null,
      ai_cost_month: Number(usage?.month_cost ?? 0),
      ai_cost_total: Number(usage?.total_cost ?? 0),
    };
  });
}

export async function fetchCoachDetail(
  coachId: string,
): Promise<{ coach: TCoach; leads: TLead[]; integrations: TIntegration[] } | null> {
  const { data: coach } = await adminClient
    .from("coaches")
    .select("*")
    .eq("id", coachId)
    .maybeSingle();

  if (!coach) return null;

  const [{ data: leads }, { data: integrations }] = await Promise.all([
    adminClient
      .from("leads")
      .select("*")
      .eq("coach_id", coachId)
      .order("created_at", { ascending: false }),
    adminClient.from("integrations").select("*").eq("coach_id", coachId),
  ]);

  return {
    coach,
    leads: leads ?? [],
    integrations: integrations ?? [],
  };
}

export type SystemHealth = {
  coaches: {
    id: string;
    name: string;
    email: string;
    gmail_status: string;
    watch_expiry_at: string | null;
  }[];
  inngest: { queue_depth: number | null };
  cron: { last_run_at: string | null };
};

export async function fetchSystemHealth(): Promise<SystemHealth> {
  const [{ data: integs }, { data: coaches }] = await Promise.all([
    adminClient
      .from("integrations")
      .select("coach_id, status, watch_expiry_at")
      .eq("provider", "gmail"),
    adminClient.from("coaches").select("id, name, email"),
  ]);

  return {
    coaches: (coaches ?? []).map((c) => {
      const integ = integs?.find((i) => i.coach_id === c.id);
      return {
        id: c.id,
        name: c.name,
        email: c.email,
        gmail_status: integ?.status ?? "disconnected",
        watch_expiry_at: integ?.watch_expiry_at ?? null,
      };
    }),
    inngest: { queue_depth: null }, // Phase 3 wires Inngest REST API
    cron: { last_run_at: null }, // Phase 3 wires Vercel Cron health table
  };
}
