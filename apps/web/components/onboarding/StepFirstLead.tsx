"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { DemoLeadDraft } from "./DemoLeadDraft";
import { VoiceRefineCard } from "@/app/(dashboard)/settings/voice/VoiceRefineCard";
import { useVoiceRules } from "@/app/(dashboard)/settings/voice/useVoiceRules";
import { CheckCircle } from "@phosphor-icons/react";
import { toast } from "sonner";
import type { TVoiceProfile } from "@client/shared/validators";
import { useDictionary } from "@/lib/i18n/provider";
import { completeStep, nextRoute, advanceErrorMessage } from "./completeStep";

interface SeedResult {
  leadId: string;
  draftId: string;
  draftBody: string;
}

interface Props {
  initialVoiceModel: TVoiceProfile | null;
}

export function StepFirstLead({ initialVoiceModel }: Props) {
  const t = useDictionary();
  const router = useRouter();
  const [seed, setSeed] = useState<SeedResult | null>(null);
  const [seeding, setSeeding] = useState(true);
  const [celebrating, setCelebrating] = useState(false);
  const [advancing, setAdvancing] = useState(false);
  const [profile, setProfile] = useState<TVoiceProfile | null>(initialVoiceModel);
  const [showRefine, setShowRefine] = useState(false);
  const refineRef = useRef<HTMLDivElement | null>(null);

  const { addRule, deleteRule } = useVoiceRules(profile, setProfile);

  const seedDemo = useCallback(async () => {
    setSeeding(true);
    try {
      const r = await fetch("/api/onboarding/seed-demo", { method: "POST" });
      if (!r.ok) throw new Error("Seed failed");
      const data = await r.json();
      setSeed(data);
    } catch {
      toast.error(t.onboarding.firstLead.loadFailed);
    } finally {
      setSeeding(false);
    }
  }, [t.onboarding.firstLead.loadFailed]);

  useEffect(() => {
    void seedDemo();
  }, [seedDemo]);

  function openRefine() {
    setShowRefine(true);
    // Wait a frame so the card exists before we scroll down to it.
    requestAnimationFrame(() => {
      refineRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  }

  async function advance() {
    setAdvancing(true);
    try {
      const res = await completeStep("first-lead");
      if (!res.ok) {
        toast.error(advanceErrorMessage(res, t.onboarding.errors, t.onboarding.firstLead.advanceFailed));
        return;
      }
      router.refresh();
      router.push(nextRoute("first-lead", res.completed) as never);
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

  if (celebrating) {
    return (
      <div className="space-y-5">
        <div className="flex items-start gap-3 rounded-xl bg-[oklch(60%_0.14_145)]/10 border border-[oklch(60%_0.14_145)]/20 px-4 py-3">
          <CheckCircle weight="fill" className="w-5 h-5 text-[oklch(60%_0.14_145)] shrink-0 mt-0.5" />
          <p className="text-sm leading-relaxed">{t.onboarding.firstLead.celebration}</p>
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
      <div className="py-4 flex flex-col items-start gap-4">
        <p className="text-sm text-muted-foreground">
          {t.onboarding.firstLead.loadFailedBody}
        </p>
        <Button size="sm" variant="secondary" onClick={() => void seedDemo()}>
          {t.onboarding.firstLead.retry}
        </Button>
      </div>
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
        onApproved={() => setCelebrating(true)}
      />

      {/* Escape hatch under the approve button: coaches who aren't happy with
          the draft drop down into the fine-tuning loop right here. */}
      {profile && (
        <div className="text-center pt-1">
          <button
            type="button"
            onClick={openRefine}
            className="text-xs text-muted-foreground underline underline-offset-2 hover:text-foreground transition-colors"
          >
            {t.onboarding.firstLead.dislikeLink}
          </button>
        </div>
      )}

      {showRefine && profile && (
        <div ref={refineRef} className="pt-2 scroll-mt-4">
          <VoiceRefineCard
            heading={t.onboarding.firstLead.refineHeading}
            intro={t.onboarding.firstLead.refineIntro}
            initialDraftBody={seed.draftBody}
            rules={profile.usage_rules ?? []}
            onAddRule={addRule}
            onDeleteRule={deleteRule}
          />
        </div>
      )}
    </div>
  );
}
