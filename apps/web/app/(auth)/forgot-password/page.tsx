import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { ForgotForm } from "./forgot-form";

export default async function ForgotPasswordPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (user) redirect("/leads");
  return <ForgotForm />;
}
