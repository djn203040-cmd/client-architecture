"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle } from "@phosphor-icons/react";
import { toast } from "sonner";
import type { TLanguage } from "@client/shared/validators";
import { useDictionary } from "@/lib/i18n/provider";

interface Props {
  initialLanguage: TLanguage;
}

export function LanguageSwitcher({ initialLanguage }: Props) {
  const t = useDictionary();
  const router = useRouter();
  const [selected, setSelected] = useState<TLanguage>(initialLanguage);
  const [submitting, setSubmitting] = useState(false);

  // Each card "speaks" its own language, matching onboarding: the Danish card is
  // in Danish, the English card in English, regardless of the active locale.
  const options: { code: TLanguage; flag: string; native: string; sub: string }[] = [
    { code: "da", flag: "🇩🇰", native: t.language.danish, sub: t.settings.languageSection.danishSub },
    { code: "en", flag: "🇬🇧", native: t.language.english, sub: t.settings.languageSection.englishSub },
  ];

  async function choose(language: TLanguage) {
    if (submitting || language === selected) return;
    const previous = selected;
    setSelected(language);
    setSubmitting(true);
    try {
      const res = await fetch("/api/settings/profile", {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ language }),
      });
      if (!res.ok) {
        setSelected(previous);
        toast.error(t.language.switcherError);
        return;
      }
      toast.success(t.language.switcherSaved);
      router.refresh();
    } catch {
      setSelected(previous);
      toast.error(t.language.switcherError);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="space-y-3">
      <div className="space-y-1">
        <h3 className="text-sm font-semibold">{t.settings.profile.languageTitle}</h3>
        <p className="text-xs text-muted-foreground max-w-[65ch]">{t.language.settingHint}</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {options.map((opt) => {
          const isSelected = selected === opt.code;
          return (
            <button
              key={opt.code}
              type="button"
              onClick={() => choose(opt.code)}
              disabled={submitting}
              aria-pressed={isSelected}
              className={[
                "group relative flex flex-col items-start gap-1.5 rounded-xl border p-4 text-left transition-all",
                "disabled:opacity-60 disabled:cursor-not-allowed",
                isSelected
                  ? "border-primary ring-2 ring-primary/30 bg-primary/5"
                  : "border-border hover:border-primary/50 hover:bg-muted/40",
              ].join(" ")}
            >
              {isSelected && (
                <CheckCircle
                  weight="fill"
                  className="absolute right-3 top-3 size-5 text-primary"
                />
              )}
              <span className="text-2xl leading-none" aria-hidden>
                {opt.flag}
              </span>
              <span className="text-base font-semibold">{opt.native}</span>
              <span className="text-xs text-muted-foreground leading-relaxed">{opt.sub}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
