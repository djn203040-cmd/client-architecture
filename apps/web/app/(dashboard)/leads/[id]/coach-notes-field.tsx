"use client";
import { useState, useRef } from "react";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { FloppyDisk } from "@phosphor-icons/react";
import { toast } from "sonner";

export function CoachNotesField({
  leadId,
  initialNotes,
}: {
  leadId: string;
  initialNotes: string;
}) {
  const [value, setValue] = useState(initialNotes);
  const [savedAt, setSavedAt] = useState<Date | null>(null);
  const tRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  function save(v: string) {
    fetch(`/api/leads/${leadId}`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ coach_notes: v }),
    }).then((r) => {
      if (r.ok) setSavedAt(new Date());
      else
        toast.error(
          "Notes couldn't be saved. Your changes are still here, try again."
        );
    });
  }

  function onChange(v: string) {
    setValue(v);
    if (tRef.current) clearTimeout(tRef.current);
    tRef.current = setTimeout(() => save(v), 800);
  }

  return (
    <section className="rounded-2xl backdrop-blur-md bg-white/10 dark:bg-white/5 border border-white/10 p-6 shadow-[inset_0_1px_0_rgba(255,255,255,0.08)]">
      <Label htmlFor="coach-notes" className="block mb-2">
        Private notes, injected into every AI draft for this lead.
      </Label>
      <Textarea
        id="coach-notes"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onBlur={(e) => save(e.target.value)}
        rows={6}
        maxLength={5000}
      />
      <div className="flex items-center justify-end mt-2 text-xs text-muted-foreground gap-1 min-h-[1rem]">
        {savedAt && (
          <>
            <FloppyDisk weight="regular" className="size-3" />
            Saved {savedAt.toLocaleTimeString()}
          </>
        )}
      </div>
    </section>
  );
}
