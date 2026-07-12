import { IntegrationHealthCard } from "@/components/integrations/IntegrationHealthCard";
import { getServerDictionary } from "@/lib/i18n/server";

interface Integration {
  id: string;
  provider: string;
  status: string;
  error_message?: string | null;
}

interface Props {
  integrations: Integration[];
}

const KEY_PROVIDERS = ["gmail", "slack", "twilio"];

// Providers with a per-coach connect flow, offered when not yet connected.
// (Twilio has no per-coach OAuth flow yet, so it's intentionally absent.)
const CONNECTABLE: { provider: string; label: string; href: string }[] = [
  { provider: "gmail", label: "Gmail", href: "/api/auth/gmail/authorize" },
  { provider: "slack", label: "Slack", href: "/api/auth/slack/install" },
];

export async function IntegrationsSection({ integrations }: Props) {
  const t = await getServerDictionary();
  const displayed = integrations.filter((i) => KEY_PROVIDERS.includes(i.provider));
  const presentProviders = new Set(integrations.map((i) => i.provider));
  const toConnect = CONNECTABLE.filter((c) => !presentProviders.has(c.provider));

  return (
    <div className="space-y-4">
      <div className="space-y-1">
        <h2 className="text-xl font-semibold">{t.settings.integrations.title}</h2>
        <p className="text-sm text-muted-foreground max-w-[65ch]">
          {t.settings.integrations.description}
        </p>
      </div>
      {displayed.length > 0 || toConnect.length > 0 ? (
        <div className="grid gap-3">
          {displayed.map((integration) => (
            <IntegrationHealthCard key={integration.id} integration={integration} />
          ))}
          {toConnect.map(({ provider, label, href }) => (
            <div
              key={provider}
              className="flex items-center justify-between px-4 py-3 rounded-xl border border-white/10 bg-white/5 text-sm"
            >
              <span className="text-muted-foreground">{t.settings.integrations.notConnected(label)}</span>
              <a
                href={href}
                className="rounded-lg border border-white/15 px-3 py-1.5 text-xs font-medium text-accent hover:bg-white/5 transition-colors"
              >
                {t.settings.integrations.connect(label)}
              </a>
            </div>
          ))}
        </div>
      ) : (
        <p className="text-sm text-muted-foreground">{t.settings.integrations.empty}</p>
      )}
    </div>
  );
}
