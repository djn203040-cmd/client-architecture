"use client";

import { useActionState } from "react";
import { createClient } from "@/lib/supabase/browser";
import { ForgotPasswordCard } from "@/components/auth/ForgotPasswordCard";

export function ForgotForm() {
  const [state, formAction, pending] = useActionState(
    async (
      _prev: { ok?: boolean; error?: string } | null,
      formData: FormData,
    ): Promise<{ ok?: boolean; error?: string }> => {
      const email = String(formData.get("email") ?? "").trim();
      if (!email || !email.includes("@")) {
        return { error: "Enter a valid email." };
      }
      const supabase = createClient();
      const appUrl =
        process.env["NEXT_PUBLIC_APP_URL"] ?? window.location.origin;
      // Browser-side call so the PKCE code_verifier is stored in localStorage
      // and is available when the user returns from the reset email.
      // Privacy: ignore the result — never leak whether the email is registered.
      await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${appUrl}/reset-password`,
      });
      return { ok: true };
    },
    null,
  );

  return (
    <ForgotPasswordCard
      ok={state?.ok}
      error={state?.error}
      formAction={formAction}
      pending={pending}
    />
  );
}
