"use client";

import { useEffect, useState, useActionState } from "react";
import { createClient } from "@/lib/supabase/browser";
import { setPasswordAction } from "../../auth-actions";
import { InviteAcceptCard } from "@/components/auth/InviteAcceptCard";

export function AcceptForm() {
  const [tokenStatus, setTokenStatus] = useState<"loading" | "valid" | "invalid">("loading");

  useEffect(() => {
    const hash = typeof window !== "undefined" ? window.location.hash.slice(1) : "";
    const params = new URLSearchParams(hash);
    const access_token = params.get("access_token");
    const refresh_token = params.get("refresh_token");
    const type = params.get("type");

    if (type !== "invite" || !access_token || !refresh_token) {
      setTokenStatus("invalid");
      return;
    }
    const supabase = createClient();
    supabase.auth
      .setSession({ access_token, refresh_token })
      .then(({ error }) => setTokenStatus(error ? "invalid" : "valid"));
  }, []);

  const [state, formAction, pending] = useActionState(
    async (_prev: { error?: string } | null, fd: FormData) => setPasswordAction(fd),
    null,
  );

  return (
    <InviteAcceptCard
      tokenStatus={tokenStatus}
      formAction={formAction}
      error={state?.error}
      pending={pending}
    />
  );
}
