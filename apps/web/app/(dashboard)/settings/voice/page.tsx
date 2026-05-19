import { createClient } from "@/lib/supabase/server";
import { VoiceBuilderClient } from "./VoiceBuilderClient";
import type { TVoiceProfile } from "@client/shared/validators";

export default async function MyVoicePage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const { data: coach } = await supabase
    .from("coaches")
    .select("voice_model")
    .eq("id", user!.id)
    .single();

  const voiceModel = coach?.voice_model as TVoiceProfile | null | Record<string, never>;
  const initialVoiceModel =
    voiceModel && typeof voiceModel === "object" && "tone_adjectives" in voiceModel
      ? (voiceModel as TVoiceProfile)
      : null;

  return (
    <section className="space-y-6 max-w-2xl">
      <h1 className="text-[28px] font-semibold leading-[1.2]">My Voice</h1>
      <p className="text-sm text-muted-foreground max-w-[65ch]">
        Paste messages you&apos;ve written — emails, LinkedIn messages, WhatsApp texts.
        The more you give it, the more accurately it captures how you write.
      </p>
      <VoiceBuilderClient initialVoiceModel={initialVoiceModel} />
    </section>
  );
}
