"use client";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { FloppyDisk } from "@phosphor-icons/react";
import { toast } from "sonner";
import { VoiceCorpusImporter } from "./VoiceCorpusImporter";
import { VoiceProfileCard } from "./VoiceProfileCard";
import { VoiceRefineCard } from "./VoiceRefineCard";
import { ExamplesList } from "./ExamplesList";
import { useDictionary } from "@/lib/i18n/provider";
import type { TVoiceProfile } from "@client/shared/validators";

type State = "idle" | "analyzing" | "complete";

export function VoiceBuilderClient({
  initialVoiceModel,
  onSaved,
}: {
  initialVoiceModel: TVoiceProfile | null;
  onSaved?: (profile: TVoiceProfile) => void;
}) {
  const t = useDictionary();
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
        toast.success(t.settingsAdvanced.voice.builder.profileSaved);
        if (profile) onSaved?.(profile);
      } else {
        toast.error(t.settingsAdvanced.voice.builder.saveFailed);
      }
    } finally {
      setSaving(false);
    }
  }

  // Persists a full profile immediately (used by the fine-tuning loop's add /
  // delete rule actions, which save on the spot rather than waiting for the
  // Save button). Updates local state only on success.
  async function persist(next: TVoiceProfile): Promise<boolean> {
    const r = await fetch("/api/voice/save", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(next),
    });
    if (!r.ok) {
      toast.error(t.settingsAdvanced.voice.builder.persistFailed);
      return false;
    }
    setProfile(next);
    onSaved?.(next);
    return true;
  }

  async function addRule(rule: string): Promise<boolean> {
    if (!profile) return false;
    const existing = profile.usage_rules ?? [];
    if (existing.some((r) => r.rule.toLowerCase() === rule.toLowerCase())) {
      toast.info(t.settingsAdvanced.voice.builder.ruleExists);
      return true;
    }
    const next: TVoiceProfile = {
      ...profile,
      usage_rules: [
        ...existing,
        { rule, source: "feedback" as const, added_at: new Date().toISOString() },
      ],
    };
    const ok = await persist(next);
    if (ok) toast.success(t.settingsAdvanced.voice.builder.ruleAdded);
    return ok;
  }

  async function deleteRule(index: number): Promise<boolean> {
    if (!profile) return false;
    const existing = profile.usage_rules ?? [];
    const next: TVoiceProfile = {
      ...profile,
      usage_rules: existing.filter((_, i) => i !== index),
    };
    return persist(next);
  }

  return (
    <div className="space-y-6">
      <div role="status" aria-live="polite" className="sr-only">
        {state === "analyzing" ? t.settingsAdvanced.voice.builder.analyzing : state === "complete" ? t.settingsAdvanced.voice.builder.analysisComplete : ""}
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
              {saving ? t.settingsAdvanced.voice.builder.saving : t.settingsAdvanced.voice.builder.saveProfile}
            </Button>
          </div>
          <VoiceRefineCard
            rules={profile.usage_rules ?? []}
            onAddRule={addRule}
            onDeleteRule={deleteRule}
          />
        </>
      )}
    </div>
  );
}
