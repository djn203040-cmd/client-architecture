"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { SalesToolkitForm } from "@/components/settings/SalesToolkitForm";
import type { TSalesToolkit } from "@client/shared/validators";
import { toast } from "sonner";
import { useDictionary } from "@/lib/i18n/provider";

interface Props {
  initialToolkit: TSalesToolkit;
}

export function StepSales({ initialToolkit }: Props) {
  const t = useDictionary();
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);

  async function advance() {
    setSubmitting(true);
    try {
      // The form autosaves each field to /api/settings/sales-toolkit as the
      // coach types, so advancing just marks the step complete. Whatever they
      // filled in (or left blank) is already persisted.
      const res = await fetch("/api/onboarding/complete-step", {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ step: "sales" }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        toast.error(body.error ?? t.onboarding.sales.advanceFailed);
        return;
      }
      router.refresh();
      router.push("/onboarding/voice" as never);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="space-y-6">
      <p className="text-sm text-muted-foreground leading-relaxed">
        {t.onboarding.sales.intro}
      </p>

      <SalesToolkitForm initial={initialToolkit} />

      <div className="flex items-center justify-between pt-2">
        <Button variant="ghost" size="sm" onClick={advance} disabled={submitting}>
          {t.onboarding.sales.later}
        </Button>
        <Button size="sm" onClick={advance} disabled={submitting}>
          {submitting ? t.onboarding.sales.saving : t.onboarding.sales.continue}
        </Button>
      </div>
    </div>
  );
}
