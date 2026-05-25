import { IntegrationHealthCard } from "@/components/integrations/IntegrationHealthCard";

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

export function IntegrationsSection({ integrations }: Props) {
  const displayed = integrations.filter((i) => KEY_PROVIDERS.includes(i.provider));

  return (
    <div className="space-y-4">
      <div className="space-y-1">
        <h2 className="text-xl font-semibold">Integrations</h2>
        <p className="text-sm text-muted-foreground max-w-[65ch]">
          Connected services power your sequences and notifications.
        </p>
      </div>
      {displayed.length > 0 ? (
        <div className="grid gap-3">
          {displayed.map((integration) => (
            <IntegrationHealthCard key={integration.id} integration={integration} />
          ))}
        </div>
      ) : (
        <p className="text-sm text-muted-foreground">No integrations connected yet.</p>
      )}
    </div>
  );
}
