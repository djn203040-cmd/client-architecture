"use client";
import { useState } from "react";
import { AnimatePresence } from "framer-motion";
import { CallOutcomeCard } from "./CallOutcomeCard";
import {
  CallCelebrationEmptyState,
  CallQueueSkeleton,
} from "./CallCelebrationEmptyState";
import {
  useCallOutcomeRealtime,
  type CallOutcomeRow,
} from "./call-outcome-realtime";

type Tab = "awaiting" | "upcoming" | "history";

export function CallQueueScaffold({
  coachId,
  initialAwaiting,
  initialUpcoming,
  initialHistory,
  timeZone,
}: {
  coachId: string;
  initialAwaiting: CallOutcomeRow[];
  initialUpcoming: CallOutcomeRow[];
  initialHistory: CallOutcomeRow[];
  /** Coach's IANA timezone — renders call windows in their local clock. */
  timeZone?: string | null;
}) {
  const [activeTab, setActiveTab] = useState<Tab>("awaiting");

  const { outcomes: awaiting, loading: awaitingLoading } = useCallOutcomeRealtime(
    coachId,
    { status: "awaiting_outcome", initialOutcomes: initialAwaiting },
  );
  const { outcomes: upcoming } = useCallOutcomeRealtime(coachId, {
    status: "scheduled",
    initialOutcomes: initialUpcoming,
  });
  const { outcomes: history } = useCallOutcomeRealtime(coachId, {
    status: "resolved",
    initialOutcomes: initialHistory,
  });

  const nameOf = (o: CallOutcomeRow) => o.leads?.name ?? "your lead";

  return (
    <div className="space-y-4">
      <div
        role="tablist"
        aria-label="Call queue sections"
        className="flex items-center gap-1 border-b border-border pb-3"
      >
        <TabButton
          id="tab-awaiting"
          controls="tabpanel-awaiting"
          active={activeTab === "awaiting"}
          onClick={() => setActiveTab("awaiting")}
          badge={awaiting.length > 0 ? awaiting.length : undefined}
        >
          Awaiting
        </TabButton>
        <TabButton
          id="tab-upcoming"
          controls="tabpanel-upcoming"
          active={activeTab === "upcoming"}
          onClick={() => setActiveTab("upcoming")}
          badge={upcoming.length > 0 ? upcoming.length : undefined}
        >
          Upcoming
        </TabButton>
        <TabButton
          id="tab-history"
          controls="tabpanel-history"
          active={activeTab === "history"}
          onClick={() => setActiveTab("history")}
        >
          History
        </TabButton>
      </div>

      <div
        role="tabpanel"
        id="tabpanel-awaiting"
        aria-labelledby="tab-awaiting"
        tabIndex={0}
        hidden={activeTab !== "awaiting"}
      >
        {awaitingLoading ? (
          <CallQueueSkeleton />
        ) : awaiting.length === 0 ? (
          <CallCelebrationEmptyState bucket="awaiting" />
        ) : (
          <>
            <p className="text-sm text-muted-foreground mb-4" aria-live="polite">
              {awaiting.length} call{awaiting.length === 1 ? "" : "s"} awaiting an outcome
            </p>
            <div className="space-y-4">
              <AnimatePresence mode="popLayout">
                {awaiting.map((o) => (
                  <CallOutcomeCard
                    key={o.id}
                    outcome={o}
                    leadName={nameOf(o)}
                    variant="awaiting"
                    timeZone={timeZone}
                  />
                ))}
              </AnimatePresence>
            </div>
          </>
        )}
      </div>

      <div
        role="tabpanel"
        id="tabpanel-upcoming"
        aria-labelledby="tab-upcoming"
        tabIndex={0}
        hidden={activeTab !== "upcoming"}
      >
        {upcoming.length === 0 ? (
          <CallCelebrationEmptyState bucket="upcoming" />
        ) : (
          <div className="space-y-4">
            {upcoming.map((o) => (
              <CallOutcomeCard
                key={o.id}
                outcome={o}
                leadName={nameOf(o)}
                variant="readonly"
                timeZone={timeZone}
              />
            ))}
          </div>
        )}
      </div>

      <div
        role="tabpanel"
        id="tabpanel-history"
        aria-labelledby="tab-history"
        tabIndex={0}
        hidden={activeTab !== "history"}
      >
        {history.length === 0 ? (
          <CallCelebrationEmptyState bucket="history" />
        ) : (
          <div className="space-y-4">
            {history.map((o) => (
              <CallOutcomeCard
                key={o.id}
                outcome={o}
                leadName={nameOf(o)}
                variant="readonly"
                timeZone={timeZone}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function TabButton({
  id,
  controls,
  active,
  onClick,
  badge,
  children,
}: {
  id: string;
  controls: string;
  active: boolean;
  onClick: () => void;
  badge?: number;
  children: React.ReactNode;
}) {
  return (
    <button
      role="tab"
      id={id}
      aria-selected={active}
      aria-controls={controls}
      onClick={onClick}
      className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors min-h-[44px] ${
        active
          ? "bg-primary text-primary-foreground"
          : "text-muted-foreground hover:text-foreground hover:bg-white/5"
      }`}
    >
      {children}
      {badge !== undefined && (
        <span className="ml-2 rounded-full text-xs font-mono px-1.5 py-0.5 bg-muted text-muted-foreground">
          {badge}
        </span>
      )}
    </button>
  );
}
