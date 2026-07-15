"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { VoiceBuilderClient } from "@/app/(dashboard)/settings/voice/VoiceBuilderClient";
import { toast } from "sonner";
import type { TVoiceProfile } from "@client/shared/validators";
import { useDictionary } from "@/lib/i18n/provider";
import { completeStep, nextRoute, advanceErrorMessage } from "./completeStep";

interface Props {
  initialVoiceModel: TVoiceProfile | null;
  initialExampleCount: number;
}

export function StepVoice({ initialVoiceModel, initialExampleCount }: Props) {
  const t = useDictionary();
  const router = useRouter();
  const [exampleCount, setExampleCount] = useState(initialExampleCount);
  const [advancing, setAdvancing] = useState(false);

  function onProfileSaved(profile: TVoiceProfile) {
    setExampleCount(profile.selected_examples?.length ?? 0);
  }

  async function advance() {
    setAdvancing(true);
    try {
      const res = await completeStep("voice");
      if (!res.ok) {
        toast.error(advanceErrorMessage(res, t.onboarding.errors, t.onboarding.voice.notComplete));
        return;
      }
      router.refresh();
      router.push(nextRoute("voice", res.completed) as never);
    } finally {
      setAdvancing(false);
    }
  }

  const meetsMinimum = exampleCount >= 8;

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          {t.onboarding.voice.intro}
        </p>
        <span
          className={[
            "text-xs font-mono px-2 py-1 rounded-md shrink-0 ml-4 font-medium",
            meetsMinimum
              ? "bg-[oklch(38%_0.10_150)] text-[#E5DCC5]"
              : "bg-primary text-primary-foreground",
          ].join(" ")}
        >
          {t.onboarding.voice.counter(exampleCount)}
        </span>
      </div>

      <VoiceBuilderClient
        initialVoiceModel={initialVoiceModel}
        onSaved={onProfileSaved}
        variant="onboarding"
      />

      <div className="flex justify-end pt-2">
        <Button onClick={advance} disabled={!meetsMinimum || advancing} size="sm">
          {advancing ? t.onboarding.voice.checking : t.onboarding.voice.continue}
        </Button>
      </div>
    </div>
  );
}
