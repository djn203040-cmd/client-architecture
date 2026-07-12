import { NotificationMatrix } from "@/app/(dashboard)/settings/notifications/NotificationMatrix";
import { getServerDictionary } from "@/lib/i18n/server";

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

export async function NotificationsSection({ prefs, integrations }: Props) {
  const t = await getServerDictionary();
  return (
    <div className="space-y-4">
      <div className="space-y-1">
        <h2 className="text-xl font-semibold">{t.settings.notifications.title}</h2>
        <p className="text-sm text-muted-foreground max-w-[65ch]">
          {t.settings.notifications.description}
        </p>
      </div>
      <NotificationMatrix initialPreferences={prefs} integrations={integrations} />
    </div>
  );
}
