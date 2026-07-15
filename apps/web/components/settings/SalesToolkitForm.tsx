"use client";

import { useMemo, useState } from "react";
import { useAutosave } from "@/lib/settings/autosave";
import { useDictionary } from "@/lib/i18n/provider";
import {
  SalesToolkitSchema,
  EMPTY_SALES_TOOLKIT,
  SALES_STYLES,
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
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from "@/components/ui/hover-card";
import { Plus, Trash, Check, Info, CaretDown, CaretRight } from "@phosphor-icons/react";

interface Props {
  initial: TSalesToolkit;
  // Whether to surface the "fine-tune your sales approach" override editor. Off
  // during onboarding (not something a coach should do at setup), on in Settings
  // (the "down the line" place to tweak it). Defaults to off.
  showApproachOverride?: boolean;
  // "onboarding" keeps only the style picker in view and tucks everything else
  // (philosophy, packages, bridges, downsells, leverage) behind a collapsed
  // "add your programs & offers" section, so the step reads as one decision.
  variant?: "settings" | "onboarding";
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
  const t = useDictionary();
  return (
    <div className="space-y-3">
      <div className="space-y-1">
        <Label>{t.settings.salesToolkit.stylePickerLabel}</Label>
        <p className="text-xs text-muted-foreground max-w-[65ch]">
          {t.settings.salesToolkit.stylePickerHelper}
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        {SALES_STYLES.map((style) => {
          const selected = value === style.id;
          // Display copy is localized; SALES_STYLES is kept only for the id/enum.
          const copy = t.settings.salesToolkit.styles[style.id];
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
                  <p className="font-semibold">{copy.label}</p>
                </div>
                <p className="text-xs text-muted-foreground mt-0.5">{copy.tagline}</p>
                <p className="text-xs text-muted-foreground mt-2 leading-relaxed">
                  {copy.description}
                </p>
                <p className="text-[11px] text-muted-foreground/80 mt-2 leading-relaxed">
                  <span className="font-medium">{t.settings.salesToolkit.bestFor}</span> {copy.bestFor}
                </p>
              </button>

              {/* Info affordance: on hover (or keyboard focus) shows a concrete
                  example of how this style sounds, answering the same objection as
                  the other two for easy comparison. */}
              <HoverCard>
                <HoverCardTrigger asChild>
                  <button
                    type="button"
                    aria-label={t.settings.salesToolkit.exampleAria(copy.label)}
                    onClick={(e) => e.stopPropagation()}
                    className="absolute right-2 top-2 grid size-6 place-items-center rounded-full text-muted-foreground hover:text-foreground hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    <Info className="size-4" />
                  </button>
                </HoverCardTrigger>
                <HoverCardContent align="end" className="w-80 space-y-2">
                  <p className="text-sm font-medium">{t.settings.salesToolkit.inAction(copy.label)}</p>
                  <p className="text-xs text-muted-foreground italic">
                    {t.settings.salesToolkit.scenario}
                  </p>
                  <div className="rounded-lg bg-white/5 border border-white/10 p-2.5">
                    <p className="text-sm leading-relaxed">{copy.example}</p>
                  </div>
                </HoverCardContent>
              </HoverCard>
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
  const t = useDictionary();
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
        <p className="text-sm text-muted-foreground italic">{t.settings.salesToolkit.optionsEmpty}</p>
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
                  aria-label={t.settings.salesToolkit.remove}
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
  const t = useDictionary();
  const st = t.settings.salesToolkit;
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
        <Label>{st.packagesLabel}</Label>
        <p className="text-xs text-muted-foreground max-w-[65ch]">
          {st.packagesHelper}
        </p>
      </div>

      {packages.length === 0 ? (
        <p className="text-sm text-muted-foreground italic">{st.packagesEmpty}</p>
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
                      placeholder={st.pkgNamePlaceholder}
                      value={pkg.name}
                      maxLength={120}
                      onChange={(e) => update(i, { name: e.target.value })}
                    />
                    <Input
                      id={`st-pkg-price-${i}`}
                      placeholder={st.pkgPricePlaceholder}
                      value={pkg.price}
                      maxLength={120}
                      onChange={(e) => update(i, { price: e.target.value })}
                    />
                  </div>
                  <Input
                    id={`st-pkg-format-${i}`}
                    placeholder={st.pkgFormatPlaceholder}
                    value={pkg.format}
                    maxLength={200}
                    onChange={(e) => update(i, { format: e.target.value })}
                  />
                  <Textarea
                    id={`st-pkg-includes-${i}`}
                    placeholder={st.pkgIncludesPlaceholder}
                    value={pkg.includes}
                    maxLength={600}
                    rows={2}
                    onChange={(e) => update(i, { includes: e.target.value })}
                  />
                  <Input
                    id={`st-pkg-ideal-${i}`}
                    placeholder={st.pkgIdealPlaceholder}
                    value={pkg.ideal_for}
                    maxLength={300}
                    onChange={(e) => update(i, { ideal_for: e.target.value })}
                  />
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  aria-label={st.removePackage}
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
        {st.addPackage}
      </Button>
    </div>
  );
}

export function SalesToolkitForm({ initial, showApproachOverride = false, variant = "settings" }: Props) {
  const t = useDictionary();
  const st = t.settings.salesToolkit;
  const isOnboarding = variant === "onboarding";
  const [showDetails, setShowDetails] = useState(false);
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

  const details = (
    <>
      <div className="space-y-1.5">
        <Label htmlFor="st-philosophy">{st.philosophyLabel}</Label>
        <p className="text-xs text-muted-foreground max-w-[65ch]">
          {st.philosophyHelper}
        </p>
        <Textarea
          id="st-philosophy"
          placeholder={st.philosophyPlaceholder}
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
        label={st.bridgesLabel}
        helper={st.bridgesHelper}
        namePlaceholder={st.bridgeNamePlaceholder}
        whenPlaceholder={st.bridgeWhenPlaceholder}
        addLabel={st.addBridge}
        options={bridges}
        onChange={setBridges}
      />

      <OptionListEditor
        idPrefix="st-downsell"
        label={st.downsellsLabel}
        helper={st.downsellsHelper}
        namePlaceholder={st.downsellNamePlaceholder}
        whenPlaceholder={st.downsellWhenPlaceholder}
        addLabel={st.addDownsell}
        options={downsells}
        onChange={setDownsells}
      />

      <div className="space-y-1.5">
        <Label htmlFor="st-leverage">{st.leverageLabel}</Label>
        <p className="text-xs text-muted-foreground max-w-[65ch]">
          {st.leverageHelper}
        </p>
        <Textarea
          id="st-leverage"
          placeholder={st.leveragePlaceholder}
          value={leveragePoints}
          maxLength={1500}
          rows={3}
          onChange={(e) => setLeveragePoints(e.target.value)}
        />
        <p className="text-xs text-muted-foreground text-right">{leveragePoints.length}/1500</p>
      </div>
    </>
  );

  return (
    <div className="space-y-6">
      <StylePicker value={salesStyle} onChange={setSalesStyle} />

      {isOnboarding ? (
        <div className="rounded-2xl border border-border p-4 space-y-6">
          <button
            type="button"
            onClick={() => setShowDetails((s) => !s)}
            aria-expanded={showDetails}
            className="flex w-full items-center gap-2 text-left"
          >
            {showDetails ? (
              <CaretDown weight="bold" className="size-3.5 text-muted-foreground shrink-0" />
            ) : (
              <CaretRight weight="bold" className="size-3.5 text-muted-foreground shrink-0" />
            )}
            <span className="text-sm font-medium">{st.detailsTitle}</span>
            <span className="text-[10px] uppercase tracking-wide font-medium rounded-full px-2 py-0.5 bg-secondary text-secondary-foreground shrink-0">
              {st.detailsBadge}
            </span>
          </button>
          {showDetails && (
            <>
              <p className="text-xs text-muted-foreground leading-relaxed -mt-3">
                {st.detailsHint}
              </p>
              {details}
            </>
          )}
        </div>
      ) : (
        details
      )}

      {showApproachOverride && (
        <div className="space-y-1.5 rounded-xl border border-white/10 bg-white/5 p-4">
          <Label htmlFor="st-approach-override">{st.overrideLabel}</Label>
          <p className="text-xs text-muted-foreground max-w-[65ch]">
            {st.overrideHelper}
          </p>
          <Textarea
            id="st-approach-override"
            placeholder={st.overridePlaceholder}
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
