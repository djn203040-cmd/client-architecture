/**
 * Service-role Supabase test client for integration tests.
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

// NOTE (#126): the old seedCoach()/seedDraft() helpers were removed. seedCoach
// inserted a coaches row without creating the matching auth.users row, which
// violates coaches_id_fkey. All coach/lead/draft seeding is consolidated on
// tests/fixtures/ (createCoach creates the auth user first).
