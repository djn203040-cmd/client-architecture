import { createBrowserClient } from "@supabase/ssr";
import type { SupabaseClient } from "@supabase/supabase-js";

export const createClient = () => {
  const client = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  // supabase-js only syncs the Realtime socket's token on SIGNED_IN /
  // TOKEN_REFRESHED. A page load that restores the session from cookies emits
  // INITIAL_SESSION instead, so without this the socket can keep the anon key
  // and RLS silently drops every postgres_changes event.
  client.auth.onAuthStateChange((event, session) => {
    if (event === "INITIAL_SESSION" && session) {
      void client.realtime.setAuth(session.access_token);
    }
  });

  return client;
};

/**
 * Await this BEFORE calling channel.subscribe().
 *
 * supabase-js propagates the user JWT to Realtime asynchronously; a join that
 * races that propagation is registered server-side with anon claims, and the
 * late token push is skipped while the join is still in flight — so RLS
 * silently drops every event for the channel's whole lifetime. Resolving the
 * session and setting Realtime auth first makes the join carry the user JWT.
 */
export async function realtimeAuthReady(client: SupabaseClient): Promise<void> {
  const {
    data: { session },
  } = await client.auth.getSession();
  if (session) await client.realtime.setAuth(session.access_token);
}
