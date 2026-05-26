# Direction C — The Journey of One Letter

> A single envelope is the subject. The user scrolls and time **runs backward** — the camera tracks the message's life in reverse, from the moment it was sealed to the moment a sales call ended. The coach finishes a call, exhales. That's the punchline.

> **Read [_shared.md](_shared.md) first.** It defines the brand palette, pipeline, GSAP scaffold, and the canonical headline/body copy per station.

---

## Why this direction

- Most cinematic, most emotional. Premium-magazine-cover feel.
- Strongest narrative comprehension. People remember stories, not architecture diagrams.
- The reverse-time trick is the hook. Coaches haven't seen it from a SaaS site before.

**Tradeoff:** Hardest to produce. Higgsfield doesn't natively render time-reversed motion well — we'll need to generate forward and play in reverse with GSAP, which works for camera moves but fails for any motion that's directional (smoke, falling objects, a closing seal). Plan the prompts to be **reversible** — i.e., motion that looks plausible played either direction.

---

## Tone & Materials

| Element | Treatment |
|---|---|
| Aesthetic | Editorial cinema. Think Wim Wenders + Apple Vision Pro keynote + Aesop catalog. |
| Color grade | Cream highlights, deep forest shadows, burnt orange only on the **envelope itself** (the recurring subject) |
| Depth of field | Shallow throughout. f/1.8 feel. The envelope is always the focus pull |
| Motion | Slow, deliberate. Floating, not falling |
| Background | Each station has a different soft warm environment, but lighting palette stays consistent — late afternoon, golden-hour, raking light |
| Style reference | Cinematography of Roger Deakins for the lighting × A24 production design for the spaces × Phaidon photography books for the framing |

---

## Master Subject

A single **burnt-orange wax-sealed envelope**, cream paper, addressed in fine forest-green ink handwriting (illegible at scale). It is the only constant across all six stations. The world around it changes; it does not.

---

## Six Stations (presented in **scroll order**, which is the **reverse of story-time**)

### Station 1 — Hero. The envelope, floating.

**Story-time:** the moment after the email was sent.
**Teaches:** This is one specific message. Not a campaign. Not a blast. One letter, hand-handled.
**Copy:** *One follow-up. Yours.* / Every coaching call deserves a second message. This is the story of one of them.

**Nano Banana Pro prompt:**
> Editorial cinema-style close-up of a single envelope floating in mid-air, slowly rotating. The envelope is cream paper, addressed on the front in fine forest-green ink handwriting (calligraphic, illegible at this distance but clearly handwritten). The flap is sealed with a circular burnt-orange wax seal, the wax glossy and catching light, embossed with a tiny "SD" monogram. The envelope is centered in the frame, tilted at ~12 degrees, occupying ~30% of frame height. Background is a soft out-of-focus warm interior — golden-hour light coming from frame-right, suggesting late afternoon, suggesting a quiet study or home office at the end of a workday. Shallow depth of field, f/1.8 feel — only the envelope is in sharp focus, everything else is a creamy bokeh of warm tones (cream, dusty rose, deep forest shadow). Single soft fill light from above-left. Film grain subtle but present. No people in shot. 16:9, 2880x1620.

---

### Station 2 — The Approval.

**Story-time:** 10 minutes before send. Coach taps "approve" in Slack.
**Teaches:** The send was triggered by a human gesture. A tap.
**Copy:** *You said yes.* / Ten minutes earlier, a Slack tap. A phone face-down. A choice that took two seconds.

**Nano Banana Pro prompt:**
> Editorial cinema close-up of the same envelope (cream paper, burnt-orange wax seal with SD monogram, forest-green handwriting on the front). The envelope now rests on the surface of a warm forest-green velvet couch cushion, slightly tilted. Beside the envelope, a phone lies screen-up at the edge of the cushion. On the phone screen: a single Slack-style notification card visible, with a soft burnt-orange "Approve" button glowing as if just tapped. The card's text is intentionally blurred / out of focus — only the layout and the orange button read clearly. Late-afternoon golden light rakes across the scene from a tall window to the right, creating warm highlights and deep forest-tone shadows. Shallow depth of field — the envelope is in focus, the phone is slightly soft, the room beyond is a creamy bokeh. Subtle film grain. No people. 16:9, 2880x1620.

**Higgsfield transition prompt (Station 1 → 2):**
> Slow cinematic camera move. The envelope (which was floating mid-air in Station 1) gently descends downward and forward, settling onto a forest-green velvet surface that comes into view as the camera tilts down. The phone on the cushion comes into view at the lower right edge of the frame as the envelope finishes settling. The burnt-orange button on the phone screen glows softly. Late-afternoon golden light remains consistent. 4.5 seconds, 24fps, 1080p. **Note:** This clip plays forward — generate as forward motion.

---

### Station 3 — The Draft.

**Story-time:** 24 hours before. The draft sits on a screen, waiting.
**Teaches:** The system gives a 24-hour window. Time to think. Not auto-send.
**Copy:** *Waiting on you.* / A day earlier, the draft surfaced. We always wait. Twenty-four hours, not a second less.

**Nano Banana Pro prompt:**
> Editorial cinema medium-close shot. On a dark forest-stained oak writing desk, a thin matte laptop is open and tilted slightly toward the camera. On its screen: a single elegant email composition view in cream and forest-green tones — the visible portion of the draft is a few lines of cursive-styled text (intentionally illegible, soft focus) with a clear "Draft ready for review" header. Resting flat on the desk next to the laptop: the same cream envelope with the burnt-orange wax seal, as if it represents the draft's eventual physical form. Above the laptop, a small brass desk lamp casts a warm pool of light. Outside the desk's frame, a tall window with golden-hour light streaming in casts long warm rectangles across the wood floor in the background. Shallow depth of field — the laptop screen and envelope are in focus, the lamp is slightly soft, the window light is dreamy bokeh. Film grain present. No people, no hands. 16:9, 2880x1620.

**Higgsfield transition prompt (Station 2 → 3):**
> Cinematic camera lift and tilt. Camera lifts upward from the velvet couch scene and pulls slightly back, the envelope and phone exit the bottom of the frame, and we transition to a wider environment as a writing desk with a laptop comes into view. The envelope reappears in the new composition resting on the desk. Late-afternoon light remains. 4.5 seconds, 24fps, 1080p.

---

### Station 4 — The Voice Library.

**Story-time:** Moments before the draft was generated. The system reads the coach's past letters.
**Teaches:** Voice is not invented. It is studied from real past correspondence.
**Copy:** *Read before written.* / Before composing, we read your last fifteen emails. The voice is not invented. It is recalled.

**Nano Banana Pro prompt:**
> Editorial cinema overhead shot of a dark forest-stained oak desk surface. Spread across the desk in an organized but human way: a stack of opened letters (cream paper, some handwritten, some typed, all illegible at scale — only their forms read). To the side: a small open leather-bound journal with handwritten notes. In the center, slightly tilted: the cream envelope with the burnt-orange wax seal — the SAME envelope as before, now appearing as if pulled from the stack. A small brass magnifying glass rests on one of the open letters. Late-afternoon golden light rakes across the desk from frame-right, the warm wood glowing, deep forest shadows pooling at the edges. Shallow depth of field — the envelope is in tack-sharp focus, surrounding letters fade into soft bokeh. Film grain subtle. No hands, no people. 16:9, 2880x1620.

**Higgsfield transition prompt (Station 3 → 4):**
> Cinematic top-down camera move. Camera tilts from medium angle down to a near-overhead view, dollying forward over the desk. The laptop fades out of frame; a spread of opened letters comes into view across the dark oak desk surface. The envelope remains a constant focal point, slightly repositioning to settle at center frame. Warm rake-light continues from the right. 4.5 seconds, 24fps, 1080p.

---

### Station 5 — The Call Transcript.

**Story-time:** Earlier the same day. A call has just ended. The transcript prints itself onto the page.
**Teaches:** The follow-up is grounded in what was actually said. Not a template.
**Copy:** *Grounded in what you said.* / Earlier that day, a call ended. The transcript was read. The follow-up answers a real conversation.

**Nano Banana Pro prompt:**
> Editorial cinema medium shot. A sheet of cream paper rests on a dark forest-green leather desk pad. Visible on the sheet: lines of dialogue, two speakers indicated by indentation (illegible at scale, but the visual structure of a transcript is unmistakable — short lines, name colons, paragraph breaks). The text is in fine forest-green typewriter-style ink. Beside the page: the cream envelope with burnt-orange wax seal, unsealed and partially open as if just placed. A pair of small wired earbuds coils gently next to a smartphone lying face down. Late-afternoon golden light comes raking from the right. Shallow depth of field — the transcript and envelope are in focus, the earbuds and phone are soft. Film grain present. No hands, no people. 16:9, 2880x1620.

**Higgsfield transition prompt (Station 4 → 5):**
> Cinematic dolly and slight rotation. Camera moves over the desk, the spread of past letters exits the frame to the left, and a new composition resolves: a single transcript page on a green leather pad, the envelope beside it, earbuds and a face-down phone nearby. The envelope remains the visual anchor through the transition. Lighting continues from the right. 4.5 seconds, 24fps, 1080p.

---

### Station 6 — The Call.

**Story-time:** The origin. Moments after a sales call ended.
**Teaches:** This whole machine exists to honor one human moment — the call you just had.
**Copy:** *The moment that started it all.* / This whole system exists for one reason: so the call you just had isn't the last thing that happens.

**Nano Banana Pro prompt:**
> Editorial cinema wide shot of a quiet home office at golden hour, viewed from across the room. Late-afternoon sun streams in horizontally from a tall window on the right, painting the cream walls warm and casting long rectangular shadows on a deep forest-green rug. In the center-left of the frame: a beautiful minimalist desk made of dark forest-stained oak. On the desk, an open laptop with a Zoom-style video call interface visible, showing the "Call ended" state — a single soft confirmation in the center. The coach's chair is empty, slightly pulled back, a hand-knit warm-grey throw draped over its back. On the desk beside the laptop: a half-finished cup of coffee in a cream stoneware mug, a notepad with handwriting, and — placed deliberately at the front of the desk, facing the camera — the cream envelope with the burnt-orange wax seal, the SD monogram clearly visible. No people are in the frame, but the room is unmistakably just-lived-in: the throw still warm from the chair, the coffee still steaming faintly. Shallow but slightly wider depth of field than previous stations — the envelope is in sharp focus, the desk and laptop are softly soft, the window light is dreamy bokeh. Film grain subtle. The mood is the held breath after a good conversation. 16:9, 2880x1620.

**Higgsfield transition prompt (Station 5 → 6):**
> Cinematic pull-back and lift. Camera lifts upward and pulls back smoothly from the close-up of the transcript page, revealing the wider room — desk, chair, laptop, window light — as the environment opens up. The envelope remains visible on the desk as the camera settles into a wider establishing composition. Faint motion in the steam from the coffee mug. No people enter or leave the frame. 5 seconds, 24fps, 1080p.

---

## GSAP Notes (direction-specific)

- **Reverse-time framing is in the COPY, not the motion.** The video itself plays forward through six scenes — it's the headline progression ("ten minutes earlier" → "a day earlier" → "earlier that day" → "the moment that started it all") that does the time-reversal teaching. Critical: do NOT try to literally reverse Higgsfield clips; they'll look uncanny.
- **Envelope position parallax.** The envelope occupies a slightly different region of frame in each station. Use a subtle DOM-element parallax (a thin forest-line marker) that visually points toward the envelope's current position — gives the user something to anchor on as scenes change.
- **Date/time labels.** Above each station's copy, render a small monospace forest-ink timestamp: `T-0:00:00`, `T-0:10:00`, `T-1d:00:00`, `T-1d:00:05`, `T-1d:02:30`, `T-1d:02:31`. This is the time-reversal made literal in chrome.
- **Hold the final station longer.** Snap proportions: 1, 1, 1, 1, 1, 2. The final shot needs to breathe — that's the emotional landing.

---

## Production Checklist

- [ ] Establish the envelope as a **physical prop reference** — generate the envelope alone first, lock its design (wax color, seal monogram, handwriting style, paper texture), then explicitly reference it in every subsequent prompt
- [ ] Verify envelope continuity across all six stills (single biggest risk in this direction — Higgsfield can subtly shift wax seal color or handwriting style)
- [ ] Run 5 Higgsfield transitions
- [ ] ffmpeg concat + encode
- [ ] Color-grade pass — ensure all six stations sit in the same warm key (golden hour from frame-right)
- [ ] Build `LandingHero.tsx` with GSAP scaffold, plus the timestamp parallax
- [ ] Make sure the timestamps `T-…` are accessible text, not images
- [ ] Mobile static fallback (6 stills + timestamps + copy stacked)
- [ ] Run `/impeccable audit`
- [ ] Lighthouse mobile ≥ 90 perf
- [ ] Safari iOS scrubbing smoke test

---

## Estimated Effort

- Envelope prop design + lock-in: 2 hours (this is the load-bearing decision)
- Image generation + iteration for 6 environments with envelope continuity: 7–10 hours
- Higgsfield clips: 3 hours
- Color grading / consistency pass: 2 hours
- GSAP integration with timestamp parallax: 5 hours
- Mobile + a11y + polish: 3 hours
- **Total: ~3.5 working days** (highest cost, highest payoff)
