"use client";
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandInput, CommandList, CommandItem, CommandEmpty } from "@/components/ui/command";
import { CheckCircle, LinkSimple } from "@phosphor-icons/react";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/browser";
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
  const [transcripts, setTranscripts] = useState<TTranscript[]>(initialTranscripts);

  // Live updates for new unmatched transcripts
  useEffect(() => {
    const supabase = createClient();
    const channel = supabase
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
    return () => { supabase.removeChannel(channel); };
  }, [coachId]);

  if (transcripts.length === 0) {
    return (
      <div className="rounded-2xl bg-card border border-border p-12 text-center space-y-3">
        <CheckCircle weight="regular" className="size-8 text-muted-foreground mx-auto" aria-hidden="true" />
        <p className="text-sm text-muted-foreground">All transcripts matched.</p>
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
  const [selectedLeadId, setSelectedLeadId] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  const [assigning, setAssigning] = useState(false);

  const selectedLead = leads.find((l) => l.id === selectedLeadId);

  // Check if transcript content suggests a lead (simple heuristic, first word match)
  const suggestion = transcript.matched_by === null
    ? leads.find((l) => transcript.content.toLowerCase().includes(l.name.split(" ")[0]?.toLowerCase() ?? ""))
    : null;

  const callDate = transcript.call_at
    ? new Date(transcript.call_at).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })
    : "Unknown date";

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
        toast.success(`Assigned to ${leadName}. Draft generating...`);
        onAssigned(transcript.id);
      } else {
        toast.error("Couldn't assign the transcript. Try again.");
      }
    } finally {
      setAssigning(false);
    }
  }

  return (
    <li className="rounded-2xl bg-card dark:bg-white/5 border border-border dark:border-white/10 p-5 space-y-4">
      <p className="text-xs font-mono text-muted-foreground">
        {callDate}
        {transcript.duration_seconds ? ` · ${Math.round(transcript.duration_seconds / 60)} min` : ""}
        {` · ${transcript.provider}`}
      </p>
      <p className="text-sm text-foreground line-clamp-3">{preview}</p>

      {suggestion && (
        <div className="rounded-lg bg-accent/8 border border-accent/20 px-3 py-2 flex items-center justify-between gap-3">
          <span className="text-sm text-accent">Looks like {suggestion.name}?</span>
          <Button
            size="sm"
            className="min-h-[44px] text-sm"
            disabled={assigning}
            onClick={() => assign(suggestion.id, suggestion.name)}
          >
            Yes, assign
          </Button>
        </div>
      )}

      <div className="flex items-center gap-3">
        <Popover open={open} onOpenChange={setOpen}>
          <PopoverTrigger asChild>
            <Button variant="ghost" size="sm" className="min-h-[44px] text-sm">
              {selectedLead ? selectedLead.name : "Search leads..."}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="p-0 w-72" align="start">
            <Command>
              <CommandInput placeholder="Search by name or email..." />
              <CommandList>
                <CommandEmpty>No leads found.</CommandEmpty>
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
          Assign to lead
        </Button>
      </div>
    </li>
  );
}
