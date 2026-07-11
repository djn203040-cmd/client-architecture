// SERVER-SIDE ONLY. Importing this in a "use client" component
// will leak the service role key to the browser bundle.
// CI grep check (.github/workflows/ci.yml) blocks NEXT_PUBLIC_*SERVICE_ROLE.
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

// Lazily constructed singleton. The real client is built on FIRST USE, not at
// module load, so `next build` page-data collection (which imports every route
// that pulls in `adminClient`) no longer throws `supabaseUrl is required` when
// the Supabase env vars are absent (e.g. Preview deploys without prod secrets).
// Construction still happens at request time, where the env is present.
let _client: SupabaseClient | null = null;

function getAdminClient(): SupabaseClient {
  if (!_client) {
    _client = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY! // NO NEXT_PUBLIC_ prefix, enforced by CI
    );
  }
  return _client;
}

// Proxy preserves the `adminClient` export shape so every existing
// `adminClient.from(...)` / `.rpc(...)` / `.auth...` call site stays unchanged.
// Property access constructs (or reuses) the real client; methods are bound to
// it so `this` resolves correctly.
export const adminClient: SupabaseClient = new Proxy({} as SupabaseClient, {
  get(_target, prop, receiver) {
    const client = getAdminClient();
    const value = Reflect.get(client, prop, receiver);
    return typeof value === "function" ? value.bind(client) : value;
  },
});
