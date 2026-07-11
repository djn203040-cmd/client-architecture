"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { ProviderCard } from "@/components/calendar/ProviderCard";
import { ConnectButton } from "@/components/calendar/ConnectButton";
import { ApiKeyForm } from "@/components/calendar/ApiKeyForm";
import { WebhookSetupPanel } from "@/components/calendar/WebhookSetupPanel";
import {
  CALENDAR_PROVIDER_IDS,
  CALENDAR_PROVIDERS,
  type CalendarProviderId,
} from "@/lib/calendar/providers";
import { toast } from "sonner";

interface Props {
  // Provider currently connected for this coach, if any.
  activeProvider: CalendarProviderId | null;
  // Which OAuth providers have their env vars present on the server. Used to disable
  // Connect buttons that would otherwise 500 immediately.
  oauthConfigured: Record<CalendarProviderId, boolean>;
}

export function StepCalendar({ activeProvider, oauthConfigured }: Props) {
  const router = useRouter();
  const [selected, setSelected] = useState<CalendarProviderId | null>(activeProvider);
  const [advancing, setAdvancing] = useState(false);

  const selectedConfig = selected ? CALENDAR_PROVIDERS[selected] : null;
  const isConnected = selected !== null && selected === activeProvider;

  async function advance(skip: boolean) {
    setAdvancing(true);
    try {
      const advanceRes = await fetch("/api/onboarding/complete-step", {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ step: "calendar" }),
      });
      if (!advanceRes.ok) {
        const body = (await advanceRes.json().catch(() => ({}))) as { error?: string };
        toast.error(body.error ?? "Couldn't advance. Try again.");
        return;
      }
      if (skip) {
        toast.message("Skipped, you can connect a calendar later from Settings.");
      }
      router.refresh();
      router.push("/onboarding/voice" as never);
    } finally {
      setAdvancing(false);
    }
  }

  return (
    <div className="space-y-6">
      <p className="text-sm text-muted-foreground leading-relaxed">
        Connect your calendar so we can pick up no-shows, post-call completions, and new bookings, 
        and start the right follow-up automatically. Pick the tool you actually use; you can switch
        later from Settings.
      </p>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {CALENDAR_PROVIDER_IDS.map((id) => {
          const config = CALENDAR_PROVIDERS[id];
          return (
            <ProviderCard
              key={id}
              provider={config}
              selected={selected === id}
              connected={activeProvider === id}
              oauthConfigured={config.authType !== "oauth2" || oauthConfigured[id]}
              onSelect={() => setSelected(id)}
            />
          );
        })}
      </div>

      {selectedConfig && !isConnected && (
        <div className="rounded-2xl backdrop-blur-md bg-white/10 dark:bg-white/5 border border-white/10 p-5 shadow-[inset_0_1px_0_rgba(255,255,255,0.08)] space-y-4">
          <div>
            <h3 className="text-sm font-semibold">{selectedConfig.label}</h3>
            <p className="text-xs text-muted-foreground mt-1">{selectedConfig.shortDescription}</p>
          </div>

          {selectedConfig.authType === "oauth2" ? (
            <ConnectButton
              provider={selectedConfig}
              oauthConfigured={oauthConfigured[selectedConfig.id]}
            />
          ) : (
            <ApiKeyForm provider={selectedConfig} />
          )}
        </div>
      )}

      {selectedConfig && isConnected && (
        <div className="rounded-2xl backdrop-blur-md bg-white/10 dark:bg-white/5 border border-white/10 p-5 shadow-[inset_0_1px_0_rgba(255,255,255,0.08)] space-y-4">
          <div>
            <h3 className="text-sm font-semibold">{selectedConfig.label}, connected</h3>
            <p className="text-xs text-muted-foreground mt-1">
              {selectedConfig.webhook.mode === "auto"
                ? "We'll start receiving bookings + no-shows automatically."
                : "Finish wiring the webhook below so we start receiving events."}
            </p>
          </div>
          <WebhookSetupPanel providerId={selectedConfig.id} />
        </div>
      )}

      <div className="flex items-center justify-between pt-2">
        <Button variant="ghost" size="sm" onClick={() => advance(true)} disabled={advancing}>
          I&apos;ll do this later
        </Button>
        <Button size="sm" onClick={() => advance(false)} disabled={advancing}>
          {advancing ? "Saving…" : isConnected ? "Continue" : "Continue without calendar"}
        </Button>
      </div>
    </div>
  );
}
