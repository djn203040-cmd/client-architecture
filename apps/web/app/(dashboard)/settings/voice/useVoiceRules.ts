"use client";
import { toast } from "sonner";
import { useDictionary } from "@/lib/i18n/provider";
import type { TVoiceProfile } from "@client/shared/validators";

/**
 * Add/delete usage rules on a voice profile, persisting the full profile on the
 * spot. Shared between the Settings voice builder and the onboarding first-lead
 * step so the fine-tuning loop behaves identically in both places.
 */
export function useVoiceRules(
  profile: TVoiceProfile | null,
  onPersisted: (next: TVoiceProfile) => void,
) {
  const t = useDictionary();

  // Persists a full profile immediately (rules save on the spot rather than
  // waiting for a Save button). Updates caller state only on success.
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
    onPersisted(next);
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
    return persist({
      ...profile,
      usage_rules: existing.filter((_, i) => i !== index),
    });
  }

  return { addRule, deleteRule };
}
