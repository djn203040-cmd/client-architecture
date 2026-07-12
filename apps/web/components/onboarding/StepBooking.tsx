"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { CheckCircle, Link as LinkIcon } from "@phosphor-icons/react";
import { toast } from "sonner";
import { useDictionary } from "@/lib/i18n/provider";

interface Props {
  initialUrl: string | null;
}

const PROVIDER_HINTS: { name: string; pattern: string; where: string }[] = [
  { name: "Calendly", pattern: "https://calendly.com/your-name/intro", where: "Event Type → Copy Link" },
  { name: "Cal.com", pattern: "https://cal.com/your-name", where: "Event Type → Share" },
  { name: "Acuity", pattern: "https://yourname.as.me", where: "Settings → Scheduling Page Link" },
  { name: "TidyCal", pattern: "https://tidycal.com/your-name", where: "Booking Page → Share" },
];

export function StepBooking({ initialUrl }: Props) {
  const t = useDictionary();
  const router = useRouter();
  const [url, setUrl] = useState(initialUrl ?? "");
  const [submitting, setSubmitting] = useState(false);
  const [showHints, setShowHints] = useState(false);

  const trimmed = url.trim();
  const isEmpty = trimmed.length === 0;
  const looksValid = trimmed.startsWith("http://") || trimmed.startsWith("https://");
  const hasInvalidUrl = !isEmpty && !looksValid;

  async function saveAndAdvance(opts: { skip: boolean }) {
    if (hasInvalidUrl) {
      toast.error(t.onboarding.booking.invalidUrl);
      return;
    }
    setSubmitting(true);
    try {
      if (!opts.skip && !isEmpty) {
        const save = await fetch("/api/settings/profile", {
          method: "PATCH",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ public_booking_url: trimmed }),
        });
        if (!save.ok) {
          toast.error(t.onboarding.booking.saveFailed);
          return;
        }
      }
      const advance = await fetch("/api/onboarding/complete-step", {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ step: "booking" }),
      });
      if (!advance.ok) {
        const body = await advance.json().catch(() => ({}));
        toast.error(body.error ?? t.onboarding.booking.advanceFailed);
        return;
      }
      router.refresh();
      router.push("/onboarding/calendar" as never);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="space-y-6">
      <p className="text-sm text-muted-foreground leading-relaxed">
        {t.onboarding.booking.intro}
      </p>

      <div className="space-y-2">
        <Label htmlFor="ob-booking-url">{t.onboarding.booking.label}</Label>
        <div className="relative">
          <LinkIcon weight="regular" className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
          <Input
            id="ob-booking-url"
            type="url"
            placeholder={t.onboarding.booking.placeholder}
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            disabled={submitting}
            className="pl-9"
            aria-invalid={hasInvalidUrl}
          />
        </div>
        {hasInvalidUrl && (
          <p className="text-xs text-destructive">{t.onboarding.booking.invalidUrl}</p>
        )}
        {!isEmpty && looksValid && (
          <div className="flex items-center gap-1.5 text-xs text-[oklch(60%_0.14_145)]">
            <CheckCircle weight="fill" className="size-3.5" />
            {t.onboarding.booking.looksGood}
          </div>
        )}
      </div>

      <div>
        <button
          type="button"
          onClick={() => setShowHints((s) => !s)}
          className="text-xs text-muted-foreground hover:text-foreground underline underline-offset-2"
        >
          {showHints ? t.onboarding.booking.hideHints : t.onboarding.booking.showHints}
        </button>
        {showHints && (
          <ul className="mt-3 space-y-2 text-xs">
            {PROVIDER_HINTS.map((p) => (
              <li key={p.name} className="rounded-lg border border-border bg-muted/30 px-3 py-2">
                <div className="font-medium text-foreground">{p.name}</div>
                <div className="text-muted-foreground">{p.where}</div>
                <div className="font-mono text-[11px] text-muted-foreground mt-0.5">{p.pattern}</div>
              </li>
            ))}
            <li className="text-muted-foreground italic">
              {t.onboarding.booking.anyProvider}
            </li>
          </ul>
        )}
      </div>

      <div className="flex items-center justify-between pt-2">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => saveAndAdvance({ skip: true })}
          disabled={submitting}
        >
          {t.onboarding.booking.later}
        </Button>
        <Button
          size="sm"
          onClick={() => saveAndAdvance({ skip: false })}
          disabled={submitting || hasInvalidUrl || isEmpty}
        >
          {submitting ? t.onboarding.booking.saving : t.onboarding.booking.continue}
        </Button>
      </div>
    </div>
  );
}
