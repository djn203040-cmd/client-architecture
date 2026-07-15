"use client";
import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { CheckCircle, Envelope, Info, WarningCircle } from "@phosphor-icons/react";
import { toast } from "sonner";
import { useDictionary } from "@/lib/i18n/provider";
import { completeStep, nextRoute, advanceErrorMessage } from "./completeStep";
import { VideoLink } from "./VideoLink";

export function StepGmail() {
  const t = useDictionary();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [connected, setConnected] = useState(false);
  const [advancing, setAdvancing] = useState(false);

  // Set when the OAuth callback bounced back here with ?error=…; cleared the
  // moment the coach retries (full-page nav) or the poll sees a connection.
  const oauthError = searchParams.get("error");
  const denied = oauthError === "oauth_access_denied";

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
      const res = await completeStep("gmail");
      if (!res.ok) {
        toast.error(advanceErrorMessage(res, t.onboarding.errors, t.onboarding.gmail.advanceFailed));
        return;
      }
      // Drop the client Router Cache so the prefetched next step
      // (cached as a redirect while Gmail was incomplete) isn't replayed.
      router.refresh();
      router.push(nextRoute("gmail", res.completed) as never);
    } finally {
      setAdvancing(false);
    }
  }

  return (
    <div className="space-y-6">
      <p className="text-sm text-muted-foreground leading-relaxed">
        {t.onboarding.gmail.intro}
      </p>

      {oauthError && !connected && (
        <div className="flex items-start gap-3 rounded-xl bg-amber-500/10 border border-amber-500/25 px-4 py-3">
          <WarningCircle weight="fill" className="w-5 h-5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
          <div className="space-y-1">
            <p className="text-sm font-medium">
              {denied ? t.onboarding.gmail.errorDeniedTitle : t.onboarding.gmail.errorGenericTitle}
            </p>
            <p className="text-sm text-muted-foreground leading-relaxed">
              {denied ? t.onboarding.gmail.errorDeniedBody : t.onboarding.gmail.errorGenericBody}
            </p>
          </div>
        </div>
      )}

      {connected ? (
        <div className="flex items-center gap-3 rounded-xl bg-[oklch(60%_0.14_145)]/10 border border-[oklch(60%_0.14_145)]/20 px-4 py-3">
          <CheckCircle weight="fill" className="w-5 h-5 text-[oklch(60%_0.14_145)] shrink-0" />
          <span className="text-sm font-medium">{t.onboarding.gmail.connected}</span>
        </div>
      ) : (
        <div className="space-y-3">
          <div className="flex items-start gap-2.5 rounded-xl border border-border bg-muted/30 px-4 py-3">
            <Info weight="fill" className="w-4 h-4 text-muted-foreground shrink-0 mt-0.5" />
            <p className="text-xs text-muted-foreground leading-relaxed">
              <span className="font-medium text-foreground">{t.onboarding.gmail.preflightTitle}</span>{" "}
              {t.onboarding.gmail.preflightBody}
            </p>
          </div>
          <a
            href="/api/auth/gmail/authorize"
            className="flex items-center justify-center gap-2 w-full rounded-xl border border-border bg-secondary/60 hover:bg-secondary px-4 py-3 text-sm font-medium transition-colors"
          >
            <Envelope weight="bold" className="w-4 h-4" />
            {oauthError ? t.onboarding.gmail.retry : t.onboarding.gmail.connect}
          </a>
          <VideoLink videoKey="gmailConnect" />
        </div>
      )}

      <div className="flex justify-end pt-2">
        <Button onClick={advance} disabled={!connected || advancing} size="sm">
          {advancing ? t.onboarding.gmail.saving : t.onboarding.gmail.continue}
        </Button>
      </div>
    </div>
  );
}
