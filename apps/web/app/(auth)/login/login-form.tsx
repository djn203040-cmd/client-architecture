"use client";

import { useActionState } from "react";
import { InviteLoginCard } from "@/components/auth/InviteLoginCard";
import { signInAction } from "../auth-actions";

export function LoginForm() {
  const [state, formAction, pending] = useActionState(signInAction, null);

  return (
    <InviteLoginCard
      error={state?.error}
      formAction={formAction}
      pending={pending}
    />
  );
}
