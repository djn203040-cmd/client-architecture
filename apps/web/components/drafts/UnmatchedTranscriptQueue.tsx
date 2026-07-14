"use client";
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandInput, CommandList, CommandItem, CommandEmpty } from "@/components/ui/command";
import { CheckCircle, LinkSimple } from "@phosphor-icons/react";
import { toast } from "sonner";
import { createClient, realtimeAuthReady } from "@/lib/supabase/browser";
import type { RealtimeChannel } from "@supabase/supabase-js";
import { useDictionary, useLocale } from "@/lib/i18n/provider";
import { toDateLocale } from "@/lib/format/datetime";
import type { Database } from "@client/database";

type TTranscript = Database["public"]["Tables"]["transcripts"]["Row"];
type LeadRow = Pick<Database["public"]["Tables"]["leads"]["Row"], "id" | "name" | "email">;

export function UnmatchedTranscriptQueue({
  coachId,
  initialTranscripts,
  leads,
}: {
  coachId: string;
  initialTranscripts: TTranscript[];
  leads: LeadRow[];
}) {
  const t = useDictionary();
  const [transcripts, setTranscripts] = useState<TTranscript[]>(initialTranscripts);

  // Live updates for new unmatched transcripts
  useEffect(() => {
    const supabase = createClient();
    let cancelled = false;
    let channel: RealtimeChannel | null = null;
    // The join must carry the user JWT (see realtimeAuthReady), otherwise the
    // subscription registers with anon claims and RLS drops every event.
    void realtimeAuthReady(supabase).then(() => {
      if (cancelled) return;
      channel = supabase
        .channel("unmatched-transcripts")
        .on(
          "postgres_changes",
          {
            event: "INSERT",
            schema: "public",
            table: "transcripts",
            filter: `coach_id=eq.${coachId}`,
          },
          (payload) => {
            const row = payload.new as TTranscript;
            if (!row.lead_id) setTranscripts((prev) => [row, ...prev]);
          }
        )
        .subscribe();
    });
    return () => {
      cancelled = true;
      if (channel) supabase.removeChannel(channel);
    };
  }, [coachId]);

  if (transcripts.length === 0) {
    return (
      <div className="rounded-2xl bg-card border border-border p-12 text-center space-y-3">
        <CheckCircle weight="regular" className="size-8 text-muted-foreground mx-auto" aria-hidden="true" />
        <p className="text-sm text-muted-foreground">{t.drafts.unmatchedTranscripts.empty}</p>
      </div>
    );
  }

  return (
    <ul className="space-y-4 list-none p-0 m-0">
      {transcripts.map((t) => (
        <TranscriptRow
          key={t.id}
          transcript={t}
          leads={leads}
          onAssigned={(id) => setTranscripts((prev) => prev.filter((x) => x.id !== id))}
        />
      ))}
    </ul>
  );
}

function TranscriptRow({
  transcript,
  leads,
  onAssigned,
}: {
  transcript: TTranscript;
  leads: LeadRow[];
  onAssigned: (id: string) => void;
}) {
  const t = useDictionary();
  const dateLocale = toDateLocale(useLocale());
  const [selectedLeadId, setSelectedLeadId] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  const [assigning, setAssigning] = useState(false);

  const selectedLead = leads.find((l) => l.id === selectedLeadId);

  // Check if transcript content suggests a lead (simple heuristic, first word match)
  const suggestion = transcript.matched_by === null
    ? leads.find((l) => transcript.content.toLowerCase().includes(l.name.split(" ")[0]?.toLowerCase() ?? ""))
    : null;

  const callDate = transcript.call_at
    ? new Date(transcript.call_at).toLocaleDateString(dateLocale, { day: "numeric", month: "short", year: "numeric" })
    : t.drafts.unmatchedTranscripts.unknownDate;

  const preview = transcript.content.slice(0, 200);

  async function assign(leadId: string, leadName: string) {
    setAssigning(true);
    try {
      const r = await fetch(`/api/transcripts/${transcript.id}/assign`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ leadId }),
      });
      if (r.ok) {
        toast.success(t.drafts.unmatchedTranscripts.assignedToast(leadName));
        onAssigned(transcript.id);
      } else {
        toast.error(t.drafts.unmatchedTranscripts.assignFailed);
      }
    } finally {
      setAssigning(false);
    }
  }

  return (
    <li className="rounded-2xl bg-card dark:bg-white/5 border border-border dark:border-white/10 p-5 space-y-4">
      <p className="text-xs font-mono text-muted-foreground">
        {callDate}
        {transcript.duration_seconds ? ` · ${t.drafts.unmatchedTranscripts.minutes(Math.round(transcript.duration_seconds / 60))}` : ""}
        {` · ${transcript.provider}`}
      </p>
      <p className="text-sm text-foreground line-clamp-3">{preview}</p>

      {suggestion && (
        <div className="rounded-lg bg-accent/8 border border-accent/20 px-3 py-2 flex items-center justify-between gap-3">
          <span className="text-sm text-accent">{t.drafts.unmatchedTranscripts.looksLike(suggestion.name)}</span>
          <Button
            size="sm"
            className="min-h-[44px] text-sm"
            disabled={assigning}
            onClick={() => assign(suggestion.id, suggestion.name)}
          >
            {t.drafts.unmatchedTranscripts.yesAssign}
          </Button>
        </div>
      )}

      <div className="flex items-center gap-3">
        <Popover open={open} onOpenChange={setOpen}>
          <PopoverTrigger asChild>
            <Button variant="ghost" size="sm" className="min-h-[44px] text-sm">
              {selectedLead ? selectedLead.name : t.drafts.unmatchedTranscripts.searchLeads}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="p-0 w-72" align="start">
            <Command>
              <CommandInput placeholder={t.drafts.unmatchedTranscripts.searchPlaceholder} />
              <CommandList>
                <CommandEmpty>{t.drafts.unmatchedTranscripts.noLeadsFound}</CommandEmpty>
                {leads.map((lead) => (
                  <CommandItem
                    key={lead.id}
                    value={`${lead.name} ${lead.email ?? ""}`}
                    onSelect={() => { setSelectedLeadId(lead.id); setOpen(false); }}
                  >
                    <span className="font-medium">{lead.name}</span>
                    {lead.email && <span className="ml-2 text-xs text-muted-foreground">{lead.email}</span>}
                  </CommandItem>
                ))}
              </CommandList>
            </Command>
          </PopoverContent>
        </Popover>

        <Button
          size="sm"
          className="min-h-[44px] gap-2 text-sm"
          disabled={!selectedLeadId || assigning}
          onClick={() => selectedLead && assign(selectedLead.id, selectedLead.name)}
        >
          <LinkSimple weight="regular" className="size-4" />
          {t.drafts.unmatchedTranscripts.assignToLead}
        </Button>
      </div>
    </li>
  );
}
