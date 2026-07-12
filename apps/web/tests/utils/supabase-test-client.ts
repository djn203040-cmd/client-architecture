/**
 * Service-role Supabase test client + RLS impersonation helper for Phase 4
 * integration tests.
 *
 * Reads `NEXT_PUBLIC_SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` from env;
 * never hard-codes secrets. Used against the staging Supabase project in CI.
 */

import { createClient, type SupabaseClient } from "@supabase/supabase-js";

export interface TestSupabaseClient extends SupabaseClient {
  coachId?: string;
}

export function createTestClient(coachId?: string): TestSupabaseClient {
  const url = process.env["NEXT_PUBLIC_SUPABASE_URL"];
  const serviceKey = process.env["SUPABASE_SERVICE_ROLE_KEY"];

  if (!url || !serviceKey) {
    throw new Error(
      "createTestClient: NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set",
    );
  }

  const client = createClient(url, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  }) as TestSupabaseClient;

  if (coachId) {
    client.coachId = coachId;
  }

  return client;
}

/**
 * Impersonate a coach for RLS-scoped reads. Sets a forged JWT claim by writing
 * to `request.jwt.claim.sub` via Postgres `set_config`. Caller is responsible
 * for running this in a single transaction or RPC if isolation matters.
 */
export async function withRlsAs(
  client: TestSupabaseClient,
  coachId: string,
): Promise<void> {
  const { error } = await client.rpc("set_config", {
    parameter: "request.jwt.claim.sub",
    value: coachId,
    is_local: true,
  });

  if (error) {
    throw new Error(`withRlsAs: failed to set RLS context, ${error.message}`);
  }
}

export interface SeedCoachInput {
  id?: string;
  email: string;
}

export interface SeededCoach {
  id: string;
  email: string;
}

export async function seedCoach(
  client: TestSupabaseClient,
  input: SeedCoachInput,
): Promise<SeededCoach> {
  const id = input.id ?? crypto.randomUUID();
  const { data, error } = await client
    .from("coaches")
    // coaches.name is NOT NULL, seed a default so the insert satisfies the schema.
    .insert({ id, email: input.email, name: "Test Coach" })
    .select("id, email")
    .single();

  if (error) {
    throw new Error(`seedCoach: ${error.message}`);
  }

  return data as SeededCoach;
}

export interface SeedDraftInput {
  coachId: string;
  leadId: string;
  status?: string;
  scheduledSendAt?: string;
  body?: string;
  subject?: string;
}

export interface SeededDraft {
  id: string;
  coach_id: string;
  lead_id: string;
  status: string;
}

export async function seedDraft(
  client: TestSupabaseClient,
  input: SeedDraftInput,
): Promise<SeededDraft> {
  const { data, error } = await client
    .from("drafts")
    .insert({
      coach_id: input.coachId,
      lead_id: input.leadId,
      status: input.status ?? "pending",
      scheduled_send_at: input.scheduledSendAt ?? null,
      body: input.body ?? "test draft body",
      subject: input.subject ?? "test subject",
    })
    .select("id, coach_id, lead_id, status")
    .single();

  if (error) {
    throw new Error(`seedDraft: ${error.message}`);
  }

  return data as SeededDraft;
}
