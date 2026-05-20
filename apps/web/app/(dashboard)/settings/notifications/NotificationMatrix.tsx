"use client";
import { useState, useCallback } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { Switch } from "@/components/ui/switch";
import {
  LockSimple,
  SquaresFour,
  Envelope,
  ChatCircle,
  WhatsappLogo,
  DeviceMobile,
  type Icon as PhosphorIcon,
} from "@phosphor-icons/react";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
  TooltipProvider,
} from "@/components/ui/tooltip";

type Channel = "dashboard" | "email" | "slack" | "whatsapp" | "sms";
type EventType = "draft_ready" | "lead_replied" | "integration_broken" | "hard_bounce";

interface Pref {
  event_type: string;
  channel: string;
  enabled: boolean;
}

interface Integration {
  provider: string;
  status: string;
}

const EVENT_ROWS: { key: EventType; label: string }[] = [
  { key: "draft_ready",        label: "Draft ready" },
  { key: "lead_replied",       label: "Lead replied" },
  { key: "integration_broken", label: "Integration broken" },
  { key: "hard_bounce",        label: "Hard bounce" },
];

const CHANNEL_COLS: {
  key: Channel;
  label: string;
  Icon: PhosphorIcon;
  connectHash?: string;
}[] = [
  { key: "dashboard", label: "Dashboard", Icon: SquaresFour },
  { key: "email",     label: "Email",     Icon: Envelope },
  { key: "slack",     label: "Slack",     Icon: ChatCircle,    connectHash: "slack" },
  { key: "whatsapp",  label: "WhatsApp",  Icon: WhatsappLogo,  connectHash: "twilio" },
  { key: "sms",       label: "SMS",       Icon: DeviceMobile,  connectHash: "twilio" },
];

export function getLockedOn(eventType: EventType, channel: Channel): string | null {
  if (channel === "dashboard") return "Dashboard notifications can't be turned off.";
  if (eventType === "hard_bounce" && channel === "sms") return "Bounces always send via SMS.";
  return null;
}

export function isConnected(channel: Channel, integrations: Integration[]): boolean {
  if (channel === "dashboard" || channel === "email") return true;
  if (channel === "slack") return integrations.some((i) => i.provider === "slack" && i.status === "connected");
  if (channel === "whatsapp" || channel === "sms")
    return integrations.some((i) => i.provider === "twilio" && i.status === "connected");
  return false;
}

export function NotificationMatrix({
  initialPreferences,
  integrations,
}: {
  initialPreferences: Pref[];
  integrations: Integration[];
}) {
  const [prefs, setPrefs] = useState<Pref[]>(initialPreferences);

  const get = useCallback(
    (eventType: EventType, channel: Channel): boolean => {
      if (getLockedOn(eventType, channel)) return true;
      return (
        prefs.find((p) => p.event_type === eventType && p.channel === channel)?.enabled ?? false
      );
    },
    [prefs],
  );

  async function toggle(eventType: EventType, channel: Channel, enabled: boolean) {
    if (getLockedOn(eventType, channel)) return;

    setPrefs((prev) => {
      const idx = prev.findIndex((p) => p.event_type === eventType && p.channel === channel);
      if (idx === -1) return [...prev, { event_type: eventType as string, channel: channel as string, enabled }];
      const next = [...prev];
      next[idx] = { event_type: eventType as string, channel: channel as string, enabled };
      return next;
    });

    const r = await fetch("/api/settings/notifications", {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ event_type: eventType, channel, enabled }),
    });

    if (!r.ok) {
      setPrefs((prev) => {
        const idx = prev.findIndex((p) => p.event_type === eventType && p.channel === channel);
        if (idx === -1) return prev;
        const next = [...prev];
        next[idx] = { event_type: eventType as string, channel: channel as string, enabled: !enabled };
        return next;
      });
      toast.error("Couldn't save preference. Try again.");
    }
  }

  return (
    <TooltipProvider>
      <div className="rounded-2xl backdrop-blur-md bg-white/10 dark:bg-white/5 border border-white/10 p-6 shadow-[inset_0_1px_0_rgba(255,255,255,0.08)] space-y-4">
        <h2 className="text-xl font-semibold">Channel preferences</h2>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[480px]">
            <thead>
              <tr>
                <th className="text-left pb-3 pr-4 w-36"></th>
                {CHANNEL_COLS.map(({ key, label, Icon, connectHash }) => {
                  const connected = isConnected(key, integrations);
                  return (
                    <th
                      key={key}
                      className={`pb-3 px-2 text-xs font-medium uppercase tracking-wide text-muted-foreground text-center transition-opacity ${connected ? "" : "opacity-50"}`}
                    >
                      <div className="flex flex-col items-center gap-1.5">
                        <Icon className="size-4" weight="regular" aria-hidden />
                        <span>{label}</span>
                        {key === "dashboard" && (
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <span className="cursor-default">
                                <LockSimple className="size-3 text-muted-foreground" weight="regular" aria-label="Always on" />
                              </span>
                            </TooltipTrigger>
                            <TooltipContent>Dashboard notifications can&apos;t be turned off.</TooltipContent>
                          </Tooltip>
                        )}
                        {!connected && connectHash && (
                          <Link
                            href={`/settings/integrations#${connectHash}` as never}
                            className="text-[10px] text-accent hover:underline"
                          >
                            Connect
                          </Link>
                        )}
                      </div>
                    </th>
                  );
                })}
              </tr>
            </thead>
            <tbody>
              {EVENT_ROWS.map(({ key: rowKey, label }) => (
                <tr key={rowKey} className="border-t border-white/10">
                  <td className="text-sm font-medium text-foreground py-3 pr-4">{label}</td>
                  {CHANNEL_COLS.map(({ key: colKey }) => {
                    const connected = isConnected(colKey, integrations);
                    const lockTooltip = getLockedOn(rowKey, colKey);
                    const value = get(rowKey, colKey);
                    const disabled = !!lockTooltip || !connected;

                    const sw = (
                      <Switch
                        checked={value}
                        onCheckedChange={(checked) => toggle(rowKey, colKey, checked)}
                        disabled={disabled}
                        aria-label={`${label} via ${colKey}`}
                      />
                    );

                    return (
                      <td key={colKey} className="py-3 text-center">
                        <div className="inline-flex items-center justify-center w-11 h-11">
                          {lockTooltip ? (
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <span>{sw}</span>
                              </TooltipTrigger>
                              <TooltipContent>{lockTooltip}</TooltipContent>
                            </Tooltip>
                          ) : (
                            sw
                          )}
                        </div>
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="text-xs text-muted-foreground">
          Dashboard notifications can&apos;t be turned off — your queue is the source of truth.
        </p>
      </div>
    </TooltipProvider>
  );
}
