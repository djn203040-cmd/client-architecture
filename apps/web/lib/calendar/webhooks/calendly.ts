import "server-only";
import type { RegisterWebhookArgs, RegisteredWebhook } from "./index";

// Task 4 will implement the real Calendly webhook subscription POST.
// Stub returns null so the OAuth callback can complete; the coach can re-trigger
// registration from /settings once the real implementation lands.
export async function registerCalendlyWebhook(_args: RegisterWebhookArgs): Promise<RegisteredWebhook | null> {
  return null;
}
