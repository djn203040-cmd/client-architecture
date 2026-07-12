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
import { useDictionary } from "@/lib/i18n/provider";

interface Props {
  // Provider currently connected for this coach, if any.
  activeProvider: CalendarProviderId | null;
  // Which OAuth providers have their env vars present on the server. Used to disable
  // Connect buttons that would otherwise 500 immediately.
  oauthConfigured: Record<CalendarProviderId, boolean>;
}

export function StepCalendar({ activeProvider, oauthConfigured }: Props) {
  const t = useDictionary();
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
        toast.error(body.error ?? t.onboarding.calendar.advanceFailed);
        return;
      }
      if (skip) {
        toast.message(t.onboarding.calendar.skippedToast);
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
        {t.onboarding.calendar.intro}
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
            <h3 className="text-sm font-semibold">{t.onboarding.calendar.connectedHeading(selectedConfig.label)}</h3>
            <p className="text-xs text-muted-foreground mt-1">
              {selectedConfig.webhook.mode === "auto"
                ? t.onboarding.calendar.autoReady
                : t.onboarding.calendar.manualReady}
            </p>
          </div>
          <WebhookSetupPanel providerId={selectedConfig.id} />
        </div>
      )}

      <div className="flex items-center justify-between pt-2">
        <Button variant="ghost" size="sm" onClick={() => advance(true)} disabled={advancing}>
          {t.onboarding.calendar.later}
        </Button>
        <Button size="sm" onClick={() => advance(false)} disabled={advancing}>
          {advancing
            ? t.onboarding.calendar.saving
            : isConnected
              ? t.onboarding.calendar.continue
              : t.onboarding.calendar.continueWithout}
        </Button>
      </div>
    </div>
  );
}
