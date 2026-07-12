"use client";
import { useEffect, useState } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { EmailRow } from "./EmailRow";
import { useDictionary } from "@/lib/i18n/provider";
import type { TThreadEmail } from "@/lib/gmail/thread";

export function EmailThreadView({ leadId }: { leadId: string }) {
  const t = useDictionary();
  const [messages, setMessages] = useState<TThreadEmail[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch(`/api/leads/${leadId}/thread`)
      .then(async (res) => {
        const body = await res.json();
        if (!res.ok) {
          throw new Error(
            (body as { error?: string }).error ?? t.leads.emailThread.loadError
          );
        }
        return body as { messages: TThreadEmail[] };
      })
      .then(({ messages: msgs }) => setMessages(msgs))
      .catch((err: unknown) => {
        setError(
          err instanceof Error ? err.message : t.leads.emailThread.loadError
        );
      });
  }, [leadId, t]);

  if (error) {
    return (
      <p className="text-sm text-muted-foreground py-8 text-center">{error}</p>
    );
  }

  if (messages === null) {
    return (
      <div className="space-y-2">
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} className="h-[72px] w-full rounded-xl" />
        ))}
      </div>
    );
  }

  if (messages.length === 0) {
    return (
      <p className="text-sm text-muted-foreground py-8 text-center">
        {t.leads.emailThread.empty}
      </p>
    );
  }

  return (
    <div className="space-y-2">
      {messages.map((msg, idx) => (
        <EmailRow
          key={msg.id}
          email={msg}
          defaultOpen={idx === 0}
        />
      ))}
    </div>
  );
}
