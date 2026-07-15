"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle } from "@phosphor-icons/react";
import { toast } from "sonner";
import type { TLanguage } from "@client/shared/validators";
import { completeStep, nextRoute } from "./completeStep";

interface Props {
  initialLanguage: TLanguage;
}

const OPTIONS: {
  code: TLanguage;
  flag: string;
  native: string;
  // Sublabel is shown in the language it describes, so each card "speaks" its
  // own language, this is the first thing the coach sees before anything is set.
  sub: string;
}[] = [
  { code: "da", flag: "🇩🇰", native: "Dansk", sub: "Kør hele værktøjet og dine udkast på dansk." },
  { code: "en", flag: "🇬🇧", native: "English", sub: "Run the whole tool and your drafts in English." },
];

export function StepLanguage({ initialLanguage }: Props) {
  const router = useRouter();
  const [selected, setSelected] = useState<TLanguage>(initialLanguage);
  const [submitting, setSubmitting] = useState(false);

  async function choose(language: TLanguage) {
    setSelected(language);
    setSubmitting(true);
    try {
      const save = await fetch("/api/settings/profile", {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ language }),
      });
      if (!save.ok) {
        toast.error("Couldn't save your choice. Try again.");
        return;
      }
      const advance = await completeStep("language");
      if (!advance.ok) {
        toast.error(advance.error ?? "Couldn't continue. Try again.");
        return;
      }
      router.refresh();
      router.push(nextRoute("language", advance.completed) as never);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="space-y-6">
      <p className="text-sm text-muted-foreground leading-relaxed">
        Vælg det sprog, du vil arbejde på. Det styrer hele dashboardet <em>og</em> de udkast, AI&apos;en skriver til dine leads.
        <br />
        <span className="opacity-80">
          Choose the language you want to work in. It sets the whole dashboard <em>and</em> the drafts the AI writes to your leads.
        </span>
      </p>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {OPTIONS.map((opt) => {
          const isSelected = selected === opt.code;
          return (
            <button
              key={opt.code}
              type="button"
              onClick={() => choose(opt.code)}
              disabled={submitting}
              aria-pressed={isSelected}
              className={[
                "group relative flex flex-col items-start gap-2 rounded-xl border p-5 text-left transition-all",
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
              <span className="text-3xl leading-none" aria-hidden>
                {opt.flag}
              </span>
              <span className="text-lg font-semibold">{opt.native}</span>
              <span className="text-xs text-muted-foreground leading-relaxed">{opt.sub}</span>
            </button>
          );
        })}
      </div>

      <p className="text-center text-xs text-muted-foreground">
        Du kan altid skifte i Indstillinger · You can change this anytime in Settings.
      </p>
    </div>
  );
}
