import "server-only";
import type { RegisterWebhookArgs, RegisteredWebhook } from "./index";

export async function registerAcuityWebhook(_args: RegisterWebhookArgs): Promise<RegisteredWebhook | null> {
  return null;
}
