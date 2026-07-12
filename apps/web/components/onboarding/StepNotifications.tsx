"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { NotificationMatrix } from "@/app/(dashboard)/settings/notifications/NotificationMatrix";
import { toast } from "sonner";
import { useDictionary } from "@/lib/i18n/provider";

interface Pref {
  event_type: string;
  channel: string;
  enabled: boolean;
}

interface Integration {
  provider: string;
  status: string;
}

interface Props {
  initialPrefs: Pref[];
  integrations: Integration[];
}

export function StepNotifications({ initialPrefs, integrations }: Props) {
  const t = useDictionary();
  const router = useRouter();
  const [advancing, setAdvancing] = useState(false);

  async function advance() {
    setAdvancing(true);
    try {
      const r = await fetch("/api/onboarding/complete-step", {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ step: "notifications" }),
      });
      if (!r.ok) {
        const body = await r.json().catch(() => ({}));
        toast.error(body.error ?? t.onboarding.notifications.advanceFailed);
        return;
      }
      toast.success(t.onboarding.notifications.savedToast);
      router.push("/dashboard");
    } finally {
      setAdvancing(false);
    }
  }

  return (
    <div className="space-y-5">
      <p className="text-sm text-muted-foreground leading-relaxed">
        {t.onboarding.notifications.intro}
      </p>
      <NotificationMatrix initialPreferences={initialPrefs} integrations={integrations} />
      <div className="flex justify-end pt-2">
        <Button onClick={advance} disabled={advancing} size="sm">
          {advancing ? t.onboarding.notifications.saving : t.onboarding.notifications.finish}
        </Button>
      </div>
    </div>
  );
}
