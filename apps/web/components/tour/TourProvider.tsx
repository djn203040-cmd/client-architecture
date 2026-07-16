"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { usePathname, useRouter } from "next/navigation";
import { toast } from "sonner";
import { TOUR_STEPS, type TourStep } from "@/lib/tour/steps";
import { useDictionary } from "@/lib/i18n/provider";
import { TourOverlay } from "./TourOverlay";
import { TourWelcomeDialog } from "./TourWelcomeDialog";

const SEEN_KEY = "tca_tour_v1_seen";
const STATE_KEY = "tca_tour_v1_state";

interface PersistedState {
  active: boolean;
  stepIndex: number;
  demoLeadId: string | null;
}

interface TourContextValue {
  active: boolean;
  /** Resolved, skip-aware position, for the "STEP x OF n" label and dots. */
  stepNumber: number;
  totalSteps: number;
  step: TourStep | null;
  /** True while a lead step is waiting on the demo seed to finish. */
  waiting: boolean;
  start: () => void;
  next: () => void;
  back: () => void;
  stop: () => void;
  /** Resolves a step's route template against the seeded demo lead id. */
  resolveRoute: (step: TourStep) => string | null;
}

const TourContext = createContext<TourContextValue | null>(null);

export function useTour(): TourContextValue {
  const ctx = useContext(TourContext);
  if (!ctx) throw new Error("useTour must be used within <TourProvider>");
  return ctx;
}

function readSeen(): boolean {
  try {
    return localStorage.getItem(SEEN_KEY) === "1";
  } catch {
    return false;
  }
}

export function TourProvider({
  children,
  autoStart = false,
}: {
  children: React.ReactNode;
  /** Coach has finished onboarding, eligible for the one-time auto-launch. */
  autoStart?: boolean;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const t = useDictionary();

  const [active, setActive] = useState(false);
  const [showWelcome, setShowWelcome] = useState(false);
  const [stepIndex, setStepIndex] = useState(0);
  const [demoLeadId, setDemoLeadId] = useState<string | null>(null);
  const [seedFailed, setSeedFailed] = useState(false);
  const seedStarted = useRef(false);

  // Steps that need the demo lead are skipped only if seeding definitively failed.
  const shouldSkip = useCallback(
    (s: TourStep) => Boolean(s.needsDemoLead) && seedFailed && !demoLeadId,
    [seedFailed, demoLeadId],
  );

  const visibleSteps = useMemo(
    () => TOUR_STEPS.filter((s) => !shouldSkip(s)),
    [shouldSkip],
  );

  const step = active ? (TOUR_STEPS[stepIndex] ?? null) : null;

  const resolveRoute = useCallback(
    (s: TourStep): string | null => {
      if (!s.route) return null;
      if (s.route.includes(":leadId")) {
        return demoLeadId ? s.route.replace(":leadId", demoLeadId) : null;
      }
      return s.route;
    },
    [demoLeadId],
  );

  // A lead step whose route can't resolve yet (seed still running) is "waiting".
  const waiting = Boolean(
    step && step.needsDemoLead && !demoLeadId && !seedFailed,
  );

  const seedDemo = useCallback(async () => {
    if (seedStarted.current) return;
    seedStarted.current = true;
    try {
      const res = await fetch("/api/onboarding/seed-demo", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ rich: true }),
      });
      if (!res.ok) throw new Error("seed failed");
      const data = (await res.json()) as { leadId?: string };
      if (data.leadId) {
        setDemoLeadId(data.leadId);
      } else {
        setSeedFailed(true);
        toast.error(t.tour.seedFailed);
      }
    } catch {
      setSeedFailed(true);
      toast.error(t.tour.seedFailed);
    }
  }, [t]);

  const persist = useCallback((s: PersistedState) => {
    try {
      localStorage.setItem(STATE_KEY, JSON.stringify(s));
    } catch {
      /* storage unavailable, in-memory state still drives the tour */
    }
  }, []);

  const start = useCallback(() => {
    setShowWelcome(false);
    setSeedFailed(false);
    seedStarted.current = false;
    setActive(true);
    setStepIndex(0);
    void seedDemo();
  }, [seedDemo]);

  // Dismissing the welcome popup counts as "seen": the coach keeps the
  // sidebar's "Take a tour" link, but we never auto-nag again.
  const dismissWelcome = useCallback(() => {
    setShowWelcome(false);
    try {
      localStorage.setItem(SEEN_KEY, "1");
    } catch {
      /* ignore */
    }
  }, []);

  const stop = useCallback(() => {
    setActive(false);
    try {
      localStorage.setItem(SEEN_KEY, "1");
      localStorage.removeItem(STATE_KEY);
    } catch {
      /* ignore */
    }
  }, []);

  const next = useCallback(() => {
    setStepIndex((i) => {
      let j = i + 1;
      while (j < TOUR_STEPS.length && shouldSkip(TOUR_STEPS[j]!)) j++;
      if (j >= TOUR_STEPS.length) {
        // Defer the teardown so we don't setState on another component mid-render.
        queueMicrotask(stop);
        return i;
      }
      return j;
    });
  }, [shouldSkip, stop]);

  const back = useCallback(() => {
    setStepIndex((i) => {
      let j = i - 1;
      while (j > 0 && shouldSkip(TOUR_STEPS[j]!)) j--;
      return Math.max(0, j);
    });
  }, [shouldSkip]);

  // One-time auto-launch after onboarding, and resume of an interrupted tour.
  useEffect(() => {
    let resumed = false;
    try {
      const raw = localStorage.getItem(STATE_KEY);
      if (raw) {
        const saved = JSON.parse(raw) as PersistedState;
        if (saved.active && saved.stepIndex < TOUR_STEPS.length) {
          setDemoLeadId(saved.demoLeadId);
          setStepIndex(saved.stepIndex);
          setActive(true);
          if (saved.demoLeadId) seedStarted.current = true;
          else void seedDemo();
          resumed = true;
        }
      }
    } catch {
      /* ignore corrupt state */
    }
    if (!resumed && autoStart && !readSeen()) {
      // Small delay so the dashboard has painted before the popup drops in.
      // The congrats popup fronts the tour; Start hands off into it.
      const t = setTimeout(() => setShowWelcome(true), 600);
      return () => clearTimeout(t);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- reason: mount-once bootstrap; must run a single time to resume/auto-start, re-running on dep changes would relaunch the tour
  }, []);

  // Persist progress so a full reload mid-tour resumes where the coach left off.
  useEffect(() => {
    if (active) persist({ active, stepIndex, demoLeadId });
  }, [active, stepIndex, demoLeadId, persist]);

  // Keep the coach on the step's page. Only push when the route is resolvable
  // and actually different, idempotent against the Link they may have clicked.
  useEffect(() => {
    if (!active || !step) return;
    const target = resolveRoute(step);
    if (target && target !== pathname) {
      router.push(target as never);
    }
  }, [active, step, pathname, resolveRoute, router]);

  const value = useMemo<TourContextValue>(() => {
    const stepNumber = visibleSteps.findIndex((s) => s === step) + 1;
    return {
      active,
      stepNumber: stepNumber > 0 ? stepNumber : 1,
      totalSteps: visibleSteps.length,
      step,
      waiting,
      start,
      next,
      back,
      stop,
      resolveRoute,
    };
  }, [active, visibleSteps, step, waiting, start, next, back, stop, resolveRoute]);

  return (
    <TourContext.Provider value={value}>
      {children}
      {showWelcome && !active && (
        <TourWelcomeDialog onStart={start} onSkip={dismissWelcome} />
      )}
      {active && <TourOverlay />}
    </TourContext.Provider>
  );
}
