"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { VoiceBuilderClient } from "@/app/(dashboard)/settings/voice/VoiceBuilderClient";
import { toast } from "sonner";
import type { TVoiceProfile } from "@client/shared/validators";

interface Props {
  initialVoiceModel: TVoiceProfile | null;
  initialExampleCount: number;
}

export function StepVoice({ initialVoiceModel, initialExampleCount }: Props) {
  const router = useRouter();
  const [exampleCount, setExampleCount] = useState(initialExampleCount);
  const [advancing, setAdvancing] = useState(false);

  function onProfileSaved(profile: TVoiceProfile) {
    setExampleCount(profile.selected_examples?.length ?? 0);
  }

  async function advance() {
    setAdvancing(true);
    try {
      const r = await fetch("/api/onboarding/complete-step", {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ step: "voice" }),
      });
      if (!r.ok) {
        const body = await r.json().catch(() => ({}));
        toast.error(body.error ?? "Voice model not complete yet. Try again.");
        return;
      }
      router.push("/onboarding/first-lead" as never);
    } finally {
      setAdvancing(false);
    }
  }

  const meetsMinimum = exampleCount >= 8;

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          Paste messages you&apos;ve written. The more you give it, the more accurately it captures
          how you write.
        </p>
        <span
          className={[
            "text-xs font-mono px-2 py-1 rounded-md shrink-0 ml-4",
            meetsMinimum
              ? "bg-[oklch(60%_0.14_145)]/10 text-[oklch(60%_0.14_145)]"
              : "bg-secondary text-muted-foreground",
          ].join(" ")}
        >
          {exampleCount} / 8 min
        </span>
      </div>

      <VoiceBuilderClient initialVoiceModel={initialVoiceModel} onSaved={onProfileSaved} />

      <div className="flex justify-end pt-2">
        <Button onClick={advance} disabled={!meetsMinimum || advancing} size="sm">
          {advancing ? "Checking…" : "Continue"}
        </Button>
      </div>
    </div>
  );
}
