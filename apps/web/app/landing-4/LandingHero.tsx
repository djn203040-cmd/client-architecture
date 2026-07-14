"use client";

import { useEffect, useRef, useState } from "react";
import "./landing4.css";

const TOTAL_FRAMES = 101;
const FRAME_PATH = (i: number) =>
  `/landing-4/frames/frame-${String(i + 1).padStart(4, "0")}.webp`;
const BATCH = 18;
const FRAME_W = 1200;
const FRAME_H = 1490;

/** Scroll progress range mapped onto the frame sequence (holds at both ends). */
const SCRUB_START = 0.06;
const SCRUB_END = 0.88;

export default function LandingHero() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const runwayRef = useRef<HTMLDivElement | null>(null);
  const hintRef = useRef<HTMLDivElement | null>(null);
  const framesRef = useRef<HTMLImageElement[]>([]);
  const currentFrameRef = useRef(0);
  const drawnFrameRef = useRef(-1);
  const [loaded, setLoaded] = useState(0);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const frames: HTMLImageElement[] = new Array(TOTAL_FRAMES);
    framesRef.current = frames;

    const loadFrame = (i: number) =>
      new Promise<void>((resolve) => {
        const img = new Image();
        img.onload = () => {
          frames[i] = img;
          if (!cancelled) setLoaded((n) => n + 1);
          resolve();
        };
        img.onerror = () => resolve();
        img.src = FRAME_PATH(i);
      });

    (async () => {
      for (let i = 0; i < TOTAL_FRAMES; i += BATCH) {
        const batch: Promise<void>[] = [];
        for (let j = i; j < Math.min(i + BATCH, TOTAL_FRAMES); j++) {
          batch.push(loadFrame(j));
        }
        await Promise.all(batch);
        if (cancelled) return;
      }
      if (!cancelled) setReady(true);
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!ready) return;
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;

    canvas.width = FRAME_W;
    canvas.height = FRAME_H;

    const onScroll = () => {
      const runway = runwayRef.current;
      if (!runway) return;
      const rect = runway.getBoundingClientRect();
      const total = rect.height - window.innerHeight;
      const progress = total > 0 ? Math.min(Math.max(-rect.top / total, 0), 1) : 0;
      const t = Math.min(
        Math.max((progress - SCRUB_START) / (SCRUB_END - SCRUB_START), 0),
        1
      );
      currentFrameRef.current = Math.min(
        Math.floor(t * TOTAL_FRAMES),
        TOTAL_FRAMES - 1
      );
      if (hintRef.current) {
        hintRef.current.style.opacity = progress > 0.04 ? "0" : "1";
      }
    };

    let rafId = 0;
    const tick = () => {
      const frame = framesRef.current[currentFrameRef.current];
      if (frame && currentFrameRef.current !== drawnFrameRef.current) {
        // Frames carry alpha now — clear or the previous frame ghosts through.
        ctx.clearRect(0, 0, FRAME_W, FRAME_H);
        ctx.drawImage(frame, 0, 0, FRAME_W, FRAME_H);
        drawnFrameRef.current = currentFrameRef.current;
      }
      rafId = requestAnimationFrame(tick);
    };

    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();
    tick();

    return () => {
      window.removeEventListener("scroll", onScroll);
      cancelAnimationFrame(rafId);
    };
  }, [ready]);

  const pct = Math.round((loaded / TOTAL_FRAMES) * 100);

  return (
    <div className="l4-runway" ref={runwayRef}>
      {!ready && (
        <div className="l4-loader" role="status" aria-live="polite">
          <span className="l4-loader-mark">The Client Architecture</span>
          <span className="l4-loader-pct">{pct}%</span>
          <span className="l4-loader-bar">
            <span className="l4-loader-fill" style={{ width: `${pct}%` }} />
          </span>
        </div>
      )}

      <div className="l4-sticky">
        {/* Giant tone-on-tone headline. Sits UNDER the canvas; the darken
            blend lets it show through the cream while the laptop occludes it. */}
        <div className="l4-ghost" aria-hidden="true">
          <span className="l4-ghost-line">Leads</span>
          <span className="l4-ghost-line l4-ghost-line-2">don&rsquo;t die</span>
        </div>

        <div className="l4-stage">
          <canvas
            ref={canvasRef}
            className="l4-canvas"
            aria-label="A laptop resting on a branch; its interface lifts off the screen as you scroll"
          />
        </div>

        <nav className="l4-nav" aria-label="Landing">
          <span className="l4-wordmark">The Client Architecture</span>
          <a className="l4-nav-cta" href="/login">
            Login
          </a>
        </nav>

        <div className="l4-grid">
          <header className="l4-copy">
            <h1 className="l4-title">
              <span className="l4-title-sr">Leads don&rsquo;t die.</span> They
              get abandoned.
            </h1>
            <p className="l4-sub">
              You already paid for them — the ads, the content, the call
              itself. Then the week gets loud, the follow-up slips, and a yes
              becomes a stranger. We write the follow-up in your voice, wait
              for your nod, and send it from your own inbox. Every call. Every
              time.
            </p>
            <div className="l4-actions">
              <a className="l4-cta" href="#book">
                Book a call
              </a>
              <a className="l4-cta-ghost" href="#promise">
                See the system
              </a>
            </div>
          </header>
        </div>

        <div className="l4-hint" ref={hintRef} aria-hidden="true">
          <span className="l4-hint-line" />
          Scroll
        </div>
      </div>
    </div>
  );
}
