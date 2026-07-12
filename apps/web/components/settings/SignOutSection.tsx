import { Button } from "@/components/ui/button";
import { getServerDictionary } from "@/lib/i18n/server";

interface SignOutSectionProps {
  email: string;
}

export async function SignOutSection({ email }: SignOutSectionProps) {
  const t = await getServerDictionary();
  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-xl font-semibold leading-[1.2]">{t.settings.signOut.title}</h2>
        <p className="mt-1 text-sm text-muted-foreground leading-[1.5]">
          {t.settings.signOut.signedInAs}{" "}
          <span className="text-foreground font-medium">{email}</span>.{" "}
          {t.settings.signOut.description}
        </p>
      </div>

      <form action="/api/auth/sign-out" method="POST">
        <Button
          type="submit"
          variant="outline"
          className="min-h-[44px] px-5"
        >
          {t.settings.signOut.button}
        </Button>
      </form>
    </div>
  );
}
