"use client";

import { useMemo, useState } from "react";
import { useAutosave } from "@/lib/settings/autosave";
import {
  SalesToolkitSchema,
  EMPTY_SALES_TOOLKIT,
  type TSalesToolkit,
  type TToolkitOption,
} from "@client/shared/validators";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Plus, Trash } from "@phosphor-icons/react";

interface Props {
  initial: TSalesToolkit;
}

async function patchToolkit(toolkit: TSalesToolkit) {
  const res = await fetch("/api/settings/sales-toolkit", {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(toolkit),
  });
  if (!res.ok) throw new Error("Failed to save");
}

// Editor for a list of {name, when_to_offer} options (bridges or downsells).
function OptionListEditor({
  idPrefix,
  label,
  helper,
  namePlaceholder,
  whenPlaceholder,
  addLabel,
  options,
  onChange,
}: {
  idPrefix: string;
  label: string;
  helper: string;
  namePlaceholder: string;
  whenPlaceholder: string;
  addLabel: string;
  options: TToolkitOption[];
  onChange: (next: TToolkitOption[]) => void;
}) {
  function update(index: number, patch: Partial<TToolkitOption>) {
    onChange(options.map((o, i) => (i === index ? { ...o, ...patch } : o)));
  }
  function remove(index: number) {
    onChange(options.filter((_, i) => i !== index));
  }
  function add() {
    onChange([...options, { name: "", when_to_offer: "" }]);
  }

  return (
    <div className="space-y-3">
      <div className="space-y-1">
        <Label>{label}</Label>
        <p className="text-xs text-muted-foreground max-w-[65ch]">{helper}</p>
      </div>

      {options.length === 0 ? (
        <p className="text-sm text-muted-foreground italic">Nothing added yet.</p>
      ) : (
        <div className="space-y-3">
          {options.map((opt, i) => (
            <div
              key={i}
              className="rounded-xl border border-white/10 bg-white/5 p-3 space-y-2"
            >
              <div className="flex items-start gap-2">
                <div className="flex-1 space-y-2">
                  <Input
                    id={`${idPrefix}-name-${i}`}
                    placeholder={namePlaceholder}
                    value={opt.name}
                    maxLength={120}
                    onChange={(e) => update(i, { name: e.target.value })}
                  />
                  <Input
                    id={`${idPrefix}-when-${i}`}
                    placeholder={whenPlaceholder}
                    value={opt.when_to_offer}
                    maxLength={400}
                    onChange={(e) => update(i, { when_to_offer: e.target.value })}
                  />
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  aria-label="Remove"
                  onClick={() => remove(i)}
                  className="shrink-0 text-muted-foreground hover:text-destructive"
                >
                  <Trash className="size-4" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      <Button variant="outline" size="sm" onClick={add} disabled={options.length >= 12}>
        <Plus className="size-4 mr-1.5" />
        {addLabel}
      </Button>
    </div>
  );
}

export function SalesToolkitForm({ initial }: Props) {
  const [philosophy, setPhilosophy] = useState(initial.philosophy);
  const [leveragePoints, setLeveragePoints] = useState(initial.leverage_points);
  const [bridges, setBridges] = useState<TToolkitOption[]>(initial.bridges);
  const [downsells, setDownsells] = useState<TToolkitOption[]>(initial.downsells);

  // Compose the full toolkit and autosave it whenever any field changes. We
  // drop rows with a blank name before saving so half-typed rows don't persist,
  // and re-run through the schema so what we send is always valid.
  const toolkit = useMemo<TSalesToolkit>(() => {
    const clean = (opts: TToolkitOption[]) =>
      opts
        .filter((o) => o.name.trim().length > 0)
        .map((o) => ({ name: o.name.trim(), when_to_offer: o.when_to_offer.trim() }));
    const parsed = SalesToolkitSchema.safeParse({
      philosophy,
      leverage_points: leveragePoints,
      bridges: clean(bridges),
      downsells: clean(downsells),
    });
    return parsed.success ? parsed.data : EMPTY_SALES_TOOLKIT;
  }, [philosophy, leveragePoints, bridges, downsells]);

  useAutosave(toolkit, patchToolkit);

  return (
    <div className="space-y-6">
      <div className="space-y-1.5">
        <Label htmlFor="st-philosophy">Your sales philosophy</Label>
        <p className="text-xs text-muted-foreground max-w-[65ch]">
          One to three sentences on how you sell. The AI uses this to set its posture when
          a lead hesitates.
        </p>
        <Textarea
          id="st-philosophy"
          placeholder="e.g. Gentle, never pushy, but I believe part of my job is helping people past the resistance that keeps them stuck. I bridge gaps and encourage the next step."
          value={philosophy}
          maxLength={800}
          rows={3}
          onChange={(e) => setPhilosophy(e.target.value)}
        />
        <p className="text-xs text-muted-foreground text-right">{philosophy.length}/800</p>
      </div>

      <OptionListEditor
        idPrefix="st-bridge"
        label="Bridges"
        helper="Ways you close the gap when a lead is interested but stuck on an objection, e.g. a payment plan or a lighter version of the program."
        namePlaceholder="e.g. Payment plan (3-month split)"
        whenPlaceholder="When to offer it, e.g. if price is the stated objection but interest is real"
        addLabel="Add a bridge"
        options={bridges}
        onChange={setBridges}
      />

      <OptionListEditor
        idPrefix="st-downsell"
        label="Downsells"
        helper="Lighter or shorter offers you can fall back to when the full container is too big a commitment right now."
        namePlaceholder="e.g. 4-week intensive"
        whenPlaceholder="When to offer it, e.g. if the full program feels like too long a commitment"
        addLabel="Add a downsell"
        options={downsells}
        onChange={setDownsells}
      />

      <div className="space-y-1.5">
        <Label htmlFor="st-leverage">Leverage points</Label>
        <p className="text-xs text-muted-foreground max-w-[65ch]">
          What you learn on a discovery call, so the AI knows what it might be able to draw
          on when handling an objection (e.g. income lost to the current situation, the ROI
          they expect from working with you).
        </p>
        <Textarea
          id="st-leverage"
          placeholder="e.g. I always ask what their current situation is costing them each month, and what a solved version would be worth."
          value={leveragePoints}
          maxLength={1500}
          rows={3}
          onChange={(e) => setLeveragePoints(e.target.value)}
        />
        <p className="text-xs text-muted-foreground text-right">{leveragePoints.length}/1500</p>
      </div>
    </div>
  );
}
