import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { ThemeToggle } from "@/components/shell/ThemeToggle";

export default async function OnboardingLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: coach } = await supabase
    .from("coaches")
    .select("onboarding_completed_at")
    .eq("id", user.id)
    .maybeSingle();

  if (!coach) redirect("/login");
  if (coach.onboarding_completed_at) redirect("/dashboard");

  return (
    <div className="relative min-h-[100dvh] bg-background">
      <div className="absolute top-4 right-4 z-10">
        <ThemeToggle />
      </div>
      {children}
    </div>
  );
}
