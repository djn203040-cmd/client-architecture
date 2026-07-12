"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { CheckCircle, ArrowSquareOut } from "@phosphor-icons/react";
import { toast } from "sonner";
import { useDictionary } from "@/lib/i18n/provider";
import type { CalendarProviderConfig } from "@/lib/calendar/providers";

interface Props {
  provider: CalendarProviderConfig;
  onConnected?: () => void;
}

export function ApiKeyForm({ provider, onConnected }: Props) {
  const t = useDictionary();
  const copy = t.settingsAdvanced.calendar.apiKeyForm;
  const router = useRouter();
  const [apiKey, setApiKey] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [tested, setTested] = useState(false);
  const [testOk, setTestOk] = useState(false);

  if (provider.authType !== "api_key" || !provider.apiKey) return null;

  async function send(dryRun: boolean) {
    if (!apiKey.trim()) return;
    setSubmitting(true);
    try {
      const res = await fetch(`/api/auth/calendar/${provider.id}/api-key`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ apiKey: apiKey.trim(), dryRun }),
      });
      const body = (await res.json().catch(() => ({}))) as { ok?: boolean; error?: string; detail?: string };
      if (!res.ok || !body.ok) {
        const msg = body.error === "invalid_api_key" ? copy.invalidKey : body.error ?? copy.connectionFailed;
        toast.error(msg);
        setTested(true);
        setTestOk(false);
        return;
      }
      if (dryRun) {
        setTested(true);
        setTestOk(true);
        toast.success(copy.keyWorks);
      } else {
        toast.success(copy.connected(provider.label));
        onConnected?.();
        router.refresh();
      }
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor={`apikey-${provider.id}`}>{provider.apiKey.fieldLabel}</Label>
        <Input
          id={`apikey-${provider.id}`}
          type="password"
          autoComplete="off"
          value={apiKey}
          onChange={(e) => {
            setApiKey(e.target.value);
            setTested(false);
          }}
          disabled={submitting}
          placeholder={copy.pasteKeyPlaceholder}
        />
        <a
          href={provider.apiKey.helpUrl}
          target="_blank"
          rel="noreferrer noopener"
          className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground underline underline-offset-2"
        >
          {copy.whereFind}
          <ArrowSquareOut weight="regular" className="size-3" />
        </a>
      </div>

      {tested && testOk && (
        <div className="flex items-center gap-1.5 text-xs text-[oklch(60%_0.14_145)]">
          <CheckCircle weight="fill" className="size-3.5" />
          {copy.keyVerified}
        </div>
      )}

      <div className="flex items-center gap-2">
        <Button variant="ghost" size="sm" disabled={submitting || !apiKey.trim()} onClick={() => send(true)}>
          {copy.test}
        </Button>
        <Button size="sm" disabled={submitting || !apiKey.trim()} onClick={() => send(false)}>
          {submitting ? copy.saving : copy.saveConnect}
        </Button>
      </div>
    </div>
  );
}
