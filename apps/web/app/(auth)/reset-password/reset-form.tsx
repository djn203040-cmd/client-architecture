"use client";

import { useEffect, useState, useActionState } from "react";
import { createClient } from "@/lib/supabase/browser";
import { setPasswordAction } from "../auth-actions";
import { ResetPasswordCard } from "@/components/auth/ResetPasswordCard";

export function ResetForm() {
  const [tokenStatus, setTokenStatus] = useState<"loading" | "valid" | "invalid">(
    "loading",
  );
  const [debugError, setDebugError] = useState<string | undefined>();

  useEffect(() => {
    if (typeof window === "undefined") return;
    const supabase = createClient();

    // PKCE flow (Supabase default): ?code=<auth_code> in query string.
    const code = new URLSearchParams(window.location.search).get("code");
    if (code) {
      supabase.auth.exchangeCodeForSession(code).then(({ error }) => {
        if (error) {
          // eslint-disable-next-line no-console
          console.error("[reset-password] exchangeCodeForSession failed:", error);
          setDebugError(`${error.name ?? "Error"}: ${error.message}`);
          setTokenStatus("invalid");
          return;
        }
        setTokenStatus("valid");
        // Strip the code from the URL so a refresh doesn't reuse a consumed code.
        window.history.replaceState({}, "", window.location.pathname);
      });
      return;
    }

    // Implicit flow fallback: #access_token=...&refresh_token=...&type=recovery
    const hashParams = new URLSearchParams(window.location.hash.slice(1));
    const access_token = hashParams.get("access_token");
    const refresh_token = hashParams.get("refresh_token");
    const type = hashParams.get("type");
    if (type === "recovery" && access_token && refresh_token) {
      supabase.auth
        .setSession({ access_token, refresh_token })
        .then(({ error }) => {
          if (error) {
            // eslint-disable-next-line no-console
            console.error("[reset-password] setSession failed:", error);
            setDebugError(`${error.name ?? "Error"}: ${error.message}`);
          }
          setTokenStatus(error ? "invalid" : "valid");
        });
      return;
    }

    setDebugError("No code or hash tokens found in URL.");
    setTokenStatus("invalid");
  }, []);

  const [state, formAction, pending] = useActionState(
    async (_prev: { error?: string } | null, fd: FormData) =>
      setPasswordAction(fd),
    null,
  );

  return (
    <ResetPasswordCard
      tokenStatus={tokenStatus}
      formAction={formAction}
      error={state?.error}
      pending={pending}
      debugError={debugError}
    />
  );
}
