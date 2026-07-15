"use client";

import { useEffect, useLayoutEffect, useState } from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion } from "framer-motion";
import { X, CircleNotch } from "@phosphor-icons/react";
import { useTour } from "./TourProvider";
import { useDictionary } from "@/lib/i18n/provider";
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
  const t = useDictionary();

  const [rect, setRect] = useState<Rect | null>(null);
  const [notFound, setNotFound] = useState(false);

  // Callback ref, not a plain ref: AnimatePresence swaps step cards from its
  // own internal render, so this component never re-renders on the swap — a
  // passive ref would leave tipSize measured from the *previous* step's card.
  const [tipEl, setTipEl] = useState<HTMLDivElement | null>(null);
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

  // Measure the tooltip so we can position (and clamp) it precisely. Layout
  // size (offsetWidth/Height), not getBoundingClientRect: the entry animation
  // scales the card, and a mid-animation rect under-measures, leaving the card
  // positioned lower than its settled height needs. Re-measures whenever the
  // mounted card changes (step swap) or reflows (ResizeObserver).
  useLayoutEffect(() => {
    if (!tipEl) return;
    const measure = () =>
      setTipSize((prev) =>
        prev &&
        Math.abs(prev.w - tipEl.offsetWidth) < 1 &&
        Math.abs(prev.h - tipEl.offsetHeight) < 1
          ? prev
          : { w: tipEl.offsetWidth, h: tipEl.offsetHeight },
      );
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(tipEl);
    return () => ro.disconnect();
  }, [tipEl]);

  if (typeof document === "undefined" || !step) return null;

  const centered = waiting || !step.target || notFound || !rect;
  const tipW = tipSize?.w ?? TIP_W;
  const tipH = tipSize?.h ?? 200;
  const vw = typeof window !== "undefined" ? window.innerWidth : 1280;
  const vh = typeof window !== "undefined" ? window.innerHeight : 800;

  const pos = centered
    ? { top: vh / 2 - tipH / 2, left: vw / 2 - tipW / 2, placement: "center" as const }
    : placeTooltip(rect as Rect, tipW, tipH, step.placement ?? "auto", vw, vh, step.gap ?? GAP);

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
          ref={setTipEl}
          role="dialog"
          aria-modal="false"
          aria-label={t.tour.steps[step.id]?.title ?? step.title}
          initial={{ opacity: 0, scale: 0.97 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.98 }}
          transition={{ duration: 0.18 }}
          className="pointer-events-auto absolute w-[min(360px,calc(100vw-40px))] rounded-2xl border border-black/5 bg-white text-neutral-900 shadow-[0_12px_40px_rgba(0,0,0,0.22)] dark:border-white/10 dark:bg-neutral-900 dark:text-neutral-50"
          style={{ top: pos.top, left: pos.left }}
        >
          {pos.placement !== "center" && (
            <Caret placement={pos.placement} offset={pos.caret} />
          )}
          <div className="p-6">
            {waiting ? (
              <div className="flex items-center gap-3 py-2">
                <CircleNotch className="size-5 animate-spin text-neutral-400" />
                <p className="text-sm text-neutral-500 dark:text-neutral-400">
                  {t.tour.preparingDemo}
                </p>
              </div>
            ) : (
              <>
                <div className="mb-3 flex items-center justify-between">
                  <span className="text-[11px] font-semibold uppercase tracking-wider text-neutral-400">
                    {t.tour.stepLabel(stepNumber, totalSteps)}
                  </span>
                  <button
                    type="button"
                    onClick={stop}
                    aria-label={t.tour.closeTour}
                    className="-mr-1 -mt-1 rounded-md p-1 text-neutral-400 transition-colors hover:bg-black/5 hover:text-neutral-700 dark:hover:bg-white/10 dark:hover:text-neutral-200"
                  >
                    <X className="size-4" />
                  </button>
                </div>

                <h3 className="text-[17px] font-semibold leading-snug">
                  {t.tour.steps[step.id]?.title ?? step.title}
                </h3>
                <p className="mt-2 text-[13.5px] leading-relaxed text-neutral-600 dark:text-neutral-300">
                  {t.tour.steps[step.id]?.body ?? step.body}
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
                      {t.tour.skipTour}
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
                        {t.tour.back}
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={next}
                      className="rounded-lg bg-[var(--color-primary,#1E3A2E)] px-4 py-1.5 text-sm font-semibold text-[var(--color-primary-foreground,#F5F0E5)] transition-opacity hover:opacity-90"
                    >
                      {isLast ? t.tour.finish : step.clickToAdvance ? t.tour.nextChapter : t.tour.next}
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
  gap: number,
): { top: number; left: number; placement: SidePlacement; caret: number } {
  const cx = rect.left + rect.width / 2;
  const cy = rect.top + rect.height / 2;

  // Pick a placement, flipping to the side with the most room if the preferred
  // side would overflow the viewport.
  let placement: SidePlacement =
    pref === "auto" || pref === "center" ? "bottom" : pref;

  const fits = {
    right: rect.left + rect.width + gap + w <= vw - MARGIN,
    left: rect.left - gap - w >= MARGIN,
    bottom: rect.top + rect.height + gap + h <= vh - MARGIN,
    top: rect.top - gap - h >= MARGIN,
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
      left = rect.left + rect.width + gap;
      top = cy - h / 2;
      break;
    case "left":
      left = rect.left - gap - w;
      top = cy - h / 2;
      break;
    case "top":
      top = rect.top - gap - h;
      left = cx - w / 2;
      break;
    case "bottom":
    default:
      top = rect.top + rect.height + gap;
      left = cx - w / 2;
      break;
  }

  // Clamp inside the viewport.
  left = Math.min(Math.max(left, MARGIN), vw - w - MARGIN);
  top = Math.min(Math.max(top, MARGIN), vh - h - MARGIN);

  // Point the caret at the spotlighted element's centre even after clamping,
  // kept clear of the card's rounded corners.
  const caret =
    placement === "top" || placement === "bottom"
      ? Math.min(Math.max(cx - left, 18), w - 18)
      : Math.min(Math.max(cy - top, 18), h - 18);
  return { top, left, placement, caret };
}

function Caret({ placement, offset }: { placement: SidePlacement; offset: number }) {
  const base =
    "absolute size-3 rotate-45 bg-white dark:bg-neutral-900 border-black/5 dark:border-white/10";
  const map: Record<SidePlacement, string> = {
    right: `${base} left-[-6px] border-l border-b`,
    left: `${base} right-[-6px] border-t border-r`,
    top: `${base} bottom-[-6px] border-b border-r`,
    bottom: `${base} top-[-6px] border-t border-l`,
  };
  const style =
    placement === "top" || placement === "bottom"
      ? { left: offset - 6 }
      : { top: offset - 6 };
  return <span aria-hidden className={map[placement]} style={style} />;
}
