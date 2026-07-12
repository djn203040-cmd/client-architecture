import { VoiceBuilderClient } from "@/app/(dashboard)/settings/voice/VoiceBuilderClient";
import type { TVoiceProfile } from "@client/shared/validators";
import { getServerDictionary } from "@/lib/i18n/server";

interface Props {
  voiceModel: TVoiceProfile | null;
}

export async function VoiceSection({ voiceModel }: Props) {
  const t = await getServerDictionary();
  return (
    <div className="space-y-4">
      <div className="space-y-1">
        <h2 className="text-xl font-semibold">{t.settings.voice.title}</h2>
        <p className="text-sm text-muted-foreground max-w-[65ch]">
          {t.settings.voice.description}
        </p>
      </div>
      <VoiceBuilderClient initialVoiceModel={voiceModel} />
    </div>
  );
}
