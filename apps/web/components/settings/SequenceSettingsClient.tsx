"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { useDictionary } from "@/lib/i18n/provider";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

interface Props {
  sequenceConfig: {
    no_show_delays: number[];
    call_completed_delays: number[];
  };
}

export function SequenceSettingsClient({ sequenceConfig }: Props) {
  const t = useDictionary();
  const router = useRouter();
  const [noShowDelays, setNoShowDelays] = useState(
    sequenceConfig.no_show_delays.join(", ")
  );
  const [callCompletedDelays, setCallCompletedDelays] = useState(
    sequenceConfig.call_completed_delays.join(", ")
  );
  const [saving, setSaving] = useState(false);

  async function save() {
    setSaving(true);
    try {
      const r = await fetch("/api/coaches/sequence-config", {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          no_show_delays: noShowDelays.split(",").map((d) => parseInt(d.trim(), 10)).filter(Boolean),
          call_completed_delays: callCompletedDelays.split(",").map((d) => parseInt(d.trim(), 10)).filter(Boolean),
        }),
      });
      if (!r.ok) throw new Error("Save failed");
      toast.success(t.settings.sequence.saved);
      router.refresh();
    } catch {
      toast.error(t.settings.sequence.saveError);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        {t.settings.sequence.description}
      </p>
      <div className="space-y-2">
        <label htmlFor="seq-no-show" className="text-sm font-medium">{t.settings.sequence.noShowLabel}</label>
        <Input
          id="seq-no-show"
          value={noShowDelays}
          onChange={(e) => setNoShowDelays(e.target.value)}
          placeholder="1, 3, 7, 14, 21"
        />
      </div>
      <div className="space-y-2">
        <label htmlFor="seq-call-completed" className="text-sm font-medium">{t.settings.sequence.callCompletedLabel}</label>
        <Input
          id="seq-call-completed"
          value={callCompletedDelays}
          onChange={(e) => setCallCompletedDelays(e.target.value)}
          placeholder="1, 4, 10"
        />
      </div>
      <Button onClick={save} disabled={saving}>
        {saving ? t.settings.sequence.saving : t.settings.sequence.save}
      </Button>
    </div>
  );
}
