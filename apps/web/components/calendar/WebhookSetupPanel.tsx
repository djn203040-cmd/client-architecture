"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Copy, CheckCircle } from "@phosphor-icons/react";
import { toast } from "sonner";
import { useDictionary } from "@/lib/i18n/provider";
import type { CalendarProviderId } from "@/lib/calendar/providers";

interface Props {
  providerId: CalendarProviderId;
}

interface WebhookInfo {
  webhookMode: "auto" | "manual";
  webhookUrl: string;
  secret: string | null;
  instructions: string | null;
}

export function WebhookSetupPanel({ providerId }: Props) {
  const t = useDictionary();
  const copy = t.settingsAdvanced.calendar.webhookSetup;
  const [info, setInfo] = useState<WebhookInfo | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(`/api/auth/calendar/webhook-info?provider=${providerId}`);
        const body = (await res.json().catch(() => ({}))) as
          | { ok: true } & WebhookInfo
          | { ok: false; error: string };
        if (cancelled) return;
        if ("ok" in body && body.ok) {
          setInfo(body as WebhookInfo);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [providerId]);

  if (loading) {
    return <p className="text-xs text-muted-foreground">{copy.loading}</p>;
  }
  if (!info) {
    return <p className="text-xs text-destructive">{copy.loadFailed}</p>;
  }
  if (info.webhookMode === "auto") {
    return (
      <div className="flex items-center gap-1.5 text-xs text-[oklch(60%_0.14_145)]">
        <CheckCircle weight="fill" className="size-3.5" />
        {copy.registeredAuto}
      </div>
    );
  }

  return (
    <div className="space-y-4 text-sm">
      <div className="space-y-2">
        <div className="text-xs font-medium text-muted-foreground">{copy.webhookUrl}</div>
        <CopyRow value={info.webhookUrl} mono />
      </div>
      {info.secret && (
        <div className="space-y-2">
          <div className="text-xs font-medium text-muted-foreground">{copy.signingSecret}</div>
          <CopyRow value={info.secret} mono masked />
        </div>
      )}
      {info.instructions && (
        <div className="space-y-2">
          <div className="text-xs font-medium text-muted-foreground">{copy.setupSteps}</div>
          <ol className="space-y-1 text-xs leading-relaxed text-muted-foreground whitespace-pre-line">
            {info.instructions}
          </ol>
        </div>
      )}
    </div>
  );
}

function CopyRow({ value, mono, masked }: { value: string; mono?: boolean; masked?: boolean }) {
  const t = useDictionary();
  const copy_ = t.settingsAdvanced.calendar.webhookSetup;
  const [copied, setCopied] = useState(false);
  const [revealed, setRevealed] = useState(!masked);

  function copy() {
    navigator.clipboard.writeText(value).then(() => {
      setCopied(true);
      toast.success(copy_.copiedToClipboard);
      setTimeout(() => setCopied(false), 1500);
    });
  }

  const display = !revealed && masked ? "•".repeat(Math.min(value.length, 32)) : value;

  return (
    <div className="flex items-center gap-2">
      <div
        className={[
          "flex-1 truncate rounded-lg px-3 py-2 text-xs",
          "bg-muted/40 border border-border",
          mono ? "font-mono" : "",
        ].join(" ")}
      >
        {display}
      </div>
      {masked && (
        <Button size="sm" variant="ghost" onClick={() => setRevealed((r) => !r)}>
          {revealed ? copy_.hide : copy_.show}
        </Button>
      )}
      <Button size="sm" variant="ghost" onClick={copy} aria-label={copy_.copy}>
        {copied ? <CheckCircle weight="fill" className="size-4" /> : <Copy weight="regular" className="size-4" />}
      </Button>
    </div>
  );
}
