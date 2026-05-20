"use client";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { FloppyDisk } from "@phosphor-icons/react";
import { toast } from "sonner";
import { VoiceCorpusImporter } from "./VoiceCorpusImporter";
import { VoiceProfileCard } from "./VoiceProfileCard";
import { ExamplesList } from "./ExamplesList";
import type { TVoiceProfile } from "@client/shared/validators";

type State = "idle" | "analyzing" | "complete";

export function VoiceBuilderClient({
  initialVoiceModel,
  onSaved,
}: {
  initialVoiceModel: TVoiceProfile | null;
  onSaved?: (profile: TVoiceProfile) => void;
}) {
  const [state, setState] = useState<State>(initialVoiceModel ? "complete" : "idle");
  const [profile, setProfile] = useState<TVoiceProfile | null>(initialVoiceModel);
  const [saving, setSaving] = useState(false);

  async function onAnalyzed(result: TVoiceProfile) {
    setProfile(result);
    setState("complete");
  }

  function onReanalyze() {
    setState("idle");
  }

  function onProfileChange(updated: TVoiceProfile) {
    setProfile(updated);
  }

  async function saveProfile() {
    if (!profile) return;
    setSaving(true);
    try {
      const r = await fetch("/api/voice/save", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(profile),
      });
      if (r.ok) {
        toast.success("Voice profile saved.");
        if (profile) onSaved?.(profile);
      } else {
        toast.error("Couldn't save profile. Try again.");
      }
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-6">
      <div role="status" aria-live="polite" className="sr-only">
        {state === "analyzing" ? "Analyzing your writing…" : state === "complete" ? "Analysis complete." : ""}
      </div>
      <VoiceCorpusImporter
        onAnalyzed={onAnalyzed}
        onAnalyzing={() => setState("analyzing")}
        isAnalyzing={state === "analyzing"}
      />

      {state === "complete" && profile && (
        <>
          <VoiceProfileCard
            profile={profile}
            onChange={onProfileChange}
            onReanalyze={onReanalyze}
          />
          <ExamplesList
            examples={profile.selected_examples}
            onChange={(examples) => onProfileChange({ ...profile, selected_examples: examples })}
          />
          <div className="flex justify-end">
            <Button
              variant="secondary"
              className="min-h-[44px] gap-2"
              onClick={saveProfile}
              disabled={saving}
            >
              <FloppyDisk weight="regular" className="size-4" />
              {saving ? "Saving..." : "Save profile"}
            </Button>
          </div>
        </>
      )}
    </div>
  );
}
