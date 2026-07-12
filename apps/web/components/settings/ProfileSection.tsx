import { getServerDictionary } from "@/lib/i18n/server";
import { ProfileForm } from "./ProfileForm";

interface Coach {
  id: string;
  name: string | null;
  language?: string | null;
  display_name?: string | null;
  role_title?: string | null;
  timezone?: string | null;
  working_hours?: unknown;
  email_signature?: string | null;
  public_booking_url?: string | null;
  avatar_url?: string | null;
}

interface Props {
  coach: Coach;
}

export async function ProfileSection({ coach }: Props) {
  const t = await getServerDictionary();
  const wh = coach.working_hours as { start: string; end: string } | null | undefined;

  return (
    <div className="space-y-4">
      <div className="space-y-1">
        <h2 className="text-xl font-semibold">{t.settings.profile.title}</h2>
        <p className="text-sm text-muted-foreground max-w-[65ch]">
          {t.settings.profile.description}
        </p>
      </div>
      <ProfileForm
        coach={{
          id: coach.id,
          name: coach.name,
          display_name: coach.display_name,
          role_title: coach.role_title,
          timezone: coach.timezone,
          working_hours: wh ?? null,
          email_signature: coach.email_signature,
          public_booking_url: coach.public_booking_url,
          avatar_url: coach.avatar_url,
        }}
      />
    </div>
  );
}
