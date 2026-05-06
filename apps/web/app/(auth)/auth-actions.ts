"use server";

import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { LoginSchema, SetPasswordSchema } from "@client/shared/validators";

export async function signInAction(
  _prev: { error?: string } | null,
  formData: FormData,
): Promise<{ error?: string } | null> {
  const parsed = LoginSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  });
  if (!parsed.success) {
    return { error: "Incorrect email or password. Try again." };
  }
  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword(parsed.data);
  if (error) {
    return { error: "Incorrect email or password. Try again." };
  }
  redirect("/leads");
}

export async function setPasswordAction(
  formData: FormData,
): Promise<{ error?: string }> {
  const parsed = SetPasswordSchema.safeParse({ password: formData.get("password") });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid password" };
  }
  const supabase = await createClient();
  const { error } = await supabase.auth.updateUser({ password: parsed.data.password });
  if (error) {
    return { error: "Couldn't set your password. Try again." };
  }
  redirect("/leads");
}
