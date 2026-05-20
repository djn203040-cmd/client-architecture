import { NotificationMatrix } from "@/app/(dashboard)/settings/notifications/NotificationMatrix";

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
  prefs: Pref[];
  integrations: Integration[];
}

export function NotificationsSection({ prefs, integrations }: Props) {
  return (
    <div className="space-y-4">
      <div className="space-y-1">
        <h2 className="text-xl font-semibold">Notifications</h2>
        <p className="text-sm text-muted-foreground max-w-[65ch]">
          Choose where you want to hear from Sonorous. Connected channels are loud by default.
        </p>
      </div>
      <NotificationMatrix initialPreferences={prefs} integrations={integrations} />
    </div>
  );
}
