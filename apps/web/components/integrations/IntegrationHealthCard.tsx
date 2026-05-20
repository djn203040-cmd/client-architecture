import { CheckCircle, WarningCircle } from "@phosphor-icons/react/dist/ssr";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

const PROVIDER_NO_SHOW_MODE: Record<string, "auto" | "manual"> = {
  calendly: "auto",
  cal_com: "auto",
  acuity: "auto",
  setmore: "manual",
  square: "manual",
  ms_bookings: "manual",
  tidycal: "manual",
};

const NO_SHOW_TOOLTIP: Record<"auto" | "manual", string> = {
  auto: "Auto: no-show detected automatically",
  manual: "Manual: click Start Sequence after a no-show",
};

const PROVIDER_LABELS: Record<string, string> = {
  calendly: "Calendly",
  cal_com: "Cal.com",
  acuity: "Acuity",
  setmore: "Setmore",
  square: "Square",
  ms_bookings: "MS Bookings",
  tidycal: "TidyCal",
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

export function IntegrationHealthCard({ integration }: Props) {
  const isConnected = integration.status === "connected";
  const mode = PROVIDER_NO_SHOW_MODE[integration.provider] ?? "manual";
  const tooltipText = NO_SHOW_TOOLTIP[mode];
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
      </div>
      <span className={isConnected ? "text-muted-foreground" : "text-[var(--health-red)]"}>
        {isConnected ? "Connected" : "Disconnected"}
      </span>
    </div>
  );
}
