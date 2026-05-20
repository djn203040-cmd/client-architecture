import "server-only";
import twilio, { type Twilio } from "twilio";

let _client: Twilio | null = null;

export function getTwilioClient(): Twilio {
  if (_client) return _client;
  const sid = process.env.TWILIO_ACCOUNT_SID;
  const token = process.env.TWILIO_AUTH_TOKEN;
  if (!sid || !token) throw new Error("TWILIO_ACCOUNT_SID / TWILIO_AUTH_TOKEN not set");
  _client = twilio(sid, token);
  return _client;
}
