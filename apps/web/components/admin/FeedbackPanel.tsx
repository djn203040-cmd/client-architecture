import type { FeedbackRow } from "@/app/admin/admin-data";

const PREVIEW_CHARS = 300;

/**
 * Taste-phase feedback list. Long pasted notes collapse behind a native
 * <details> so one wall-of-text report doesn't bury the rest.
 */
export function FeedbackPanel({ rows }: { rows: FeedbackRow[] }) {
  return (
    <div className="rounded-2xl bg-card dark:bg-white/5 border border-border dark:border-white/10 dark:shadow-[inset_0_1px_0_rgba(255,255,255,0.08)] p-6">
      {rows.length === 0 ? (
        <p className="py-6 text-center text-sm text-muted-foreground">
          No feedback yet. The widget is live on every coach&apos;s dashboard —
          reports land here and in your inbox.
        </p>
      ) : (
        <ul className="divide-y divide-border">
          {rows.map((row) => (
            <li key={row.id} className="py-4 first:pt-0 last:pb-0">
              <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                <span
                  className={
                    row.sentiment === "good"
                      ? "inline-flex items-center rounded-full bg-emerald-500/15 px-2 py-0.5 text-xs font-medium text-emerald-700 dark:text-emerald-400"
                      : "inline-flex items-center rounded-full bg-red-500/15 px-2 py-0.5 text-xs font-medium text-red-700 dark:text-red-400"
                  }
                >
                  {row.sentiment === "good" ? "Good" : "Bad"}
                </span>
                <span className="text-sm font-medium">{row.title}</span>
                <span className="ml-auto font-mono text-xs text-muted-foreground">
                  {new Date(row.created_at).toLocaleString()}
                </span>
              </div>
              <div className="mt-1 text-xs text-muted-foreground">
                {row.coach_name ?? "Unknown coach"}
                {row.coach_email ? ` · ${row.coach_email}` : ""}
                {row.page_path ? (
                  <>
                    {" · "}
                    <span className="font-mono">{row.page_path}</span>
                  </>
                ) : null}
              </div>
              {row.note &&
                (row.note.length > PREVIEW_CHARS ? (
                  <details className="mt-2">
                    <summary className="cursor-pointer text-sm text-muted-foreground">
                      {row.note.slice(0, PREVIEW_CHARS)}…{" "}
                      <span className="underline underline-offset-2">
                        show all
                      </span>
                    </summary>
                    <p className="mt-2 text-sm whitespace-pre-wrap">
                      {row.note}
                    </p>
                  </details>
                ) : (
                  <p className="mt-2 text-sm whitespace-pre-wrap text-muted-foreground">
                    {row.note}
                  </p>
                ))}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
