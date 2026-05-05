// SERVER-SIDE ONLY. Importing this in a "use client" component
// will leak the service role key to the browser bundle.
// CI grep check (.github/workflows/ci.yml) blocks NEXT_PUBLIC_*SERVICE_ROLE.
import { createClient } from "@supabase/supabase-js";

export const adminClient = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!  // NO NEXT_PUBLIC_ prefix — enforced by CI
);
