import { execSync } from "node:child_process";

export default async function globalSetup() {
  try {
    const status = execSync("supabase status", { encoding: "utf8" });
    const required = ["API URL", "DB URL", "Studio URL"];
    for (const k of required) {
      if (!status.includes(k)) {
        throw new Error(`Local Supabase missing service: ${k}`);
      }
    }
    if (!status.includes("127.0.0.1:54321")) {
      throw new Error("Local Supabase API not on 127.0.0.1:54321");
    }
  } catch (err) {
    console.error("\n[E2E] Local Supabase is not running.");
    console.error("Run `supabase start` before running tests.");
    console.error("Details:", err);
    process.exit(1);
  }
}
