"use client";

import { CheckCircle, LockKey } from "@phosphor-icons/react";
import type { CalendarProviderConfig } from "@/lib/calendar/providers";

interface Props {
  provider: CalendarProviderConfig;
  selected: boolean;
  connected?: boolean;
  oauthConfigured?: boolean; // false for OAuth providers whose env vars are missing
  onSelect: () => void;
}

export function ProviderCard({ provider, selected, connected, oauthConfigured = true, onSelect }: Props) {
  const initials = provider.label
    .split(/\s+/)
    .map((w) => w[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  const stateRing = connected
    ? "ring-2 ring-[oklch(60%_0.14_145)] ring-offset-2 ring-offset-background"
    : selected
      ? "ring-2 ring-[oklch(60%_0.14_60)] ring-offset-2 ring-offset-background"
      : "ring-0";

  return (
    <button
      type="button"
      onClick={onSelect}
      aria-pressed={selected}
      className={[
        "group relative flex flex-col items-start gap-3 rounded-2xl p-4 text-left",
        "backdrop-blur-md bg-white/10 dark:bg-white/5 border border-white/10",
        "shadow-[inset_0_1px_0_rgba(255,255,255,0.08)]",
        "transition-all duration-150 hover:bg-white/15 dark:hover:bg-white/10",
        "focus:outline-none focus-visible:ring-2 focus-visible:ring-[oklch(60%_0.14_60)] focus-visible:ring-offset-2",
        stateRing,
      ].join(" ")}
    >
      <div className="flex items-center justify-between w-full">
        <div
          className="flex items-center justify-center size-10 rounded-xl text-white text-sm font-semibold tracking-tight"
          style={{ backgroundColor: provider.brandColor }}
          aria-hidden
        >
          {initials}
        </div>
        {connected && (
          <span className="inline-flex items-center gap-1 text-[11px] font-medium text-[oklch(60%_0.14_145)]">
            <CheckCircle weight="fill" className="size-3.5" />
            Connected
          </span>
        )}
        {!connected && !oauthConfigured && (
          <span className="inline-flex items-center gap-1 text-[11px] font-medium text-muted-foreground" title="OAuth credentials not configured">
            <LockKey weight="regular" className="size-3.5" />
            Setup needed
          </span>
        )}
      </div>

      <div className="space-y-1">
        <div className="font-medium text-sm leading-tight">{provider.label}</div>
        <div className="text-xs text-muted-foreground leading-snug">{provider.shortDescription}</div>
      </div>

      <div className="mt-auto pt-1">
        <span className="text-[10px] uppercase tracking-wider text-muted-foreground">
          {provider.authType === "oauth2" ? "Sign in" : "API key"}
        </span>
      </div>
    </button>
  );
}
