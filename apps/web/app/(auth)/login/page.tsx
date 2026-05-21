import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { LoginForm } from "./login-form";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (user) redirect("/leads");
  const { error } = await searchParams;
  const initialError =
    error === "no_coach_record"
      ? "Your account isn't set up yet. Ask Daniel to send you an invite."
      : undefined;
  return <LoginForm initialError={initialError} />;
}
