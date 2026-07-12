"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { DemoLeadDraft } from "./DemoLeadDraft";
import { CheckCircle } from "@phosphor-icons/react";
import { toast } from "sonner";
import { useDictionary } from "@/lib/i18n/provider";

interface SeedResult {
  leadId: string;
  draftId: string;
  draftBody: string;
}

export function StepFirstLead() {
  const t = useDictionary();
  const router = useRouter();
  const [seed, setSeed] = useState<SeedResult | null>(null);
  const [seeding, setSeeding] = useState(true);
  const [celebration, setCelebration] = useState<string | null>(null);
  const [advancing, setAdvancing] = useState(false);

  useEffect(() => {
    let cancelled = false;
    async function seedDemo() {
      try {
        const r = await fetch("/api/onboarding/seed-demo", { method: "POST" });
        if (!r.ok) throw new Error("Seed failed");
        const data = await r.json();
        if (!cancelled) setSeed(data);
      } catch {
        if (!cancelled) toast.error(t.onboarding.firstLead.loadFailed);
      } finally {
        if (!cancelled) setSeeding(false);
      }
    }
    seedDemo();
    return () => { cancelled = true; };
  }, [t.onboarding.firstLead.loadFailed]);

  async function advance() {
    setAdvancing(true);
    try {
      const r = await fetch("/api/onboarding/complete-step", {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ step: "first-lead" }),
      });
      if (!r.ok) {
        const body = await r.json().catch(() => ({}));
        toast.error(body.error ?? t.onboarding.firstLead.advanceFailed);
        return;
      }
      router.push("/onboarding/notifications" as never);
    } finally {
      setAdvancing(false);
    }
  }

  if (seeding) {
    return (
      <div className="py-8 flex flex-col items-center gap-3">
        <div className="w-6 h-6 border-2 border-border border-t-foreground rounded-full animate-spin" />
        <p className="text-sm text-muted-foreground">{t.onboarding.firstLead.generating}</p>
      </div>
    );
  }

  if (celebration) {
    return (
      <div className="space-y-5">
        <div className="flex items-start gap-3 rounded-xl bg-[oklch(60%_0.14_145)]/10 border border-[oklch(60%_0.14_145)]/20 px-4 py-3">
          <CheckCircle weight="fill" className="w-5 h-5 text-[oklch(60%_0.14_145)] shrink-0 mt-0.5" />
          <p className="text-sm leading-relaxed">{celebration}</p>
        </div>
        <div className="flex justify-end">
          <Button onClick={advance} disabled={advancing} size="sm">
            {advancing ? t.onboarding.firstLead.saving : t.onboarding.firstLead.continue}
          </Button>
        </div>
      </div>
    );
  }

  if (!seed) {
    return (
      <p className="text-sm text-muted-foreground py-4">
        {t.onboarding.firstLead.loadFailedBody}
      </p>
    );
  }

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground leading-relaxed">
        {t.onboarding.firstLead.intro}
      </p>
      <DemoLeadDraft
        draftId={seed.draftId}
        draftBody={seed.draftBody}
        leadName="Alex Rivera"
        onApproved={setCelebration}
      />
    </div>
  );
}
