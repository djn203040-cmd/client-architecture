"use client";

import { Button } from "@/components/ui/button";
import { ArrowSquareOut } from "@phosphor-icons/react";
import type { CalendarProviderConfig } from "@/lib/calendar/providers";

interface Props {
  provider: CalendarProviderConfig;
  oauthConfigured: boolean;
  disabled?: boolean;
}

export function ConnectButton({ provider, oauthConfigured, disabled }: Props) {
  const href = `/api/auth/calendar/${provider.id}/authorize`;
  const label = `Sign in with ${provider.label}`;

  if (!oauthConfigured) {
    return (
      <div className="space-y-2">
        <Button disabled className="w-full" variant="secondary">
          {label}
        </Button>
        <p className="text-xs text-muted-foreground leading-relaxed">
          {provider.label} sign-in isn&apos;t configured on our end yet. Set{" "}
          <code className="font-mono text-[10px] px-1 py-0.5 rounded bg-muted">
            {provider.oauth?.clientIdEnv}
          </code>{" "}
          and{" "}
          <code className="font-mono text-[10px] px-1 py-0.5 rounded bg-muted">
            {provider.oauth?.clientSecretEnv}
          </code>{" "}
          in your env, then restart the dev server.
        </p>
      </div>
    );
  }

  return (
    <Button asChild disabled={disabled} className="w-full">
      <a href={href}>
        {label}
        <ArrowSquareOut weight="regular" className="ml-2 size-4" />
      </a>
    </Button>
  );
}
