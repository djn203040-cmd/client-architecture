"use client";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { FloppyDisk } from "@phosphor-icons/react";
import { toast } from "sonner";
import { VoiceCorpusImporter } from "./VoiceCorpusImporter";
import { VoiceProfileCard } from "./VoiceProfileCard";
import { VoiceRefineCard } from "./VoiceRefineCard";
import { ExamplesList } from "./ExamplesList";
import { useVoiceRules } from "./useVoiceRules";
import { useDictionary } from "@/lib/i18n/provider";
import type { TVoiceProfile } from "@client/shared/validators";

type State = "idle" | "analyzing" | "complete";

export function VoiceBuilderClient({
  initialVoiceModel,
  onSaved,
  variant = "settings",
}: {
  initialVoiceModel: TVoiceProfile | null;
  onSaved?: (profile: TVoiceProfile) => void;
  // "onboarding" auto-saves the profile the moment analysis completes, so a
  // coach who never spots the Save button still clears the 8-example gate.
  variant?: "settings" | "onboarding";
}) {
  const t = useDictionary();
  const [state, setState] = useState<State>(initialVoiceModel ? "complete" : "idle");
  const [profile, setProfile] = useState<TVoiceProfile | null>(initialVoiceModel);
  const [saving, setSaving] = useState(false);

  async function onAnalyzed(result: TVoiceProfile) {
    setProfile(result);
    setState("complete");
    if (variant === "onboarding") {
      const r = await fetch("/api/voice/save", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(result),
      });
      // Silent on failure: the Save button below remains the manual fallback.
      if (r.ok) onSaved?.(result);
    }
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
        toast.success(t.settingsAdvanced.voice.builder.profileSaved);
        if (profile) onSaved?.(profile);
      } else {
        toast.error(t.settingsAdvanced.voice.builder.saveFailed);
      }
    } finally {
      setSaving(false);
    }
  }

  const { addRule, deleteRule } = useVoiceRules(profile, (next) => {
    setProfile(next);
    onSaved?.(next);
  });

  return (
    <div className="space-y-6">
      <div role="status" aria-live="polite" className="sr-only">
        {state === "analyzing" ? t.settingsAdvanced.voice.builder.analyzing : state === "complete" ? t.settingsAdvanced.voice.builder.analysisComplete : ""}
      </div>
      <VoiceCorpusImporter
        onAnalyzed={onAnalyzed}
        onAnalyzing={() => setState("analyzing")}
        isAnalyzing={state === "analyzing"}
        variant={variant}
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
              {saving ? t.settingsAdvanced.voice.builder.saving : t.settingsAdvanced.voice.builder.saveProfile}
            </Button>
          </div>
          {/* Fine-tuning lives in Settings only. During onboarding the coach
              meets it on the next step, right after seeing their first draft. */}
          {variant === "settings" && (
            <VoiceRefineCard
              rules={profile.usage_rules ?? []}
              onAddRule={addRule}
              onDeleteRule={deleteRule}
            />
          )}
        </>
      )}
    </div>
  );
}
