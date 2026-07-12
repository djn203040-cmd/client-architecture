"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion } from "framer-motion";
import { X, CircleNotch } from "@phosphor-icons/react";
import { useTour } from "./TourProvider";
import type { TourPlacement } from "@/lib/tour/steps";

interface Rect {
  top: number;
  left: number;
  width: number;
  height: number;
}

const GAP = 14; // distance between spotlight and tooltip
const PAD = 8; // breathing room around the spotlighted element
const TIP_W = 360;
const MARGIN = 20; // min distance from viewport edge

/** Picks the first *rendered* match, several anchors (nav items) exist in both
 *  the desktop sidebar and the mobile bar; only one is visible at a time. */
function findVisible(anchor: string): HTMLElement | null {
  const els = document.querySelectorAll<HTMLElement>(`[data-tour="${anchor}"]`);
  for (const el of els) {
    const r = el.getBoundingClientRect();
    if (r.width > 0 && r.height > 0 && el.offsetParent !== null) return el;
  }
  return els[0] ?? null;
}

function sameRect(a: Rect | null, b: Rect): boolean {
  if (!a) return false;
  return (
    Math.abs(a.top - b.top) < 1 &&
    Math.abs(a.left - b.left) < 1 &&
    Math.abs(a.width - b.width) < 1 &&
    Math.abs(a.height - b.height) < 1
  );
}

export function TourOverlay() {
  const { step, stepNumber, totalSteps, next, back, stop, waiting } = useTour();

  const [rect, setRect] = useState<Rect | null>(null);
  const [notFound, setNotFound] = useState(false);

  const tipRef = useRef<HTMLDivElement>(null);
  const [tipSize, setTipSize] = useState<{ w: number; h: number } | null>(null);

  const targetKey = step ? step.id : "none";

  // Locate + continuously track the spotlighted element. Self-heals: if the
  // element mounts late (async page content) a later tick picks it up.
  useEffect(() => {
    setRect(null);
    setNotFound(false);
    setTipSize(null);
    if (!step || !step.target || waiting) return;

    let cancelled = false;
    let scrolled = false;
    let misses = 0;

    const measure = () => {
      if (cancelled) return;
      const el = findVisible(step.target as string);
      if (el) {
        if (!scrolled) {
          el.scrollIntoView({ block: "center", behavior: "smooth" });
          scrolled = true;
        }
        const r = el.getBoundingClientRect();
        const next: Rect = { top: r.top, left: r.left, width: r.width, height: r.height };
        setRect((prev) => (sameRect(prev, next) ? prev : next));
        setNotFound(false);
      } else {
        misses += 1;
        if (misses > 18) setNotFound(true); // ~1.8s → fall back to a centered card
      }
    };

    measure();
    const id = window.setInterval(measure, 100);
    const onMove = () => measure();
    window.addEventListener("resize", onMove);
    window.addEventListener("scroll", onMove, true);
    return () => {
      cancelled = true;
      window.clearInterval(id);
      window.removeEventListener("resize", onMove);
      window.removeEventListener("scroll", onMove, true);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- reason: tracker re-arms only per spotlight (targetKey) or waiting change; keying on the full step object would restart the interval every render
  }, [targetKey, waiting]);

  // Bind a one-shot click handler for "now click X" steps once the element exists.
  useEffect(() => {
    if (!step?.clickToAdvance || !step.target) return;
    const el = findVisible(step.target);
    if (!el) return;
    const handler = () => next();
    el.addEventListener("click", handler, { once: true });
    return () => el.removeEventListener("click", handler);
  }, [step, next, rect]);

  // Measure the tooltip so we can position (and clamp) it precisely.
  useLayoutEffect(() => {
    const el = tipRef.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    setTipSize((prev) =>
      prev && Math.abs(prev.w - r.width) < 1 && Math.abs(prev.h - r.height) < 1
        ? prev
        : { w: r.width, h: r.height },
    );
  });

  if (typeof document === "undefined" || !step) return null;

  const centered = waiting || !step.target || notFound || !rect;
  const tipW = tipSize?.w ?? TIP_W;
  const tipH = tipSize?.h ?? 200;
  const vw = typeof window !== "undefined" ? window.innerWidth : 1280;
  const vh = typeof window !== "undefined" ? window.innerHeight : 800;

  const pos = centered
    ? { top: vh / 2 - tipH / 2, left: vw / 2 - tipW / 2, placement: "center" as const }
    : placeTooltip(rect as Rect, tipW, tipH, step.placement ?? "auto", vw, vh);

  const isLast = stepNumber >= totalSteps;
  const isFirst = stepNumber <= 1;

  return createPortal(
    <div className="fixed inset-0 z-[9998] pointer-events-none" aria-live="polite">
      {/* Dimmer: a spotlight cut-out when we have a target, else a flat scrim. */}
      {centered ? (
        <div className="absolute inset-0 bg-[oklch(20%_0.02_260/0.55)]" />
      ) : (
        <motion.div
          className="absolute rounded-2xl"
          initial={false}
          animate={{
            top: (rect as Rect).top - PAD,
            left: (rect as Rect).left - PAD,
            width: (rect as Rect).width + PAD * 2,
            height: (rect as Rect).height + PAD * 2,
          }}
          transition={{ type: "spring", stiffness: 380, damping: 34 }}
          style={{
            boxShadow:
              "0 0 0 9999px oklch(20% 0.02 260 / 0.55), 0 0 0 2px var(--color-primary, #1E3A2E), 0 8px 30px oklch(20% 0.02 260 / 0.35)",
          }}
        />
      )}

      {/* Tooltip card */}
      <AnimatePresence mode="wait">
        <motion.div
          key={step.id}
          ref={tipRef}
          role="dialog"
          aria-modal="false"
          aria-label={step.title}
          initial={{ opacity: 0, scale: 0.97 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.98 }}
          transition={{ duration: 0.18 }}
          className="pointer-events-auto absolute w-[min(360px,calc(100vw-40px))] rounded-2xl border border-black/5 bg-white text-neutral-900 shadow-[0_12px_40px_rgba(0,0,0,0.22)] dark:border-white/10 dark:bg-neutral-900 dark:text-neutral-50"
          style={{ top: pos.top, left: pos.left }}
        >
          {pos.placement !== "center" && <Caret placement={pos.placement} />}
          <div className="p-6">
            {waiting ? (
              <div className="flex items-center gap-3 py-2">
                <CircleNotch className="size-5 animate-spin text-neutral-400" />
                <p className="text-sm text-neutral-500 dark:text-neutral-400">
                  Preparing your demo lead…
                </p>
              </div>
            ) : (
              <>
                <div className="mb-3 flex items-center justify-between">
                  <span className="text-[11px] font-semibold uppercase tracking-wider text-neutral-400">
                    Step {stepNumber} of {totalSteps}
                  </span>
                  <button
                    type="button"
                    onClick={stop}
                    aria-label="Close tour"
                    className="-mr-1 -mt-1 rounded-md p-1 text-neutral-400 transition-colors hover:bg-black/5 hover:text-neutral-700 dark:hover:bg-white/10 dark:hover:text-neutral-200"
                  >
                    <X className="size-4" />
                  </button>
                </div>

                <h3 className="text-[17px] font-semibold leading-snug">{step.title}</h3>
                <p className="mt-2 text-[13.5px] leading-relaxed text-neutral-600 dark:text-neutral-300">
                  {step.body}
                </p>

                <div className="mt-6 flex flex-wrap items-center gap-1.5" aria-hidden>
                  {Array.from({ length: totalSteps }).map((_, i) => (
                    <span
                      key={i}
                      className={`h-1.5 rounded-full transition-all ${
                        i === stepNumber - 1
                          ? "w-4 bg-[var(--color-primary,#1E3A2E)]"
                          : "w-1.5 bg-neutral-300 dark:bg-neutral-600"
                      }`}
                    />
                  ))}
                </div>

                <div className="mt-4 flex items-center justify-between gap-3">
                  {!isLast ? (
                    <button
                      type="button"
                      onClick={stop}
                      className="text-sm text-neutral-400 transition-colors hover:text-neutral-600 dark:hover:text-neutral-200"
                    >
                      Skip tour
                    </button>
                  ) : (
                    <span />
                  )}
                  <div className="flex items-center gap-2">
                    {!isFirst && (
                      <button
                        type="button"
                        onClick={back}
                        className="rounded-lg px-3 py-1.5 text-sm font-medium text-neutral-600 transition-colors hover:bg-black/5 dark:text-neutral-300 dark:hover:bg-white/10"
                      >
                        Back
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={next}
                      className="rounded-lg bg-[var(--color-primary,#1E3A2E)] px-4 py-1.5 text-sm font-semibold text-[var(--color-primary-foreground,#F5F0E5)] transition-opacity hover:opacity-90"
                    >
                      {isLast ? "Finish" : step.clickToAdvance ? "Next chapter →" : "Next"}
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>
        </motion.div>
      </AnimatePresence>
    </div>,
    document.body,
  );
}

type SidePlacement = "top" | "bottom" | "left" | "right";

function placeTooltip(
  rect: Rect,
  w: number,
  h: number,
  pref: TourPlacement,
  vw: number,
  vh: number,
): { top: number; left: number; placement: SidePlacement } {
  const cx = rect.left + rect.width / 2;
  const cy = rect.top + rect.height / 2;

  // Pick a placement, flipping to the side with the most room if the preferred
  // side would overflow the viewport.
  let placement: SidePlacement =
    pref === "auto" || pref === "center" ? "bottom" : pref;

  const fits = {
    right: rect.left + rect.width + GAP + w <= vw - MARGIN,
    left: rect.left - GAP - w >= MARGIN,
    bottom: rect.top + rect.height + GAP + h <= vh - MARGIN,
    top: rect.top - GAP - h >= MARGIN,
  };
  if (!fits[placement]) {
    const fallback = (["right", "bottom", "left", "top"] as SidePlacement[]).find(
      (p) => fits[p],
    );
    if (fallback) placement = fallback;
  }

  let top: number;
  let left: number;
  switch (placement) {
    case "right":
      left = rect.left + rect.width + GAP;
      top = cy - h / 2;
      break;
    case "left":
      left = rect.left - GAP - w;
      top = cy - h / 2;
      break;
    case "top":
      top = rect.top - GAP - h;
      left = cx - w / 2;
      break;
    case "bottom":
    default:
      top = rect.top + rect.height + GAP;
      left = cx - w / 2;
      break;
  }

  // Clamp inside the viewport.
  left = Math.min(Math.max(left, MARGIN), vw - w - MARGIN);
  top = Math.min(Math.max(top, MARGIN), vh - h - MARGIN);
  return { top, left, placement };
}

function Caret({ placement }: { placement: SidePlacement }) {
  const base =
    "absolute size-3 rotate-45 bg-white dark:bg-neutral-900 border-black/5 dark:border-white/10";
  const map: Record<SidePlacement, string> = {
    right: `${base} left-[-6px] top-6 border-l border-b`,
    left: `${base} right-[-6px] top-6 border-t border-r`,
    top: `${base} bottom-[-6px] left-6 border-b border-r`,
    bottom: `${base} top-[-6px] left-6 border-t border-l`,
  };
  return <span aria-hidden className={map[placement]} />;
}
