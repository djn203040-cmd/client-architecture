"use client";

import { useMemo, useState } from "react";
import { useAutosave } from "@/lib/settings/autosave";
import {
  SalesToolkitSchema,
  EMPTY_SALES_TOOLKIT,
  SALES_STYLES,
  SALES_STYLE_SCENARIO,
  type TSalesToolkit,
  type TSalesStyle,
  type TToolkitOption,
  type TSalesPackage,
} from "@client/shared/validators";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Plus, Trash, Check, Info } from "@phosphor-icons/react";

interface Props {
  initial: TSalesToolkit;
  // Whether to surface the "fine-tune your sales approach" override editor. Off
  // during onboarding (not something a coach should do at setup), on in Settings
  // (the "down the line" place to tweak it). Defaults to off.
  showApproachOverride?: boolean;
}

const EMPTY_PACKAGE: TSalesPackage = {
  name: "",
  price: "",
  format: "",
  includes: "",
  ideal_for: "",
};

async function patchToolkit(toolkit: TSalesToolkit) {
  const res = await fetch("/api/settings/sales-toolkit", {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(toolkit),
  });
  if (!res.ok) throw new Error("Failed to save");
}

// The three-way style picker. Selecting a card sets the coach's whole selling
// posture. Clicking the selected card again clears it (back to the balanced base).
function StylePicker({
  value,
  onChange,
}: {
  value: TSalesStyle | null;
  onChange: (next: TSalesStyle | null) => void;
}) {
  return (
    <div className="space-y-3">
      <div className="space-y-1">
        <Label>How do you sell?</Label>
        <p className="text-xs text-muted-foreground max-w-[65ch]">
          Pick the approach that sounds most like you. It shapes how the AI handles a lead
          who hesitates. You can change it any time.
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        {SALES_STYLES.map((style) => {
          const selected = value === style.id;
          return (
            <div
              key={style.id}
              className={[
                "relative rounded-xl border transition-colors",
                selected
                  ? "border-primary/60 bg-primary/10"
                  : "border-white/10 bg-white/5 hover:bg-white/10",
              ].join(" ")}
            >
              {/* Main selectable area. Kept as a sibling of the info button (not a
                  parent) so we never nest a button inside a button. Right padding
                  leaves room for the info trigger in the corner. */}
              <button
                type="button"
                aria-pressed={selected}
                onClick={() => onChange(selected ? null : style.id)}
                className="block w-full text-left rounded-xl p-4 pr-9 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <div className="flex items-center gap-1.5">
                  {selected && (
                    <span className="grid size-4 shrink-0 place-items-center rounded-full bg-primary text-primary-foreground">
                      <Check className="size-2.5" weight="bold" />
                    </span>
                  )}
                  <p className="font-semibold">{style.label}</p>
                </div>
                <p className="text-xs text-muted-foreground mt-0.5">{style.tagline}</p>
                <p className="text-xs text-muted-foreground mt-2 leading-relaxed">
                  {style.description}
                </p>
                <p className="text-[11px] text-muted-foreground/80 mt-2 leading-relaxed">
                  <span className="font-medium">Best for:</span> {style.bestFor}
                </p>
              </button>

              {/* Info affordance: shows a concrete example of how this style sounds,
                  answering the same objection as the other two for easy comparison. */}
              <Popover>
                <PopoverTrigger asChild>
                  <button
                    type="button"
                    aria-label={`See an example of ${style.label}`}
                    onClick={(e) => e.stopPropagation()}
                    className="absolute right-2 top-2 grid size-6 place-items-center rounded-full text-muted-foreground hover:text-foreground hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    <Info className="size-4" />
                  </button>
                </PopoverTrigger>
                <PopoverContent align="end" className="w-80 space-y-2">
                  <p className="text-sm font-medium">{style.label} in action</p>
                  <p className="text-xs text-muted-foreground italic">
                    {SALES_STYLE_SCENARIO}
                  </p>
                  <div className="rounded-lg bg-white/5 border border-white/10 p-2.5">
                    <p className="text-sm leading-relaxed">{style.example}</p>
                  </div>
                </PopoverContent>
              </Popover>
            </div>
          );
        })}
      </div>
    </div>
  );
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

// Rich editor for the coach's real programs / pricing ladder.
function PackageListEditor({
  packages,
  onChange,
}: {
  packages: TSalesPackage[];
  onChange: (next: TSalesPackage[]) => void;
}) {
  function update(index: number, patch: Partial<TSalesPackage>) {
    onChange(packages.map((p, i) => (i === index ? { ...p, ...patch } : p)));
  }
  function remove(index: number) {
    onChange(packages.filter((_, i) => i !== index));
  }
  function add() {
    onChange([...packages, { ...EMPTY_PACKAGE }]);
  }

  return (
    <div className="space-y-3">
      <div className="space-y-1">
        <Label>Your programs &amp; pricing</Label>
        <p className="text-xs text-muted-foreground max-w-[65ch]">
          Add the packages you actually sell. The more the AI understands your offer ladder,
          the better it can position the right next step, or a lighter one, when a lead
          hesitates. Only a name is required.
        </p>
      </div>

      {packages.length === 0 ? (
        <p className="text-sm text-muted-foreground italic">No packages added yet.</p>
      ) : (
        <div className="space-y-3">
          {packages.map((pkg, i) => (
            <div
              key={i}
              className="rounded-xl border border-white/10 bg-white/5 p-3 space-y-2"
            >
              <div className="flex items-start gap-2">
                <div className="flex-1 space-y-2">
                  <div className="grid gap-2 sm:grid-cols-2">
                    <Input
                      id={`st-pkg-name-${i}`}
                      placeholder="Program name, e.g. 12-Week 1:1 Container"
                      value={pkg.name}
                      maxLength={120}
                      onChange={(e) => update(i, { name: e.target.value })}
                    />
                    <Input
                      id={`st-pkg-price-${i}`}
                      placeholder="Price, e.g. $4,000 or 3× $1,500/mo"
                      value={pkg.price}
                      maxLength={120}
                      onChange={(e) => update(i, { price: e.target.value })}
                    />
                  </div>
                  <Input
                    id={`st-pkg-format-${i}`}
                    placeholder="Format & duration, e.g. 12 weeks, weekly 60-min calls + Voxer"
                    value={pkg.format}
                    maxLength={200}
                    onChange={(e) => update(i, { format: e.target.value })}
                  />
                  <Textarea
                    id={`st-pkg-includes-${i}`}
                    placeholder="What's included, e.g. workbook, 2 live intensives, private community"
                    value={pkg.includes}
                    maxLength={600}
                    rows={2}
                    onChange={(e) => update(i, { includes: e.target.value })}
                  />
                  <Input
                    id={`st-pkg-ideal-${i}`}
                    placeholder="Ideal for, e.g. founders stuck under $10k/mo"
                    value={pkg.ideal_for}
                    maxLength={300}
                    onChange={(e) => update(i, { ideal_for: e.target.value })}
                  />
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  aria-label="Remove package"
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

      <Button variant="outline" size="sm" onClick={add} disabled={packages.length >= 12}>
        <Plus className="size-4 mr-1.5" />
        Add a package
      </Button>
    </div>
  );
}

export function SalesToolkitForm({ initial, showApproachOverride = false }: Props) {
  const [salesStyle, setSalesStyle] = useState<TSalesStyle | null>(initial.sales_style);
  const [philosophy, setPhilosophy] = useState(initial.philosophy);
  const [approachOverride, setApproachOverride] = useState(initial.approach_override);
  const [packages, setPackages] = useState<TSalesPackage[]>(initial.packages);
  const [leveragePoints, setLeveragePoints] = useState(initial.leverage_points);
  const [bridges, setBridges] = useState<TToolkitOption[]>(initial.bridges);
  const [downsells, setDownsells] = useState<TToolkitOption[]>(initial.downsells);

  // Compose the full toolkit and autosave it whenever any field changes. We
  // drop rows with a blank name before saving so half-typed rows don't persist,
  // and re-run through the schema so what we send is always valid.
  const toolkit = useMemo<TSalesToolkit>(() => {
    const cleanOptions = (opts: TToolkitOption[]) =>
      opts
        .filter((o) => o.name.trim().length > 0)
        .map((o) => ({ name: o.name.trim(), when_to_offer: o.when_to_offer.trim() }));
    const cleanPackages = (pkgs: TSalesPackage[]) =>
      pkgs
        .filter((p) => p.name.trim().length > 0)
        .map((p) => ({
          name: p.name.trim(),
          price: p.price.trim(),
          format: p.format.trim(),
          includes: p.includes.trim(),
          ideal_for: p.ideal_for.trim(),
        }));
    const parsed = SalesToolkitSchema.safeParse({
      sales_style: salesStyle,
      approach_override: approachOverride,
      philosophy,
      packages: cleanPackages(packages),
      leverage_points: leveragePoints,
      bridges: cleanOptions(bridges),
      downsells: cleanOptions(downsells),
    });
    return parsed.success ? parsed.data : EMPTY_SALES_TOOLKIT;
  }, [salesStyle, approachOverride, philosophy, packages, leveragePoints, bridges, downsells]);

  useAutosave(toolkit, patchToolkit);

  return (
    <div className="space-y-6">
      <StylePicker value={salesStyle} onChange={setSalesStyle} />

      <div className="space-y-1.5">
        <Label htmlFor="st-philosophy">Your sales philosophy</Label>
        <p className="text-xs text-muted-foreground max-w-[65ch]">
          One to three sentences on how you sell, in your own words. The AI uses this to fine
          tune its posture on top of the approach you picked above.
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

      <PackageListEditor packages={packages} onChange={setPackages} />

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

      {showApproachOverride && (
        <div className="space-y-1.5 rounded-xl border border-white/10 bg-white/5 p-4">
          <Label htmlFor="st-approach-override">Fine-tune your sales approach</Label>
          <p className="text-xs text-muted-foreground max-w-[65ch]">
            Optional, and most coaches never need it. If the approach you picked doesn&apos;t
            quite match how you sell, describe the difference here in your own words. This
            overrides the default guidance where they conflict.
          </p>
          <Textarea
            id="st-approach-override"
            placeholder="e.g. I never mention price until they ask. I always open with a question about where they are right now, not where they want to be."
            value={approachOverride}
            maxLength={1500}
            rows={3}
            onChange={(e) => setApproachOverride(e.target.value)}
          />
          <p className="text-xs text-muted-foreground text-right">
            {approachOverride.length}/1500
          </p>
        </div>
      )}
    </div>
  );
}
