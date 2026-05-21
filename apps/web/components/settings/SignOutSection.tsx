import { Button } from "@/components/ui/button";

interface SignOutSectionProps {
  email: string;
}

export function SignOutSection({ email }: SignOutSectionProps) {
  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-xl font-semibold leading-[1.2]">Sign out</h2>
        <p className="mt-1 text-sm text-muted-foreground leading-[1.5]">
          Signed in as{" "}
          <span className="text-foreground font-medium">{email}</span>. Sign out
          to switch accounts or end this session.
        </p>
      </div>

      <form action="/api/auth/sign-out" method="POST">
        <Button
          type="submit"
          variant="outline"
          className="min-h-[44px] px-5"
        >
          Sign out
        </Button>
      </form>
    </div>
  );
}
