# Direction A — The Cross-Section

> An architectural cross-section of a **five-floor** building. Each floor is a stage of the system — except the top floor, which holds two stages side-by-side (Calendar Reception on the right, Voice Library on the left). Camera dollies floor-to-floor on scroll, plus one lateral pan across the top floor. **Each station uses a subtly different camera angle** to keep the sequence alive while the building stays consistent.

> **Read [_shared.md](_shared.md) first.** It defines the brand palette, pipeline, GSAP scaffold, and the canonical headline/body copy per station.

> **Style locked:** Photoreal architectural film (Variant 1 from [direction-a-style-variants.md](direction-a-style-variants.md)). All station prompts below already inherit this style — copy them verbatim.

---

## Why this direction

- Strongest brand fit. "The Client Architecture" + Sonorous Digital's "Modern Architect's Office" → a literal architectural elevation answers the brand promise in one image.
- Easiest production. Five static scenes + four vertical dollies + one lateral pan. Higgsfield's most reliable motion vocabulary.
- Strongest comprehension. Spatial memory does the teaching: once a coach sees the whole building, every zoom snaps to a room they already know exists.

---

## Tone & Materials

| Element | Treatment |
|---|---|
| Walls | Cream lime-washed plaster, photographic realism, subtle texture and age |
| Floors | Wide-plank dark forest-stained oak with visible grain, brushed-brass inlay strips between floors |
| Doors | Forest-green painted timber, aged brushed-brass hardware |
| Light | Hard raking golden-hour sun from upper-right (~5:30pm late September), atmospheric haze in the warmest beams |
| Warm accents | Warm tungsten light where lamps and open doors are lit — amber-gold, not specifically orange. The brand burnt-orange #D97A2D only appears later as the DOM CTA button at the end of the scroll. |
| Style references | HOK / Foster + Partners / Bjarke Ingels Group portfolio renders; Roland Halbe photography; Architectural Digest interior editorial |
| Capture format | Photographed as if on Hasselblad medium-format on Kodak Portra 400 film, subtle natural film grain throughout |
| Render mode | Full photorealism — **no** "model photography" or "miniature" language; this is a real building photographed mid-construction with the facade removed |

---

## Master Scene Geometry

The building is a **5-story narrow tall townhouse**, cross-section view, facade peeled away.

- Aspect: 16:9, 2880×1620
- Building occupies center 35% of frame width, fills ~90% of frame height
- Five clearly distinct floors of equal height, each ~1/5 of total building height
- Continuous dark-wood spiral staircase with brass railings up the left side, threading all five floors
- Cream backdrop with subtle vignette, soft realistic contact shadow beneath the building
- Tiny "Sonorous Digital" engraved brass plaque above front door (subtle in the wide shot — pays off in Station 6 when camera lands at ground floor)

**Floor plan (top to bottom):**

| Floor | Name | Function |
|---|---|---|
| 5 (top) | **Calendar Reception + Voice Library** (combined floor — wide) | RIGHT side: brass-framed skylight in roof above with golden-hour light streaming through, forest-green velvet chair angled toward the camera, brass side table, seven brass calendar-provider crests on the back wall. LEFT side: floor-to-ceiling oak bookshelves of leather-bound past correspondence, brushed-brass reading rail, white marble plinth with softly glowing translucent tablet |
| 4 | Drafting Room | Forest-green writing desk; **lit** brass lamp casting warm tungsten pool of light on a draft page; single forest velvet chair |
| 3 | Approval Hall | Three forest-green doors (Dashboard / Slack / WhatsApp); middle door open with warm tungsten glow from the room beyond |
| 2 | Mail Hall | Brass mail-chute wall fixture (vestigial architectural detail); small bench beneath; framed picture opposite |
| Ground | Entrance | Heavy forest-green front door slightly ajar, warm golden-hour light spilling in/out, "Sonorous Digital" plaque above |

---

## Camera angle per station

Same building throughout, but every station uses a slightly different camera angle to keep the sequence alive. This is the *only* aliveness lever in the production — done well, it gives each station its own visual identity without ever cutting away from the building.

| Station | Camera angle | Why |
|---|---|---|
| 1 — Hero (whole building) | Dead-on, symmetrical, eye-level with the middle of the building | Establishing shot — authoritative, portrait-like, the building presented as itself |
| 2 — Calendar Reception (right side of Floor 5) | Slight up-tilt (camera ~10° below the floor, looking up into Floor 5) | Emphasizes the skylight as a point of entry; gives the room scale |
| 3 — Voice Library (left side of Floor 5) | Slight off-axis from the right (~10° rotated), eye-level | Lateral pan ends here off-center; gives the bookshelves depth and the marble plinth presence |
| 4 — Drafting Room (Floor 4) | Tight push-in, closer than other stations, slight tilt down toward the desk | Most intimate moment in the sequence; the lamp + paper fills the frame |
| 5 — Approval Hall (Floor 3) | Slight off-axis from the right (~15° rotated) | The open middle door reads more dramatically with mild perspective foreshortening on the closed doors |
| 6 — Mail Hall + Entrance (bottom two floors) | Slight down-angle from above the doorway, looking down | Final aerial coda — the camera has descended through the whole building and now looks down at the exit |

---

## Master Style Lock

This block is embedded at the top of every Station prompt below. If you re-prompt or iterate, keep this language verbatim — it's what holds the visual consistency across all six stations.

> **STYLE:** Photorealistic architectural photograph in the manner of HOK, Foster + Partners, or Bjarke Ingels Group portfolio renders. Photographed as if on a Hasselblad medium-format camera with Kodak Portra 400 film, subtle natural film grain throughout. Materials rendered with photographic realism: cream lime-washed plaster walls with subtle texture and age, dark forest-green stained oak floorboards with visible grain, thin brushed-brass inlay strips with realistic micro-scratches and patina, forest-green painted timber doors with aged brushed-brass hardware, tall arched windows with real refractive glass. Lighting: hard raking golden-hour sun from upper-right at ~5:30pm late September, casting long warm rectangular light shafts and crisp angular shadows, with realistic atmospheric haze in the warmest beams. No CGI gloss, no stylization.

---

## Six Stations

### Station 1 — Hero. The whole building.

**Teaches:** This is one connected system. Five rooms, one workflow — the top room holding two adjacent stages.
**Copy:** *The follow-up, handled.* / Every sales call deserves a second message. We write it in your voice and wait for your nod.

**Camera:** Dead-on, symmetrical, eye-level with the middle of the building. Establishing shot.

**Nano Banana Pro prompt:**

> **STYLE:** Photorealistic architectural photograph in the manner of HOK, Foster + Partners, or Bjarke Ingels Group portfolio renders. Photographed as if on a Hasselblad medium-format camera with Kodak Portra 400 film, subtle natural film grain throughout. Materials rendered with photographic realism: cream lime-washed plaster walls with subtle texture and age, dark forest-green stained oak floorboards with visible grain, thin brushed-brass inlay strips with realistic micro-scratches and patina, forest-green painted timber doors with aged brushed-brass hardware, tall arched windows with real refractive glass. Lighting: hard raking golden-hour sun from upper-right at ~5:30pm late September, casting long warm rectangular light shafts and crisp angular shadows, with realistic atmospheric haze in the warmest beams. No CGI gloss, no stylization.
>
> **CAMERA:** Dead-on symmetrical view, eye-level with the middle of the building. Authoritative portrait composition.
>
> **SCENE:** Wide architectural cross-section view of a five-story narrow tall townhouse, front facade removed so all five interior floors are visible simultaneously. Building occupies the center 35% of frame width and fills 90% of frame height. Five clearly distinct floors of equal height stacked vertically, each floor approximately 1/5 of total building height. A continuous dark-wood spiral staircase with brass railings threads up the left side, connecting all floors.
>
> Floor 5 (top — Calendar Reception + Voice Library, a single wide room divided into two functional zones): a brass-framed domed glass skylight set into the flat roof above, with a shaft of golden-hour light streaming down through it. LEFT half of Floor 5: floor-to-ceiling oak bookshelves filled with rows of leather-bound books in forest-green and tan tones, a brushed-brass reading rail running across the front of the shelves, and a small white marble plinth holding a softly glowing translucent tablet. RIGHT half of Floor 5: a forest-green velvet armchair angled toward the camera, a brushed-brass side table beside it, and a horizontal row of seven small brushed-brass crests mounted on the back wall (these are the calendar-provider crests).
>
> Floor 4 (Drafting Room): a slender forest-green writing desk centered, a LIT brushed-brass desk lamp casting a warm tungsten pool of light onto a sheet of cream paper on the desk.
>
> Floor 3 (Approval Hall): three identical forest-green panelled doors in a row, each with a small brushed-brass nameplate above. The middle door is slightly ajar with a soft warm tungsten glow spilling out across the dark oak floor.
>
> Floor 2 (Mail Hall): a wide hallway with a brushed-brass mail-chute fixture mounted in the cream wall (a vestigial architectural detail), a small wooden bench beneath it, a framed picture on the opposite wall.
>
> Ground Floor (Entrance): a heavy forest-green front door slightly ajar with warm golden-hour light spilling outward. A small engraved brushed-brass plaque above the door reads "Sonorous Digital" in delicate serif.
>
> Cream backdrop with subtle vignette, soft realistic contact shadow beneath the building. No people, no UI overlays, no text other than the Sonorous Digital plaque. 16:9, 2880×1620.

---

### Station 2 — Calendar Reception. The room is ready.

**Teaches:** When a coach's calendar fires — across any of seven providers — the system is already wired in and waiting.
**Copy:** *A call ends. We hear it.* / The moment a booking closes, the transcript and context land where the system can act on them.

**Camera:** Slight up-tilt — camera positioned roughly 10° below the floor, looking up into Floor 5. Emphasizes the skylight as a point of entry and gives the room a sense of being entered.

**Nano Banana Pro prompt:**

> **STYLE:** Photorealistic architectural photograph in the manner of HOK, Foster + Partners, or Bjarke Ingels Group portfolio renders. Photographed as if on a Hasselblad medium-format camera with Kodak Portra 400 film, subtle natural film grain throughout. Materials rendered with photographic realism: cream lime-washed plaster walls with subtle texture and age, dark forest-green stained oak floorboards with visible grain, thin brushed-brass inlay strips with realistic micro-scratches and patina, tall arched windows with real refractive glass. Lighting: hard raking golden-hour sun from upper-right at ~5:30pm late September, with realistic atmospheric haze in the warmest beams. No CGI gloss, no stylization.
>
> **CAMERA:** Slight up-tilt, ~10° below the floor level looking up into the room. **The whole top floor is in frame** — both the Calendar Reception zone on the right (compositional focus) and the Voice Library zone on the left (ambient context). The skylight is centered above and fully visible. Compositional weight sits on the right two-thirds of the frame via lighting, focal element placement, and the angle of the light shaft.
>
> **SCENE:** Same five-story townhouse as established in Station 1. The camera has dollied UP and IN to frame the entire top floor (Floor 5 — Calendar Reception on the right, Voice Library on the left), seen from a slight upward angle. The brass-framed domed glass skylight set into the flat roof is fully visible above, centered, with the strongest single shaft of golden-hour light pouring down through it at an angle that **lands directly on the forest-green velvet armchair on the right side of the room** — like a stage light marking the spot where something has just happened. The light shaft is the strongest visual hot-spot in the frame and pulls the eye to the right.
>
> RIGHT side of the floor (Calendar Reception zone — the compositional focus): a forest-green velvet armchair angled toward the camera, brightly illuminated by the shaft of light from the skylight; a brushed-brass side table beside it; an empty wooden desk against the right portion of the back wall. Mounted on the right portion of the back wall in a tight horizontal row: seven small brushed-brass shield-shaped crests, each engraved with abstract heraldic emblems — small icons or geometric engravings, NO READABLE TEXT, NO LETTERING (real architectural brass plaques often use just engraved imagery). The seven crests are visibly distinct from each other but the engravings are stylized iconography, not words.
>
> LEFT side of the floor (Voice Library zone — ambient, supporting context): floor-to-ceiling oak bookshelves with leather-bound books in forest-green and tan, slightly in shadow relative to the brightly-lit right side. The bookshelves are clearly visible but not the focal point — they signal that this is the same top floor and that Station 3 will return here.
>
> Realistic atmospheric haze visible in the shaft of light. The exposed cross-section edge of the building is visible on the right side. No people, no UI overlays.
>
> No people, no UI overlays. 16:9, 2880×1620.

**Higgsfield transition prompt (Station 1 → 2):**

> Slow cinematic dolly-in and tilt up toward the top floor of the cross-section building. Camera starts wide and dead-on on the full building, then pushes vertically upward and forward, and rotates to a slight up-tilt (~10° below the floor) as it tightens on the whole top floor — both zones visible, with compositional emphasis on the right-side Calendar Reception zone (the velvet armchair is the lit focal element, the brass crests are sharply lit on the back wall, the left-side bookshelves are present but slightly in shadow). The shaft of golden-hour light through the skylight intensifies subtly as the camera settles. The rest of the building stays still — only the camera moves. Photoreal architectural film tone, golden-hour light unchanged. No subject animation. 4.5 seconds, 24fps, 1080p.

---

### Station 3 — Voice Library.

**Teaches:** The system reads the call transcript AND a library of the coach's past writing. Voice is learned, not invented.
**Copy:** *Your voice, on file.* / Past emails, voice notes, real correspondence — studied, structured, ready to draw from.

**Camera:** Slight off-axis rotation from the right (~10°), eye-level. The lateral pan from Station 2 ends here off-center, giving the bookshelves depth and the marble plinth presence.

> **Note:** Station 3 stays on the same top floor as Station 2. The camera pans **laterally from right to left** across Floor 5, leaving the Calendar Reception zone and arriving at the Voice Library zone on the left, settling at a slight angled view rather than dead-on. This is the only lateral move in the entire sequence.

**Nano Banana Pro prompt:**

> **STYLE:** Photorealistic architectural photograph in the manner of HOK, Foster + Partners, or Bjarke Ingels Group portfolio renders. Photographed as if on a Hasselblad medium-format camera with Kodak Portra 400 film, subtle natural film grain throughout. Materials rendered with photographic realism: cream lime-washed plaster walls with subtle texture and age, dark forest-green stained oak floorboards with visible grain, thin brushed-brass inlay strips with realistic micro-scratches and patina, tall arched windows with real refractive glass. Lighting: hard raking golden-hour sun from upper-right at ~5:30pm late September, with realistic atmospheric haze in the warmest beams. No CGI gloss, no stylization.
>
> **CAMERA:** Slight off-axis rotation from the right (~10°), eye-level. The room is seen at a mild angle rather than dead-on, so the bookshelves recede slightly in perspective into the back-left of the frame.
>
> **SCENE:** Same five-story townhouse as established in Station 1, same top floor (Floor 5) as Station 2 — but the camera has now panned laterally from right to left to frame the LEFT half of the top floor (the Voice Library zone), and settled at a slight angled view rather than dead-on.
>
> Back wall: floor-to-ceiling oak shelves filled with neat rows of leather-bound books and folders in forest-green and tan tones, illegible spine text, slightly varied heights. A continuous brushed-brass reading rail runs along the front of the shelves at chest height. In the foreground center: a freestanding white marble plinth (a single solid block, ~80cm tall) holding a thin glowing translucent glass tablet, slightly tilted toward the camera. The tablet emits a soft warm tungsten glow from within — gentle, like a slowly-pulsing reading lamp.
>
> At the FAR RIGHT edge of the frame, partially visible: the seven brass calendar-provider crests on the back wall and a hint of the forest-green velvet armchair — this signals that this is the same top floor as Station 2, just viewed from the opposite side.
>
> Two hard shafts of late-afternoon golden-hour light pour through a tall arched window on the right of the building, raking across the floor and the tablet. Realistic atmospheric haze visible in the beams. The exposed cross-section edge of the building is visible on the left, with the spiral staircase descending past the floor in the background.
>
> No people, no UI overlays. 16:9, 2880×1620.

**Higgsfield transition prompt (Station 2 → 3):**

> Smooth cinematic lateral pan from right to left across the top floor of the cross-section building. Camera stays at approximately the same vertical position, sliding horizontally and rotating from the up-tilted Station 2 angle into a slight off-axis-right view, so the Calendar Reception zone exits the right edge of the frame and the Voice Library zone (oak bookshelves and central marble plinth) comes into frame from the left. As the camera settles on the Voice Library, the warm glow of the tablet on the marble plinth pulses once, very subtly. Smooth photoreal architectural film motion, golden-hour light unchanged, no jitter. 4.5 seconds, 24fps, 1080p.

---

### Station 4 — Drafting Room.

**Teaches:** The AI composes one message. The brass lamp metaphor: focused, considered, single output — not a content firehose.
**Copy:** *A draft, exactly as you'd write.* / Claude composes the follow-up. The first line sounds like the last email you sent.

**Camera:** Tight push-in, closer than other stations, slight tilt down toward the desk. Most intimate moment in the sequence — the lamp + paper fills the frame.

**Nano Banana Pro prompt:**

> **STYLE:** Photorealistic architectural photograph in the manner of HOK, Foster + Partners, or Bjarke Ingels Group portfolio renders. Photographed as if on a Hasselblad medium-format camera with Kodak Portra 400 film, subtle natural film grain throughout. Materials rendered with photographic realism: cream lime-washed plaster walls with subtle texture and age, dark forest-green stained oak floorboards with visible grain, thin brushed-brass inlay strips with realistic micro-scratches and patina, tall arched windows with real refractive glass. Lighting: hard raking golden-hour sun from upper-right at ~5:30pm late September, with realistic atmospheric haze in the warmest beams. No CGI gloss, no stylization.
>
> **CAMERA:** Tight push-in, closer than the wider station shots, with a subtle tilt down toward the desk. The desk and lamp fill roughly 50% of the frame; the surrounding floor is closer to camera and more intimate. The cross-section edges of the building are less visible at this framing — almost an interior medium shot, but still framed through the missing facade.
>
> **SCENE:** Same five-story townhouse as established in Station 1, but the camera has dollied down and pushed in to frame only Floor 4 — the Drafting Room — at an intimate medium-close distance. Cream lime-washed plaster walls, dark forest-green stained oak floor with visible grain.
>
> Centered in the room: a slender forest-green writing desk, ~120cm wide, with brushed-brass legs. On the desk lies a single sheet of cream paper — half-filled with hand-written cursive ink script, illegible at this resolution but clearly real handwriting with varied ink density and a few crossings-out. A LIT brushed-brass desk lamp arches over the page, casting a focused warm tungsten pool of light onto the paper — the lamp's warm glow is the brightest light source in the frame.
>
> Behind the desk: a tall arched window with the late-afternoon golden-hour sun directly visible through it, hazy and warm with realistic atmospheric particles. A single forest-green velvet chair is pulled slightly back from the desk, empty, as if its occupant has just stood up. To one side of the desk: a small stack of three leather-bound notebooks, closed, neat. The exposed cross-section edge of the building is barely visible at the far left, with the spiral staircase descending past the floor in the background.
>
> Mood: contemplative, focused, monastic. No people, no UI overlays. 16:9, 2880×1620.

**Higgsfield transition prompt (Station 3 → 4):**

> Continuous cinematic dolly downward and forward, descending one floor from the top floor (Voice Library zone) to Floor 4 (Drafting Room), and pushing CLOSER to the building than previous stations. The Voice Library shelves and marble plinth exit the top of the frame; the drafting room with the brass lamp and writing desk resolves into the center, larger and more intimate than the previous wider views. As the camera settles, the brass lamp turns on — a soft warm tungsten glow blooms gradually over the paper on the desk. No other animation. Photoreal architectural film tone, golden-hour light unchanged. 4.5 seconds, 24fps, 1080p.

---

### Station 5 — Approval Hall.

**Teaches:** Coach controls the send. Three channels they already use. The open door = the one they chose.
**Copy:** *You stay the human.* / Approve from your dashboard, your Slack, or a WhatsApp tap. Never an inbox you don't know.

**Camera:** Slight off-axis rotation from the right (~15°), eye-level. The three doors recede slightly in perspective so the open middle door reads dramatically.

**Nano Banana Pro prompt:**

> **STYLE:** Photorealistic architectural photograph in the manner of HOK, Foster + Partners, or Bjarke Ingels Group portfolio renders. Photographed as if on a Hasselblad medium-format camera with Kodak Portra 400 film, subtle natural film grain throughout. Materials rendered with photographic realism: cream lime-washed plaster walls with subtle texture and age, dark forest-green stained oak floorboards with visible grain, thin brushed-brass inlay strips with realistic micro-scratches and patina, forest-green painted timber doors with aged brushed-brass hardware, tall arched windows with real refractive glass. Lighting: hard raking golden-hour sun from upper-right at ~5:30pm late September, with realistic atmospheric haze in the warmest beams. No CGI gloss, no stylization.
>
> **CAMERA:** Slight off-axis rotation from the right (~15°), eye-level. The row of three doors is seen at a mild perspective angle so the leftmost door is slightly larger in frame and the rightmost door is slightly smaller — gentle foreshortening that makes the open middle door read dramatically.
>
> **SCENE:** Same five-story townhouse as established in Station 1, but the camera has dollied down to frame only Floor 3 — the Approval Hall — at a slight angle from the right. A wide hallway with cream lime-washed plaster walls, dark forest-green stained oak floor with visible grain.
>
> Across the back wall: three identical forest-green panelled timber doors in a row, evenly spaced. Each door has a small brushed-brass nameplate mounted above it, engraved in elegant fine serif: "DASHBOARD" (left), "SLACK" (middle), "WHATSAPP" (right). The middle door (SLACK) stands fully open, swung inward, revealing a soft warm tungsten glow emanating from the room beyond and spilling out into the hallway — casting a warm rectangular pool of light across the dark oak floor. The other two doors are closed.
>
> A thin brushed-brass picture rail runs along the cream plaster wall above the doors. Hard raking late-afternoon golden-hour sun streams through a tall arched window on the right, casting long diagonal shadows that intersect with the warm rectangle of tungsten light from the open door. Realistic atmospheric haze in the brightest beams. The exposed cross-section edge of the building is visible on the left, with the spiral staircase descending past the floor in the background.
>
> Mood: calm, decisive — a choice was just made. No people, no UI overlays. 16:9, 2880×1620.

**Higgsfield transition prompt (Station 4 → 5):**

> Continuous cinematic dolly downward and outward to the next floor of the cross-section building. The drafting room exits the top of the frame; the camera pulls back slightly to a more standard distance and rotates to a slight off-axis-right view as the three-door hallway resolves into view. As the camera settles, the middle door slowly swings open, and a soft warm tungsten glow blooms outward across the hallway floor. The other two doors remain closed and still. Photoreal architectural film tone, golden-hour light unchanged. 4.5 seconds, 24fps, 1080p.

---

### Station 6 — The Send.

**Teaches:** The message leaves from the coach's own Gmail, lands warm, and the system reports the open. Closes the loop.
**Copy:** *Sent from you. Read by them.* / The message leaves your Gmail, lands warm, and we tell you the moment it's opened.

**Camera:** Slight down-angle from above the doorway, looking down at the bottom two floors. Final aerial coda — the camera has descended through the whole building and now looks down at the exit.

**Nano Banana Pro prompt:**

> **STYLE:** Photorealistic architectural photograph in the manner of HOK, Foster + Partners, or Bjarke Ingels Group portfolio renders. Photographed as if on a Hasselblad medium-format camera with Kodak Portra 400 film, subtle natural film grain throughout. Materials rendered with photographic realism: cream lime-washed plaster walls with subtle texture and age, dark forest-green stained oak floorboards with visible grain, thin brushed-brass inlay strips with realistic micro-scratches and patina, forest-green painted timber doors with aged brushed-brass hardware, tall arched windows with real refractive glass. Lighting: hard raking golden-hour sun from upper-right at ~5:30pm late September, with realistic atmospheric haze in the warmest beams. No CGI gloss, no stylization.
>
> **CAMERA:** Slight down-angle from above the doorway, looking down at the bottom two floors. The horizon line is tilted ~10° down from horizontal, so the brass plaque and door appear in the lower-center of the frame and the camera feels like it has just arrived at the bottom of the building from above.
>
> **SCENE:** Same five-story townhouse as established in Station 1, but the camera has dollied down to frame the bottom two floors together — Floor 2 (Mail Hall) and the Ground Floor (Entrance) — both visible in the same composition, seen from a slight downward angle.
>
> Floor 2 (upper portion of frame): a wide hallway with cream lime-washed walls and dark forest-green stained oak floor. Mounted in the cream wall: a brushed-brass mail-chute fixture (a vestigial architectural detail with a hinged brass flap, closed). A small wooden bench beneath the chute; a framed picture on the opposite wall, the glass catching a glint of the golden-hour light.
>
> Ground Floor (lower portion of frame, the focal area): an entrance hall with cream walls and forest-green oak floor. A heavy forest-green panelled front door stands open, hinged outward, with warm late-afternoon golden-hour light flooding in from outside (the world beyond visible as a soft warm blur of golden light and atmospheric haze). The shaft of incoming light casts a long warm rectangle across the dark oak floor of the entrance. Above the open door, clearly legible at this framing: a small engraved brushed-brass plaque reading "Sonorous Digital" in delicate serif.
>
> The exposed cross-section edge of the building is visible on the left, with the spiral staircase descending past both floors and meeting the ground floor near the door. 16:9, 2880×1620. No people, no UI overlays.

**Higgsfield transition prompt (Station 5 → 6):**

> Continuous final cinematic dolly downward and a gentle rotation to a slight down-angle. The hallway with three doors exits the top of the frame; the camera descends past the Mail Hall and settles into a position slightly above and looking down at the bottom of the building, framing the Mail Hall (upper portion) and the Ground Floor Entrance (lower portion) together. As the camera settles, the heavy front door slowly swings open further, allowing more golden-hour light to flood into the entrance hall — the rectangle of warm light on the floor grows brighter and longer. The brass plaque above the door is clearly legible in the final frame. Photoreal architectural film tone, golden-hour light unchanged. 5 seconds, 24fps, 1080p.

---

## GSAP Notes (direction-specific)

- **Camera continuity is the magic.** The dolly never cuts. Audit your concatenated master video by scrubbing manually — any visible seam between two Higgsfield clips will read as a cheap cut. The new per-station angle variation increases this risk; the camera position must rotate smoothly between angles rather than snapping.
- **The Station 2→3 pan is your trickiest seam.** Every other transition is a vertical dolly downward — but Station 2→3 is a lateral pan across the same floor. Make sure the bookshelves visible at the left edge of Station 2 match the right edge of Station 3 — these are the "seam" markers that prove it's one continuous floor.
- **Snap each station to a viewport-pinned moment.** Use `ScrollTrigger.snap` with `snapTo: [0, 0.2, 0.4, 0.6, 0.8, 1]` to give each station a "moment of rest" as the user scrolls.
- **Brass inlay parallax (optional polish).** The thin brushed-brass strips between floors can be re-rendered as a thin DOM `<div>` overlay synced to scroll for extra-crisp edges — Higgsfield slightly softens thin lines. Worth it on retina.
- **Final station hold + CTA.** When the front door has swung fully open in Station 6, GSAP triggers a CTA button (`#cta-book`) to fade in below the video, styled in burnt orange `--accent`. This is the *only* burnt-orange element in the entire experience and reads as a single deliberate punctuation — the rest of the video lives in forest/cream/brass/warm-tungsten.

---

## Production Checklist

- [ ] Generate Station 1 hero first; lock it as the **master building reference image**
- [ ] For Stations 2–6, upload Station 1 as the reference image to Nano Banana Pro AND include "same five-story townhouse as established in Station 1" in every prompt (already baked into the prompts above)
- [ ] Manually verify the **same building** appears in all 6 (consistency is the #1 failure mode — same window placement, same staircase, same proportions, same combined top floor layout)
- [ ] **Verify each station's camera angle is distinct** — if all six come back at the same dead-on angle, the prompts need stronger camera language. The angle variation is what keeps the sequence alive.
- [ ] Run 5 Higgsfield transitions, 4.5s each (final one 5s). The 2→3 lateral pan and the camera rotations between angle changes are the highest-risk clips — audit them twice.
- [ ] Spot-check seams between clips (frame N of clip k vs frame 0 of clip k+1)
- [ ] ffmpeg concat + encode (H.264 + VP9)
- [ ] Build `LandingHero.tsx` with the GSAP scaffold from `_shared.md`
- [ ] Wire the final burnt-orange CTA so it's the *only* burnt-orange element on the page
- [ ] Run `/impeccable audit` on the assembled landing
- [ ] Mobile static fallback (6 stills + copy stacked)
- [ ] Lighthouse mobile ≥ 90 perf
- [ ] Safari iOS scrubbing smoke test (this **will** be the one that breaks)

---

## Estimated Effort

- Image generation + iteration: 4–6 hours (mostly re-rolling for building consistency)
- Higgsfield clips + concat: 2–3 hours (lateral 2→3 pan and angle rotations add ~45 min)
- GSAP/Next.js integration: 4–6 hours
- Mobile + a11y + polish: 3 hours
- **Total: ~2 working days**
