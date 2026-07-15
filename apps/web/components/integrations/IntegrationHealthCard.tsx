import { CheckCircle, WarningCircle } from "@phosphor-icons/react/dist/ssr";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { getServerDictionary } from "@/lib/i18n/server";

const PROVIDER_NO_SHOW_MODE: Record<string, "auto" | "manual"> = {
  calendly: "auto",
  cal_com: "auto",
  acuity: "auto",
  setmore: "manual",
  square: "manual",
  ms_bookings: "manual",
  tidycal: "manual",
};

const PROVIDER_LABELS: Record<string, string> = {
  calendly: "Calendly",
  cal_com: "Cal.com",
  acuity: "Acuity",
  setmore: "Setmore",
  square: "Square",
  ms_bookings: "MS Bookings",
  tidycal: "TidyCal",
  gmail: "Gmail",
  slack: "Slack",
  twilio: "Twilio",
};

interface Integration {
  id: string;
  provider: string;
  status: string;
  error_message?: string | null;
}

interface Props {
  integration: Integration;
}

export async function IntegrationHealthCard({ integration }: Props) {
  const t = await getServerDictionary();
  const copy = t.settingsAdvanced.integrationHealth;
  const isConnected = integration.status === "connected";
  // The no-show tooltip only makes sense for calendar providers; the settings
  // integrations list (gmail/slack/twilio) renders a plain label.
  const mode = PROVIDER_NO_SHOW_MODE[integration.provider];
  const tooltipText = mode ? (mode === "auto" ? copy.noShowAuto : copy.noShowManual) : null;
  const label = PROVIDER_LABELS[integration.provider] ?? integration.provider;

  return (
    <div
      className={[
        "flex items-center justify-between px-4 py-3 rounded-xl border text-sm",
        isConnected
          ? "bg-white/5 border-white/10"
          : "bg-[color:var(--health-red)]/10 border-[color:var(--health-red)]/30",
      ].join(" ")}
    >
      <div className="flex items-center gap-2">
        {isConnected ? (
          <CheckCircle weight="regular" className="size-4 text-[var(--health-green)]" />
        ) : (
          <WarningCircle weight="regular" className="size-4 text-[var(--health-red)]" />
        )}
        {tooltipText ? (
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <span className="cursor-default">{label}</span>
              </TooltipTrigger>
              <TooltipContent>
                <p>{tooltipText}</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        ) : (
          <span>{label}</span>
        )}
      </div>
      <span className={isConnected ? "text-muted-foreground" : "text-[var(--health-red)]"}>
        {isConnected ? copy.connected : copy.disconnected}
      </span>
    </div>
  );
}
