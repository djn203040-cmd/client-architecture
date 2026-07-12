"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { SalesToolkitForm } from "@/components/settings/SalesToolkitForm";
import type { TSalesToolkit } from "@client/shared/validators";
import { toast } from "sonner";

interface Props {
  initialToolkit: TSalesToolkit;
}

export function StepSales({ initialToolkit }: Props) {
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
        toast.error(body.error ?? "Couldn't advance. Try again.");
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
        Start by picking the sales approach that sounds most like you, that part takes about
        a minute. If you want, add your programs and how you handle objections too, so the AI
        can bridge the gap the way you would when a lead hesitates. The whole thing takes
        about 3 to 5 minutes, and you can skip it now and finish later in Settings.
      </p>

      <SalesToolkitForm initial={initialToolkit} />

      <div className="flex items-center justify-between pt-2">
        <Button variant="ghost" size="sm" onClick={advance} disabled={submitting}>
          I&apos;ll add this later
        </Button>
        <Button size="sm" onClick={advance} disabled={submitting}>
          {submitting ? "Saving…" : "Continue"}
        </Button>
      </div>
    </div>
  );
}
