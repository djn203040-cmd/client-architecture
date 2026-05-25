import "server-only";
import type { CalendarProviderConfig } from "@/lib/calendar/providers";

// Dispatch table for auto webhook registration. Per-provider implementations
// (registerCalendlyWebhook, registerCalComWebhook, registerAcuityWebhook) land
// alongside this file in Task 4. Manual-mode providers are no-ops here.

export interface RegisterWebhookArgs {
  coachId: string;
  provider: CalendarProviderConfig;
  accessToken?: string; // OAuth providers
  apiKey?: string;      // API-key providers
}

export interface RegisteredWebhook {
  subscriptionId: string | null;
  webhookUrl: string;
}

export async function registerCalendarWebhook(
  args: RegisterWebhookArgs,
): Promise<RegisteredWebhook | null> {
  if (args.provider.webhook.mode !== "auto") return null;

  switch (args.provider.id) {
    case "calendly":
      return (await import("./calendly")).registerCalendlyWebhook(args);
    case "cal_com":
      return (await import("./cal-com")).registerCalComWebhook(args);
    case "acuity":
      return (await import("./acuity")).registerAcuityWebhook(args);
    default:
      return null;
  }
}
