import { VoiceBuilderClient } from "@/app/(dashboard)/settings/voice/VoiceBuilderClient";
import type { TVoiceProfile } from "@client/shared/validators";

interface Props {
  voiceModel: TVoiceProfile | null;
}

export function VoiceSection({ voiceModel }: Props) {
  return (
    <div className="space-y-4">
      <div className="space-y-1">
        <h2 className="text-xl font-semibold">My Voice</h2>
        <p className="text-sm text-muted-foreground max-w-[65ch]">
          Paste messages you&apos;ve written, emails, LinkedIn messages, WhatsApp texts.
          The more you give it, the more accurately it captures how you write.
        </p>
      </div>
      <VoiceBuilderClient initialVoiceModel={voiceModel} />
    </div>
  );
}
