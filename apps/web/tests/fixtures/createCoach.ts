import { createClient } from "@supabase/supabase-js";
import crypto from "node:crypto";

const SUPABASE_URL =
  process.env.NEXT_PUBLIC_SUPABASE_URL ?? "http://127.0.0.1:54321";
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";
const ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";

export const admin = createClient(SUPABASE_URL, SERVICE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

// Regular client used only to sign in and get a real JWT for cookie injection.
// Never leaks service-role key to browser.
const authClient = createClient(SUPABASE_URL, ANON_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

export type SeededCoach = {
  id: string;
  email: string;
  /** Cookies formatted for page.context().addCookies() */
  cookies: { name: string; value: string; domain: string; path: string; httpOnly: boolean; secure: boolean }[];
};

/**
 * Creates a confirmed Supabase auth user + coaches row and returns a
 * SeededCoach with session cookies in the @supabase/ssr base64url format
 * that the Next.js app reads from request.cookies.
 */
export async function createCoach(
  overrides: Partial<{ email: string; language: "en" | "da" }> = {},
): Promise<SeededCoach> {
  const email = overrides.email ?? `coach-${crypto.randomUUID()}@sonorous.test`;
  const password = `Test1234!${crypto.randomUUID()}`;

  const { data: { user }, error: createErr } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  });
  if (createErr || !user) throw createErr ?? new Error("createUser failed");

  const { error: coachErr } = await admin.from("coaches").insert({
    id: user.id,
    email,
    name: "Test Coach",
    // Defaults to 'en' in the DB; pass 'da' to seed a Danish coach for i18n specs.
    ...(overrides.language ? { language: overrides.language } : {}),
  });
  if (coachErr) throw coachErr;

  const { data: { session }, error: signInErr } = await authClient.auth.signInWithPassword({
    email,
    password,
  });
  if (signInErr || !session) throw signInErr ?? new Error("signInWithPassword failed");

  // Build cookies matching @supabase/ssr base64url encoding
  // Storage key: sb-{hostname-first-segment}-auth-token
  const storageKey = `sb-${new URL(SUPABASE_URL).hostname.split(".")[0]}-auth-token`;
  const encoded = `base64-${Buffer.from(JSON.stringify(session)).toString("base64url")}`;

  // Split into 3500-char chunks to stay under the 4096-byte cookie limit
  const CHUNK = 3500;
  const chunks: string[] = [];
  for (let i = 0; i < encoded.length; i += CHUNK) chunks.push(encoded.slice(i, i + CHUNK));

  const cookies = chunks.map((value, i) => ({
    name: chunks.length === 1 ? storageKey : `${storageKey}.${i}`,
    value,
    domain: "localhost",
    path: "/",
    httpOnly: false,
    secure: false,
  }));

  return { id: user.id, email, cookies };
}
