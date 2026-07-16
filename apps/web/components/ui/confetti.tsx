"use client";
import { useEffect, useRef } from "react";

// Warm celebration palette, in line with the product's uplifting (never
// tech-bro) color world.
const COLORS = ["#E8A87C", "#F4C95D", "#D98E73", "#A8C69F", "#E5DCC5", "#C97C5D"];

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  color: string;
  rotation: number;
  spin: number;
  /** 0..1, particles fade out as life approaches 1 */
  life: number;
  decay: number;
}

function spawnBurst(width: number, height: number): Particle[] {
  const particles: Particle[] = [];
  // Two side cannons angled toward the center plus a soft top rain.
  const origins = [
    { x: width * 0.1, y: height * 0.7, angle: -Math.PI / 3, spread: 0.9, count: 60 },
    { x: width * 0.9, y: height * 0.7, angle: (-2 * Math.PI) / 3, spread: 0.9, count: 60 },
    { x: width * 0.5, y: -20, angle: Math.PI / 2, spread: 1.6, count: 40 },
  ];
  for (const o of origins) {
    for (let i = 0; i < o.count; i++) {
      const angle = o.angle + (Math.random() - 0.5) * o.spread;
      const speed = 6 + Math.random() * 9;
      particles.push({
        x: o.x,
        y: o.y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        size: 5 + Math.random() * 6,
        color: COLORS[Math.floor(Math.random() * COLORS.length)]!,
        rotation: Math.random() * Math.PI * 2,
        spin: (Math.random() - 0.5) * 0.3,
        life: 0,
        decay: 0.004 + Math.random() * 0.005,
      });
    }
  }
  return particles;
}

/**
 * One-shot, full-screen confetti burst. Renders nothing (and animates nothing)
 * when the user prefers reduced motion. Cleans itself up when the animation
 * ends or the component unmounts.
 */
export function Confetti() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const resize = () => {
      canvas.width = window.innerWidth * dpr;
      canvas.height = window.innerHeight * dpr;
      canvas.style.width = `${window.innerWidth}px`;
      canvas.style.height = `${window.innerHeight}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    resize();
    window.addEventListener("resize", resize);

    let particles = spawnBurst(window.innerWidth, window.innerHeight);
    let raf = 0;

    const tick = () => {
      ctx.clearRect(0, 0, window.innerWidth, window.innerHeight);
      particles = particles.filter((p) => p.life < 1);
      if (particles.length === 0) {
        return; // finished — leave the canvas blank
      }
      for (const p of particles) {
        p.vy += 0.18; // gravity
        p.vx *= 0.99; // drag
        p.x += p.vx;
        p.y += p.vy;
        p.rotation += p.spin;
        p.life += p.decay;

        ctx.save();
        ctx.globalAlpha = Math.max(0, 1 - p.life);
        ctx.translate(p.x, p.y);
        ctx.rotate(p.rotation);
        ctx.fillStyle = p.color;
        ctx.fillRect(-p.size / 2, -p.size / 4, p.size, p.size / 2);
        ctx.restore();
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", resize);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      aria-hidden
      className="pointer-events-none fixed inset-0 z-[60]"
    />
  );
}
