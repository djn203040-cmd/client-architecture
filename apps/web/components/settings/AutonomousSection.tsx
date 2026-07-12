import { dbModeToApiMode } from "@/lib/autonomous-mode";
import { AutonomousModeCard } from "@/app/(dashboard)/settings/autonomous/AutonomousModeCard";
import { getServerDictionary } from "@/lib/i18n/server";

interface Props {
  autonomousMode: string | null;
}

export async function AutonomousSection({ autonomousMode }: Props) {
  const t = await getServerDictionary();
  const initial = dbModeToApiMode(autonomousMode);
  return (
    <div className="space-y-4">
      <div className="space-y-1">
        <h2 className="text-xl font-semibold">{t.settings.autonomous.title}</h2>
        <p className="text-sm text-muted-foreground max-w-[65ch]">
          {t.settings.autonomous.description}
        </p>
      </div>
      <AutonomousModeCard initialMode={initial} />
    </div>
  );
}
