import { dbModeToApiMode } from "@/lib/autonomous-mode";
import { AutonomousModeCard } from "@/app/(dashboard)/settings/autonomous/AutonomousModeCard";

interface Props {
  autonomousMode: string | null;
}

export function AutonomousSection({ autonomousMode }: Props) {
  const initial = dbModeToApiMode(autonomousMode);
  return (
    <div className="space-y-4">
      <div className="space-y-1">
        <h2 className="text-xl font-semibold">Autonomous mode</h2>
        <p className="text-sm text-muted-foreground max-w-[65ch]">
          Choose how much trust to give the AI. You can change this anytime.
        </p>
      </div>
      <AutonomousModeCard initialMode={initial} />
    </div>
  );
}
