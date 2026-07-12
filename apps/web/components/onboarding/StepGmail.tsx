"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { CheckCircle, Envelope } from "@phosphor-icons/react";
import { toast } from "sonner";
import { useDictionary } from "@/lib/i18n/provider";

export function StepGmail() {
  const t = useDictionary();
  const router = useRouter();
  const [connected, setConnected] = useState(false);
  const [advancing, setAdvancing] = useState(false);

  // Poll integrations until Gmail is connected
  useEffect(() => {
    if (connected) return;
    let cancelled = false;

    async function poll() {
      while (!cancelled) {
        await new Promise((r) => setTimeout(r, 2000));
        if (cancelled) break;
        const res = await fetch("/api/settings/integrations/status").catch(() => null);
        if (!res?.ok) continue;
        const data = await res.json().catch(() => null);
        if (data?.gmail === "connected") {
          setConnected(true);
          break;
        }
      }
    }

    poll();
    return () => { cancelled = true; };
  }, [connected]);

  async function advance() {
    setAdvancing(true);
    try {
      const r = await fetch("/api/onboarding/complete-step", {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ step: "gmail" }),
      });
      if (!r.ok) {
        const body = await r.json().catch(() => ({}));
        toast.error(body.error ?? t.onboarding.gmail.advanceFailed);
        return;
      }
      // Drop the client Router Cache so the prefetched next step
      // (cached as a redirect while Gmail was incomplete) isn't replayed.
      router.refresh();
      router.push("/onboarding/booking" as never);
    } finally {
      setAdvancing(false);
    }
  }

  return (
    <div className="space-y-6">
      <p className="text-sm text-muted-foreground leading-relaxed">
        {t.onboarding.gmail.intro}
      </p>

      {connected ? (
        <div className="flex items-center gap-3 rounded-xl bg-[oklch(60%_0.14_145)]/10 border border-[oklch(60%_0.14_145)]/20 px-4 py-3">
          <CheckCircle weight="fill" className="w-5 h-5 text-[oklch(60%_0.14_145)] shrink-0" />
          <span className="text-sm font-medium">{t.onboarding.gmail.connected}</span>
        </div>
      ) : (
        <a
          href="/api/auth/gmail/authorize"
          className="flex items-center justify-center gap-2 w-full rounded-xl border border-border bg-secondary/60 hover:bg-secondary px-4 py-3 text-sm font-medium transition-colors"
        >
          <Envelope weight="bold" className="w-4 h-4" />
          {t.onboarding.gmail.connect}
        </a>
      )}

      <div className="flex justify-end pt-2">
        <Button onClick={advance} disabled={!connected || advancing} size="sm">
          {advancing ? t.onboarding.gmail.saving : t.onboarding.gmail.continue}
        </Button>
      </div>
    </div>
  );
}
