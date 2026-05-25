"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
import { ArrowsClockwise } from "@phosphor-icons/react";

interface Integration {
  id: string;
  provider: string;
  status: string;
  error_message?: string | null;
  last_checked_at?: string | null;
}

interface Props {
  activeProvider: CalendarProviderId | null;
  integrations: Integration[];
  oauthConfigured: Record<CalendarProviderId, boolean>;
}

export function CalendarSection({ activeProvider, integrations, oauthConfigured }: Props) {
  const router = useRouter();
  const [picker, setPicker] = useState<CalendarProviderId | null>(null);
  const [switching, setSwitching] = useState(false);
  const [confirmSwitchTo, setConfirmSwitchTo] = useState<CalendarProviderId | null>(null);
  const [disconnecting, setDisconnecting] = useState(false);
  const [confirmDisconnect, setConfirmDisconnect] = useState(false);

  const activeConfig = activeProvider ? CALENDAR_PROVIDERS[activeProvider] : null;
  const activeIntegration = activeProvider
    ? integrations.find((i) => i.provider === activeProvider)
    : null;

  async function disconnect(provider: CalendarProviderId) {
    setDisconnecting(true);
    try {
      const res = await fetch(`/api/auth/calendar/${provider}/disconnect`, { method: "POST" });
      if (!res.ok) {
        toast.error("Couldn't disconnect. Try again.");
        return false;
      }
      toast.success(`${CALENDAR_PROVIDERS[provider].label} disconnected.`);
      router.refresh();
      return true;
    } finally {
      setDisconnecting(false);
      setConfirmDisconnect(false);
    }
  }

  async function switchTo(provider: CalendarProviderId) {
    if (!activeProvider) {
      // No current provider; just start connect for the new one.
      startConnect(provider);
      return;
    }
    setSwitching(true);
    try {
      const ok = await disconnect(activeProvider);
      if (!ok) return;
      // Now route to the new provider's connect flow.
      startConnect(provider);
    } finally {
      setSwitching(false);
      setConfirmSwitchTo(null);
    }
  }

  function startConnect(provider: CalendarProviderId) {
    const config = CALENDAR_PROVIDERS[provider];
    if (config.authType === "oauth2") {
      window.location.assign(`/api/auth/calendar/${provider}/authorize`);
    } else {
      // API-key — surface the picker form inline.
      setPicker(provider);
    }
  }

  return (
    <div className="space-y-5">
      <div className="space-y-1">
        <h2 className="text-xl font-semibold">Calendar</h2>
        <p className="text-sm text-muted-foreground max-w-[65ch]">
          Connect a single calendar tool. We listen for no-shows, completed calls, and new bookings,
          then start the right follow-up automatically.
        </p>
      </div>

      {/* CONNECTED STATE */}
      {activeConfig ? (
        <div className="space-y-4">
          <div className="rounded-2xl backdrop-blur-md bg-white/10 dark:bg-white/5 border border-white/10 p-5 shadow-[inset_0_1px_0_rgba(255,255,255,0.08)] space-y-4">
            <div className="flex items-start gap-4">
              <div
                className="flex items-center justify-center size-10 rounded-xl text-white text-sm font-semibold tracking-tight"
                style={{ backgroundColor: activeConfig.brandColor }}
                aria-hidden
              >
                {activeConfig.label
                  .split(/\s+/)
                  .map((w) => w[0])
                  .slice(0, 2)
                  .join("")
                  .toUpperCase()}
              </div>
              <div className="flex-1 space-y-1">
                <div className="flex items-center gap-2">
                  <span className="font-medium text-sm">{activeConfig.label}</span>
                  <span className="text-[11px] font-medium text-[oklch(60%_0.14_145)]">
                    {activeIntegration?.status === "connected" ? "Connected" : (activeIntegration?.status ?? "unknown")}
                  </span>
                </div>
                {activeIntegration?.last_checked_at && (
                  <p className="text-xs text-muted-foreground">
                    Last checked {new Date(activeIntegration.last_checked_at).toLocaleString()}
                  </p>
                )}
                {activeIntegration?.error_message && (
                  <p className="text-xs text-destructive">{activeIntegration.error_message}</p>
                )}
              </div>
              <Button variant="ghost" size="sm" onClick={() => setConfirmDisconnect(true)} disabled={disconnecting}>
                {disconnecting ? "Disconnecting…" : "Disconnect"}
              </Button>
            </div>

            <div className="pt-2 border-t border-white/10">
              <details className="group">
                <summary className="text-xs font-medium text-muted-foreground cursor-pointer select-none list-none flex items-center gap-1">
                  Webhook setup
                  <span className="text-muted-foreground/60 group-open:hidden">→ show</span>
                  <span className="text-muted-foreground/60 hidden group-open:inline">↓ hide</span>
                </summary>
                <div className="mt-3">
                  <WebhookSetupPanel providerId={activeConfig.id} />
                </div>
              </details>
            </div>
          </div>

          <SwitchPicker
            activeProvider={activeProvider}
            onSelect={(id) => setConfirmSwitchTo(id)}
            switching={switching}
          />
        </div>
      ) : (
        // NO CALENDAR CONNECTED YET
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">Pick the calendar you use:</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {CALENDAR_PROVIDER_IDS.map((id) => {
              const config = CALENDAR_PROVIDERS[id];
              return (
                <ProviderCard
                  key={id}
                  provider={config}
                  selected={picker === id}
                  oauthConfigured={config.authType !== "oauth2" || oauthConfigured[id]}
                  onSelect={() => setPicker(id)}
                />
              );
            })}
          </div>

          {picker && (
            <div className="rounded-2xl backdrop-blur-md bg-white/10 dark:bg-white/5 border border-white/10 p-5 shadow-[inset_0_1px_0_rgba(255,255,255,0.08)] space-y-4">
              <h3 className="text-sm font-semibold">{CALENDAR_PROVIDERS[picker].label}</h3>
              {CALENDAR_PROVIDERS[picker].authType === "oauth2" ? (
                <ConnectButton
                  provider={CALENDAR_PROVIDERS[picker]}
                  oauthConfigured={oauthConfigured[picker]}
                />
              ) : (
                <ApiKeyForm provider={CALENDAR_PROVIDERS[picker]} />
              )}
            </div>
          )}
        </div>
      )}

      {/* Confirm disconnect */}
      <Dialog open={confirmDisconnect} onOpenChange={setConfirmDisconnect}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Disconnect {activeConfig?.label}?</DialogTitle>
            <DialogDescription>
              We&apos;ll stop receiving bookings and no-shows from {activeConfig?.label}. Sequences
              that were already started for existing leads keep running.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setConfirmDisconnect(false)} disabled={disconnecting}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() => activeProvider && disconnect(activeProvider)}
              disabled={disconnecting || !activeProvider}
            >
              {disconnecting ? "Disconnecting…" : "Disconnect"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Confirm switch */}
      <Dialog open={confirmSwitchTo !== null} onOpenChange={(open) => !open && setConfirmSwitchTo(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              Switch to {confirmSwitchTo ? CALENDAR_PROVIDERS[confirmSwitchTo].label : ""}?
            </DialogTitle>
            <DialogDescription>
              We&apos;ll disconnect {activeConfig?.label} first, then walk you through connecting{" "}
              {confirmSwitchTo ? CALENDAR_PROVIDERS[confirmSwitchTo].label : ""}. You can switch back
              any time.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setConfirmSwitchTo(null)} disabled={switching}>
              Cancel
            </Button>
            <Button onClick={() => confirmSwitchTo && switchTo(confirmSwitchTo)} disabled={switching || !confirmSwitchTo}>
              {switching ? "Switching…" : "Switch"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// Native <select> for switching — minimal, no extra primitive to import.
function SwitchPicker({
  activeProvider,
  onSelect,
  switching,
}: {
  activeProvider: CalendarProviderId | null;
  onSelect: (id: CalendarProviderId) => void;
  switching: boolean;
}) {
  const others = CALENDAR_PROVIDER_IDS.filter((id) => id !== activeProvider);

  return (
    <div className="flex items-center gap-2 text-sm">
      <ArrowsClockwise weight="regular" className="size-4 text-muted-foreground" />
      <label htmlFor="switch-calendar" className="text-muted-foreground">
        Use a different calendar?
      </label>
      <select
        id="switch-calendar"
        defaultValue=""
        disabled={switching}
        onChange={(e) => {
          const v = e.target.value as CalendarProviderId | "";
          if (v) onSelect(v);
          e.target.value = "";
        }}
        className="rounded-lg px-3 py-1.5 text-sm bg-white/10 dark:bg-white/5 border border-white/10 focus:outline-none focus:ring-2 focus:ring-[oklch(60%_0.14_60)]"
      >
        <option value="" disabled>
          Pick one…
        </option>
        {others.map((id) => (
          <option key={id} value={id}>
            {CALENDAR_PROVIDERS[id].label}
          </option>
        ))}
      </select>
    </div>
  );
}
