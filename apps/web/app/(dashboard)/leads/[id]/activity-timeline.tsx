import { LeadEventIcon } from "@/components/leads/LeadEventIcon";
import { getServerDictionary } from "@/lib/i18n/server";
import type { Dictionary } from "@/lib/i18n/dictionaries";
import type { Database } from "@client/database";

type Event = Database["public"]["Tables"]["lead_events"]["Row"];

export async function ActivityTimeline({ events }: { events: Event[] }) {
  const t = await getServerDictionary();

  if (events.length === 0) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        <p className="font-medium">{t.leads.timeline.emptyTitle}</p>
        <p className="text-sm mt-1">{t.leads.timeline.emptyBody}</p>
      </div>
    );
  }

  return (
    <ol className="space-y-4">
      {events.map((e) => (
        <li key={e.id} className="flex gap-3 items-start">
          <span className="mt-0.5">
            <LeadEventIcon type={e.event_type} />
          </span>
          <div className="flex-1">
            <p className="text-sm">{describe(e, t)}</p>
            <p className="text-xs text-muted-foreground font-mono">
              {new Date(e.created_at).toLocaleString()}
            </p>
          </div>
        </li>
      ))}
    </ol>
  );
}

function describe(e: Event, t: Dictionary): string {
  switch (e.event_type) {
    case "state_changed": {
      const p = (e.payload ?? {}) as { from?: string; to?: string };
      return t.leads.timeline.stateChanged(
        p.to ?? t.leads.timeline.stateChangedUnknown,
        p.from
      );
    }
    case "note_added":
      return t.leads.timeline.noteAdded;
    case "email_sent":
      return t.leads.timeline.emailSent;
    case "email_opened":
      return t.leads.timeline.emailOpened;
    case "replied":
      return t.leads.timeline.replied;
    case "call_converted":
      return t.leads.timeline.converted;
    default:
      return e.event_type.replace(/_/g, " ");
  }
}
