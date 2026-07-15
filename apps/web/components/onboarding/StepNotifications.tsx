"use client";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import { Envelope, ChatCircle, SquaresFour, LockSimple } from "@phosphor-icons/react";
import { toast } from "sonner";
import { useDictionary } from "@/lib/i18n/provider";
import { completeStep, advanceErrorMessage } from "./completeStep";

interface Pref {
  event_type: string;
  channel: string;
  enabled: boolean;
}

interface Integration {
  provider: string;
  status: string;
}

interface Props {
  initialPrefs: Pref[];
  integrations: Integration[];
  coachEmail: string;
}

const EVENT_TYPES = [
  "draft_ready",
  "lead_replied",
  "call_outcome_pending",
  "integration_broken",
  "hard_bounce",
] as const;

/**
 * Onboarding keeps this to one decision: "where do we ping you?". A channel
 * toggle here enables/disables that channel for every event; the full
 * per-event matrix stays in Settings for fine-tuning later.
 */
export function StepNotifications({ initialPrefs, integrations, coachEmail }: Props) {
  const t = useDictionary();
  const copy = t.onboarding.notifications;
  const router = useRouter();
  const [advancing, setAdvancing] = useState(false);

  const slackConnected = integrations.some(
    (i) => i.provider === "slack" && i.status === "connected",
  );

  const [emailOn, setEmailOn] = useState(
    // Pre-selected: a coach with no email prefs yet gets email on by default
    // (persisted by the effect below), so "just click Finish" works.
    initialPrefs.some((p) => p.channel === "email")
      ? initialPrefs.some((p) => p.channel === "email" && p.enabled)
      : true,
  );
  const [slackOn, setSlackOn] = useState(
    initialPrefs.some((p) => p.channel === "slack" && p.enabled),
  );
  const [dashboardOnly, setDashboardOnly] = useState(false);

  async function persistChannel(channel: "email" | "slack", enabled: boolean): Promise<boolean> {
    const results = await Promise.all(
      EVENT_TYPES.map((event_type) =>
        fetch("/api/settings/notifications", {
          method: "PATCH",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ event_type, channel, enabled }),
        })
          .then((r) => r.ok)
          .catch(() => false),
      ),
    );
    return results.every(Boolean);
  }

  // Persist the email pre-selection for coaches who arrive with no email prefs.
  const seeded = useRef(false);
  useEffect(() => {
    if (seeded.current) return;
    seeded.current = true;
    if (!initialPrefs.some((p) => p.channel === "email")) {
      void persistChannel("email", true);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- reason: one-shot seeding of the default pref on mount
  }, []);

  async function toggleChannel(channel: "email" | "slack", enabled: boolean) {
    const revert = channel === "email" ? setEmailOn : setSlackOn;
    revert(enabled);
    const ok = await persistChannel(channel, enabled);
    if (!ok) {
      revert(!enabled);
      toast.error(copy.saveFailed);
    }
  }

  async function toggleDashboardOnly(checked: boolean) {
    setDashboardOnly(checked);
    const r = await fetch("/api/settings/notifications", {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ acknowledge_dashboard_only: checked }),
    }).catch(() => null);
    if (!r?.ok) {
      setDashboardOnly(!checked);
      toast.error(copy.saveFailed);
    }
  }

  async function advance() {
    setAdvancing(true);
    try {
      const res = await completeStep("notifications");
      if (!res.ok) {
        toast.error(advanceErrorMessage(res, t.onboarding.errors, copy.advanceFailed));
        return;
      }
      toast.success(copy.savedToast);
      router.push("/dashboard");
    } finally {
      setAdvancing(false);
    }
  }

  const noChannelOn = !emailOn && !(slackConnected && slackOn);

  return (
    <div className="space-y-5">
      <p className="text-sm text-muted-foreground leading-relaxed">{copy.intro}</p>

      <div className="space-y-3">
        {/* Email */}
        <div className="flex items-center justify-between gap-4 rounded-xl border border-border bg-card/60 px-4 py-3.5">
          <div className="flex items-start gap-3">
            <Envelope weight="regular" className="size-5 text-muted-foreground shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-medium">{copy.emailTitle}</p>
              <p className="text-xs text-muted-foreground leading-relaxed">
                {copy.emailBody(coachEmail)}
              </p>
            </div>
          </div>
          <Switch
            checked={emailOn}
            onCheckedChange={(v) => void toggleChannel("email", v)}
            aria-label={copy.emailTitle}
          />
        </div>

        {/* Slack */}
        <div className="flex items-center justify-between gap-4 rounded-xl border border-border bg-card/60 px-4 py-3.5">
          <div className="flex items-start gap-3">
            <ChatCircle weight="regular" className="size-5 text-muted-foreground shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-medium">{copy.slackTitle}</p>
              <p className="text-xs text-muted-foreground leading-relaxed">{copy.slackBody}</p>
            </div>
          </div>
          {slackConnected ? (
            <Switch
              checked={slackOn}
              onCheckedChange={(v) => void toggleChannel("slack", v)}
              aria-label={copy.slackTitle}
            />
          ) : (
            <a
              href="/api/auth/slack/install"
              className="text-xs font-medium text-accent hover:underline underline-offset-2 whitespace-nowrap"
            >
              {copy.slackConnect}
            </a>
          )}
        </div>

        {/* Dashboard — always on */}
        <div className="flex items-center justify-between gap-4 rounded-xl border border-border bg-muted/30 px-4 py-3.5">
          <div className="flex items-start gap-3">
            <SquaresFour weight="regular" className="size-5 text-muted-foreground shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-medium">{copy.dashboardTitle}</p>
              <p className="text-xs text-muted-foreground leading-relaxed">{copy.dashboardBody}</p>
            </div>
          </div>
          <span className="inline-flex items-center gap-1 text-xs text-muted-foreground whitespace-nowrap">
            <LockSimple weight="regular" className="size-3.5" />
            {copy.alwaysOn}
          </span>
        </div>
      </div>

      {noChannelOn && (
        <label className="flex items-center gap-2.5 rounded-xl border border-amber-500/25 bg-amber-500/5 px-4 py-3 cursor-pointer">
          <Checkbox
            checked={dashboardOnly}
            onCheckedChange={(v) => void toggleDashboardOnly(v === true)}
          />
          <span className="text-sm">{copy.dashboardOnly}</span>
        </label>
      )}

      <div className="flex justify-end pt-2">
        <Button onClick={advance} disabled={advancing} size="sm">
          {advancing ? copy.saving : copy.finish}
        </Button>
      </div>
    </div>
  );
}
