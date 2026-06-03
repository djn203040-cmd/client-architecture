import { LeadEventIcon } from "@/components/leads/LeadEventIcon";
import type { Database } from "@client/database";

type Event = Database["public"]["Tables"]["lead_events"]["Row"];

export function ActivityTimeline({ events }: { events: Event[] }) {
  if (events.length === 0) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        <p className="font-medium">No activity yet</p>
        <p className="text-sm mt-1">
          Events will appear here as the sequence progresses — emails sent, replies received, state
          changes.
        </p>
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
            <p className="text-sm">{describe(e)}</p>
            <p className="text-xs text-muted-foreground font-mono">
              {new Date(e.created_at).toLocaleString()}
            </p>
          </div>
        </li>
      ))}
    </ol>
  );
}

function describe(e: Event): string {
  switch (e.event_type) {
    case "state_changed": {
      const p = (e.payload ?? {}) as { from?: string; to?: string };
      return `State changed${p.from ? ` from ${p.from}` : ""} to ${p.to ?? "unknown"}`;
    }
    case "note_added":
      return "Note added";
    case "email_sent":
      return "Email sent";
    case "email_opened":
      return "Email opened";
    case "replied":
      return "Lead replied";
    case "call_converted":
      return "Converted to client";
    default:
      return e.event_type.replace(/_/g, " ");
  }
}
