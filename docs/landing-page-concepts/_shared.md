# Landing Page — Shared Production Notes

These notes apply to all four direction docs (A, B, C, D). Read this first.

---

## Brand Anchor (do not violate)

From `apps/web/app/globals.css` (commit `c3e8a3e`):

| Token | Hex | Use |
|---|---|---|
| Deep forest | `#1E3A2E` | Primary surfaces, structural elements, type |
| Light forest | `#4A7D5E` | Soft/active accents, hover states |
| Burnt orange | `#D97A2D` | **Sparing emphasis only** — single CTA, single highlight per scene |
| Cream | `#F4EFE6` | Light-mode background, paper, warm walls |
| Near-black | `#0B0B0B` | Dark-mode background |
| Charcoal surface | `#161616` | Dark-mode card/surface |

**Rules every direction inherits:**
- No neon green, no dark purple, no chrome-tech-bro blue.
- Burnt orange appears at most **once per station** (the message, the door that opens, the notification — the "active" element).
- Forest is structural. Cream/black is the canvas. Orange is the heartbeat.

---

## Production Pipeline

```
Nano Banana Pro (stills)  →  Higgsfield (per-segment video)  →  ffmpeg concat  →  GSAP scrub
       6 keyframes               5 transitions (~4–5s each)        ~22–25s master       scroll-tied currentTime
```

### Step 1 — Generate keyframes (Nano Banana Pro)
- One hero still per station = **6 stills per direction**.
- Render at **2880 × 1620** (3K, 16:9). Higgsfield upscales poorly; start sharp.
- Keep the same camera focal length & lighting across stations of one direction — Higgsfield interpolates much cleaner when stills share visual DNA.

### Step 2 — Animate transitions (Higgsfield)
- One clip per transition (Station N → Station N+1) = **5 clips per direction**.
- Target **4.5 s per clip**, 24 fps, 1080p output (we'll display at 1440 max, video doesn't need to be 4K).
- Use Higgsfield's "First & Last Frame" mode where available — feed both stills. Where it forces single-image input, use Station N as the start frame and describe the destination in the motion prompt.
- Camera moves only. Avoid subject animation (no walking people, no morphing objects). Higgsfield is unreliable with character motion; rock-solid with dolly/push/tilt/orbit.

### Step 3 — Concat to master
```bash
ffmpeg -f concat -i clips.txt -c copy master.mp4
# clips.txt lists each .mp4 in order
```
Strip audio. Re-encode with `-c:v libx264 -preset slow -crf 20 -pix_fmt yuv420p -movflags +faststart` for web. Also export a `.webm` (VP9) for ~40% smaller delivery. Target master < **6 MB**.

### Step 4 — GSAP scroll integration
Pattern (one master video, scrubbed by scroll):

```tsx
// LandingHero.tsx — sketch only
useGSAP(() => {
  const video = videoRef.current!;
  video.pause();

  // Snap timestamps per station (seconds into master video)
  const stations = [0.0, 4.5, 9.0, 13.5, 18.0, 22.5];

  ScrollTrigger.create({
    trigger: scrollerRef.current,
    start: "top top",
    end: "+=600%",        // 6 viewport heights of scroll
    scrub: 0.6,           // 600ms catch-up — feels premium, not laggy
    pin: true,
    onUpdate: (self) => {
      const t = self.progress * video.duration;
      video.currentTime = t;
    },
  });

  // Per-station text overlays — fade in/out at each snap point
  stations.forEach((sec, i) => {
    gsap.fromTo(`#station-${i}`,
      { autoAlpha: 0, y: 24 },
      {
        autoAlpha: 1, y: 0,
        scrollTrigger: {
          trigger: scrollerRef.current,
          start: `${(i / 5) * 100}% top`,
          end:   `${((i + 0.6) / 5) * 100}% top`,
          scrub: true,
        },
      }
    );
  });
});
```

**Critical:** `video.currentTime` scrubbing requires `preload="auto"` + the video must be served with `Accept-Ranges: bytes` (Vercel does this for `/public/` by default). Test on Safari iOS — it's the canary.

---

## Mobile Fallback

Scroll-scrubbed video is rough on low-end mobile. Detect with `matchMedia("(max-width: 768px)")` and serve a **static stacked version**: each station as a single still + headline + body, top-to-bottom scroll. Same six stations, no video, fully readable. This is also your SEO version.

---

## Accessibility

- `prefers-reduced-motion: reduce` → serve the mobile static fallback even on desktop.
- All station headlines + body copy must be present in the DOM as real `<h2>`/`<p>` (not baked into the video). The video is decorative; the words are content.
- `<video>` element must have `aria-hidden="true"` and `<track kind="descriptions">` is not required since copy is in DOM.

---

## Copy Voice (all directions share)

Per `CLAUDE.md`:
- Premium throughout. No placeholder voice.
- Short. Confident. No "AI-powered" / "supercharge" / "unlock" language.
- Each station copy = one **headline** (≤7 words) + one **body line** (≤22 words). No bullets in-scene.

Worked example (used in all four directions for consistency):

| # | Headline | Body |
|---|---|---|
| 1 | The follow-up, handled. | Every sales call deserves a second message. We write it in your voice and wait for your nod. |
| 2 | A call ends. We hear it. | The moment a booking closes, the transcript and context land where the system can act on them. |
| 3 | Your voice, on file. | Past emails, voice notes, real correspondence — studied, structured, ready to draw from. |
| 4 | A draft, exactly as you'd write. | Claude composes the follow-up. The first line sounds like the last email you sent. |
| 5 | You stay the human. | Approve from your dashboard, your Slack, or a WhatsApp tap. Never an inbox you don't know. |
| 6 | Sent from you. Read by them. | The message leaves your Gmail, lands warm, and we tell you the moment it's opened. |

Each direction may swap a headline if the metaphor demands it, but the **meaning at each station is fixed**.
