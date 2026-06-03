// E2E global setup. playwright.config.ts has already loaded apps/web/.env.test
// (populated in CI from `supabase status -o env`) into process.env. We validate
// those vars and confirm the local stack actually answers — rather than parsing
// the human-readable `supabase status` output, whose labels shift between CLI
// versions and broke this check.
export default async function globalSetup() {
  const url = process.env["NEXT_PUBLIC_SUPABASE_URL"];
  const anonKey = process.env["NEXT_PUBLIC_SUPABASE_ANON_KEY"];

  const fail = (msg: string, detail?: unknown): never => {
    console.error(`\n[E2E] ${msg}`);
    console.error("Run `supabase start` and export keys to apps/web/.env.test before running tests.");
    if (detail !== undefined) console.error("Details:", detail);
    process.exit(1);
  };

  if (!url || !anonKey) {
    fail("Supabase env not set (NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY).");
  }

  let parsed: URL;
  try {
    parsed = new URL(url!);
  } catch {
    fail(`NEXT_PUBLIC_SUPABASE_URL is not a valid URL: ${JSON.stringify(url)}`);
  }
  if (parsed!.protocol !== "http:" && parsed!.protocol !== "https:") {
    fail(`NEXT_PUBLIC_SUPABASE_URL must be http(s): ${JSON.stringify(url)}`);
  }

  // Confirm the local Supabase stack is actually up and reachable.
  try {
    const res = await fetch(`${url!.replace(/\/$/, "")}/auth/v1/health`, {
      headers: { apikey: anonKey! },
    });
    if (!res.ok) throw new Error(`auth health returned ${res.status}`);
  } catch (err) {
    fail(`Local Supabase not reachable at ${url}`, err);
  }
}
