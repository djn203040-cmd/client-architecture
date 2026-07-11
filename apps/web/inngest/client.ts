import { Inngest } from "inngest";

export const inngest = new Inngest({ id: "client-architecture" });

// E2E/CI has no Inngest dev server and only a stub event key, so a real
// `inngest.send()` would 401 against Inngest Cloud and turn every event-emitting
// route into a 500. INNGEST_TEST_NOOP makes event emission a no-op so route
// handlers exercise their real logic against a quiet event bus. Set ONLY in the
// E2E workflows, never in production.
if (process.env["INNGEST_TEST_NOOP"] === "1") {
  inngest.send = (async () => ({ ids: [] as string[] })) as typeof inngest.send;
}
