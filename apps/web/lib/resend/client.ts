import "server-only";
import { Resend } from "resend";

let _client: Resend | null = null;

export function getResendClient(): Resend {
  if (_client) return _client;
  const key = process.env.RESEND_API_KEY;
  if (!key) throw new Error("RESEND_API_KEY env var not set");
  _client = new Resend(key);
  return _client;
}
