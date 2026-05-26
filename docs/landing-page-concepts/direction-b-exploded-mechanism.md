# Direction B — The Mechanism

> A precision instrument floating in a dark void. Six mechanically distinct layers, exploded vertically, joined by copper through-rods. As the user scrolls, the camera tours layer-by-layer through the assembly — never re-assembling, just inspecting. Each layer is its own object — a sapphire crystal, a watch movement, a pair of complication plates, a sealed chamber with a glowing jewel, an integrations turret, a signed case-back. **No function labels are rendered on the layers themselves.** The form does the explaining; the DOM carries the headlines.

> **Read [_shared.md](_shared.md) first** for the production pipeline, GSAP scaffold, and the canonical brand palette anchor.

> **This direction overrides the canonical copy table in `_shared.md`** because the watch metaphor demands its own headline set. The *meaning* at each station is the same as Direction A — the *language* is watch-flavored.

---

## Why this direction

- Strongest "real software" answer for technical buyers. A coach's tech-savvy partner asks "is this a real product?" — this direction answers with the visual vocabulary of luxury engineering. No SaaS infographic vibes.
- Easiest production motion. The mechanism never moves; only the camera moves. Higgsfield's #1 strongest mode is camera dolly/orbit over a static photoreal subject — this direction lives entirely in that mode.
- Highest reward for inspection. Each layer is mechanically distinct enough that zooming in shows the viewer something genuinely new — interlocking gears, jeweled pivots, twin engraved plates, a tiny glowing core. The product is the inspection.

---

## Tone & Materials

| Element | Treatment |
|---|---|
| Sapphire crystal (Layer 1) | Polished, slightly milky translucent, brushed-brass rim, engraved hour-marker hairlines |
| Brushed brass | Throughout — plates, bridges, case-back. Warm yellow-gold patina, micro-scratches, no chrome gloss |
| Polished steel | Tiny screws, balance wheel rim, escapement parts. High-contrast catch-light |
| Jewels — forest-green | Pivot jewels inset in movement plate. Tiny, faceted, subtle. **This is where the brand forest green appears in this direction** |
| Jewel — amber | One central glowing stone in the sealed chamber (Layer 4). The "heart" |
| Copper rods | Burnt-orange polished copper, ~2cm diameter, four of them, running vertically through near the outer rim of each layer. **This is where the brand burnt orange appears in this direction** — structural, not decorative |
| Background | Near-black void (`#0B0B0B`). Dark-mode default. **Always render this direction in dark mode regardless of user theme** — the brass and copper depend on it |
| Lighting | Single soft directional studio light from upper-left at ~4000K, subtle warm fill from below, hard sharp shadows beneath each layer |
| Capture format | Photographed as if with a Phase One large-format digital back, macro lens. Sharp, deep, no film grain — this is studio digital macro |
| Style references | Patek Philippe exploded watch diagrams; Vacheron Constantin Métiers d'Art catalogs; Audemars Piguet movement portraits; Apple Watch teardowns; Leica camera exploded views; Dieter Rams Braun gallery |
| Render mode | Full photorealism. No CGI gloss. No marble. No "stacked discs" — these are six distinct precision objects |

---

## Master Object Geometry

A single exploded mechanism floats in a near-black void. Composition is fixed across all six stations — same object, camera moves.

- Aspect: 16:9, 2880×1620
- Object occupies the center 55% of frame width
- Six layers stacked vertically with ~12cm clear vertical gap between each layer
- Four vertical **burnt-orange polished copper rods** (~2cm diameter) run cleanly up through holes near the outer rim of every layer, holding the explosion aligned. The rods are visibly structural, like architecture
- Subtle directional shadow from each layer cast onto the one below

**Layer plan (top to bottom — each one mechanically distinct):**

| # | Object (the form) | Materials | What it teaches (in DOM, not rendered) |
|---|---|---|---|
| 1 | A thin disc of polished sapphire crystal with brushed-brass rim. Faint engraved hour-marker hairlines radiate inward. Slightly milky, with a soft glow from beneath. | Sapphire crystal, brushed brass | The dashboard surface |
| 2 | An exposed watch movement plate. Interlocking gear teeth, a small centered balance wheel with hairspring, brushed-brass bridges, polished steel screws, jeweled pivot points (the jewels are tiny **forest-green** stones — this is the brand's forest accent) | Brushed brass, polished steel, forest-green jewels | The workflow engine |
| 3 | Two thin matched circular plates joined by four tiny burnt-orange copper pins (a "complication module"). Top plate engraved with a tight rectilinear grid pattern; bottom plate engraved with flowing cursive lines. Brushed-brass rims. | Brushed brass, copper pins | The voice model — structured profile + few-shot examples |
| 4 | A smaller enclosed cylindrical chamber, brushed-brass cased, sealed on top with a small crystal lid. A single faintly-glowing **amber jewel** sits at its center — the "heart." A soft warm glow emanates from the chamber and casts subtle warm light on the underside of Layer 3 above | Brushed brass, crystal, amber jewel | Claude composing, sealed |
| 5 | A wider brass plate — larger diameter than the layers above. **Eleven small brass ports** are evenly arranged around its outer rim, each engraved with a tiny abstract icon (clock face, envelope shape, chat bubble, etc. — no readable text). A burnt-orange polished copper ring runs around the rim connecting the ports | Brushed brass, burnt-orange copper | Integrations bus — every connector on one board |
| 6 | The bottom case-back — thicker and more substantial than other layers. Brushed brass with darker patina. Engraved deeply across its top face: "SONOROUS DIGITAL · EST 2026" in a circular serif arrangement. A small brass-and-steel keyhole at dead center | Brushed brass with patina, polished steel | Vault-locked foundation, signed |

---

## Camera angle per station

Same exploded mechanism throughout. The mechanism never moves. The camera moves and reframes per station to inspect each layer in turn.

| Station | Camera | What dominates frame |
|---|---|---|
| 1 — Hero | ~20° downward angle, framed wide enough to see all six layers stacked vertically | The whole exploded instrument |
| 2 — The Face | Push in and rise to the top, slight up-tilt looking up at Layer 1 from just above the layer below | The sapphire crystal disc; you can see the engraved hour-marker hairlines |
| 3 — The Movement | Dolly down to Layer 2, slight downward tilt looking onto the movement's top face | The watch movement — gears, balance wheel, jeweled pivots |
| 4 — The Complication | Move to Layer 3, slight off-axis from the right to show both plates in profile and the copper pins between them | The two paired plates and their distinct engravings |
| 5 — The Heart | Tight close-up on Layer 4, almost macro, with the camera nearly at the crystal lid | The sealed chamber and the glowing amber jewel inside |
| 6 — The Base | Pull back and tilt slightly downward to frame Layers 5 (turret) and 6 (case-back) together at the bottom of the assembly | The integrations turret and the engraved foundation case-back |

---

## Master Style Lock

This block is embedded at the top of every Station prompt below. If you re-prompt or iterate, keep this language verbatim — it's what holds the visual consistency across all six stations.

> **STYLE:** Photorealistic studio product macro photograph in the style of a high-end watchmaker's exploded technical illustration — think Patek Philippe / Vacheron Constantin / Audemars Piguet portfolio photography, crossed with an Apple Watch teardown. Photographed as if with a Phase One large-format digital back and macro lens. Materials rendered with full photographic realism: polished sapphire crystal with realistic refractive depth; brushed brass with subtle warm patina and micro-scratches; polished steel with hard catch-light; tiny faceted jewels with internal sparkle (forest-green pivot jewels in the movement, amber jewel in the sealed chamber); burnt-orange polished copper with realistic reflectance. Near-black void background (#0B0B0B). Single soft directional studio light from upper-left at ~4000K, subtle warm fill from below, hard sharp shadows beneath each layer. No CGI gloss, no painterly stylization, no on-render text labels except the engraved "SONOROUS DIGITAL · EST 2026" maker's mark on the bottom case-back.

---

## Six Stations

### Station 1 — Hero. A precision instrument.

**Teaches:** This is one connected machine, six distinct parts, taken apart for inspection.
**Copy:** *A precision instrument.* / Six layers, one mechanism. The follow-up your coaching practice has been doing in your head — now an actual machine.

**Camera:** ~20° downward angle, framed wide enough to see all six layers stacked vertically. The whole exploded assembly centered, occupying the center 55% of frame width.

**Nano Banana Pro prompt:**

> **STYLE:** Photorealistic studio product macro photograph in the style of a high-end watchmaker's exploded technical illustration — think Patek Philippe / Vacheron Constantin / Audemars Piguet portfolio photography, crossed with an Apple Watch teardown. Photographed as if with a Phase One large-format digital back and macro lens. Materials rendered with full photographic realism: polished sapphire crystal with realistic refractive depth; brushed brass with subtle warm patina and micro-scratches; polished steel with hard catch-light; tiny faceted jewels with internal sparkle; burnt-orange polished copper with realistic reflectance. Near-black void background (#0B0B0B). Single soft directional studio light from upper-left at ~4000K, subtle warm fill from below, hard sharp shadows beneath each layer. No CGI gloss, no painterly stylization, no on-render text labels except the engraved "SONOROUS DIGITAL · EST 2026" maker's mark on the bottom case-back.
>
> **CAMERA:** ~20-degree downward angle, looking down at a moderate angle onto the exploded mechanism. The whole assembly is centered in the frame and occupies roughly the center 55% of frame width.
>
> **SCENE:** A precision instrument exploded vertically, floating in a near-black void. Six mechanically distinct layers stacked top-to-bottom, each separated from the next by approximately 12cm of clear vertical gap. Four vertical burnt-orange polished copper rods (~2cm diameter each) run cleanly upward through aligned holes near the outer rim of every layer, holding the explosion aligned like architectural columns. The layers and their forms (NO on-render text labels except on Layer 6):
>
> Layer 1 (TOP): a thin disc of polished sapphire crystal with a brushed-brass rim, ~20cm diameter, ~1cm thick. Faint engraved hour-marker hairlines radiate inward from the rim. The crystal is slightly milky translucent with a soft glow from beneath suggesting light passes through it.
>
> Layer 2: a brushed-brass watch movement plate, ~22cm diameter, ~2cm thick, displayed with its mechanical face up. Visible across its top face: interlocking gear teeth (a train of three or four gears), a small centered balance wheel with delicate hairspring, brushed-brass bridges connecting jeweled pivot points (the pivot jewels are tiny faceted FOREST-GREEN stones), polished steel screws. Looks like a real watch movement laid open for inspection.
>
> Layer 3: two thin matched circular plates, each ~20cm diameter, ~0.8cm thick, joined together vertically by four tiny burnt-orange copper pins (a "complication module"). Brushed-brass rims on both plates. The top plate is engraved across its top face with a tight rectilinear grid pattern (rows and columns); the bottom plate, visible underneath, is engraved with flowing cursive script-like lines. The two plates are clearly meant to work as a pair.
>
> Layer 4: a smaller enclosed cylindrical chamber, ~14cm diameter, ~3cm thick, cased in brushed brass. Sealed on top with a small disc of crystal that reveals what's inside: a single faintly-glowing AMBER jewel at its center, faceted and emitting a soft warm glow. The glow from this chamber casts a subtle warm wash on the underside of Layer 3 above.
>
> Layer 5: a wider circular brass plate, ~26cm diameter, ~1.5cm thick, brushed brass. Eleven small brass ports are evenly arranged around its outer rim, each port engraved with a different small abstract icon (a clock face, an envelope shape, a chat bubble, a phone icon, etc. — simple geometric icons, NO READABLE TEXT). A continuous burnt-orange polished copper ring runs around the disc connecting all eleven ports.
>
> Layer 6 (BOTTOM): a thick substantial circular case-back, ~26cm diameter, ~4cm thick, brushed brass with a slightly darker warm patina than the layers above. Engraved deeply into its top face in fine serif: "SONOROUS DIGITAL · EST 2026" arranged in a circular ring around the disc's perimeter. A small brass-and-steel keyhole sits at the disc's dead center.
>
> Near-black void background. Single soft directional studio light from upper-left at ~4000K. Subtle warm fill from below to catch the underside of each layer. Hard sharp shadows pooled beneath each layer. The whole assembly reads instantly as "an exquisite precision instrument taken apart for inspection." 16:9, 2880×1620.

---

### Station 2 — The Face.

**Teaches:** What the coach sees is the topmost surface. Glass on top of structure. Everything else lives behind it.
**Copy:** *What you see.* / A clean glass face. The dashboard is the surface — every draft, every approval, every conversation lives here.

**Camera:** Push in and rise to the top of the assembly, slight up-tilt looking up at Layer 1 from just above the height of Layer 2. The sapphire crystal disc dominates the frame (filling ~70% of frame height); only the top portion of Layer 2 (movement) is partially visible at the bottom of the frame.

**Nano Banana Pro prompt:**

> **STYLE:** Photorealistic studio product macro photograph in the style of a high-end watchmaker's exploded technical illustration — think Patek Philippe / Vacheron Constantin / Audemars Piguet portfolio photography, crossed with an Apple Watch teardown. Photographed as if with a Phase One large-format digital back and macro lens. Materials rendered with full photographic realism: polished sapphire crystal with realistic refractive depth; brushed brass with subtle warm patina and micro-scratches; burnt-orange polished copper with realistic reflectance. Near-black void background (#0B0B0B). Single soft directional studio light from upper-left at ~4000K, subtle warm fill from below, hard sharp shadows. No CGI gloss, no painterly stylization, no on-render text labels.
>
> **CAMERA:** Slight up-tilt looking up at Layer 1 from just above Layer 2's height. Camera is much closer to the assembly than in Station 1.
>
> **SCENE:** Same exploded mechanism as established in Station 1, same near-black void, same lighting. Camera has pushed in and risen to inspect the TOP layer — the sapphire crystal disc (Layer 1). The crystal dominates roughly the upper 70% of the frame, viewed from slightly below.
>
> The sapphire crystal disc: ~20cm diameter, ~1cm thick, polished sapphire with realistic refractive depth and the slightly milky translucency of synthetic sapphire. The brushed-brass rim is sharp and visible. Faint engraved hour-marker hairlines radiate inward from the rim across the top face, suggesting the geometry of a watch dial without showing any actual hands or markers — the dial is empty, waiting. A soft glow emanates from underneath the crystal, hinting at what lies below.
>
> The four burnt-orange copper rods rise vertically through aligned holes near the rim of the crystal, extending upward past the top of the frame.
>
> At the bottom 30% of the frame, partially visible: the top face of Layer 2 (the watch movement) — out of focus, just visible enough to anchor the spatial relationship and remind the viewer that there's a whole machine below.
>
> Sharp specular highlights on the brass rim. Near-black void background. 16:9, 2880×1620. No on-render text labels.

**Higgsfield transition prompt (Station 1 → 2):**

> Slow cinematic dolly forward and upward toward the top of the exploded mechanism. Camera starts at the wide ~20° downward establishing angle (Station 1) and pushes smoothly forward and rises, settling at a much closer position with a slight up-tilt looking up at the topmost sapphire crystal disc. The mechanism itself stays perfectly still — only the camera moves. As the camera approaches Layer 1, the soft glow under the crystal intensifies subtly. Photoreal studio product motion, no jitter. 4.5 seconds, 24fps, 1080p.

---

### Station 3 — The Movement.

**Teaches:** Under the dashboard, a real engine runs sequences. Gears, balance wheel, jewels — not magic, mechanism.
**Copy:** *What runs underneath.* / Gears, jewels, escapement. A workflow engine watches your calendar, your inbox, your timers — and decides when the next move belongs.

**Camera:** Dolly down from Layer 1 to Layer 2. Slight downward tilt to look at the movement's top face. The movement plate fills the center of the frame (~60% of frame width). Layer 1 (crystal) is partially visible at the top edge of the frame, slightly out of focus; Layer 3 (paired plates) just visible at the bottom edge.

**Nano Banana Pro prompt:**

> **STYLE:** Photorealistic studio product macro photograph in the style of a high-end watchmaker's exploded technical illustration — think Patek Philippe / Vacheron Constantin / Audemars Piguet portfolio photography. Photographed as if with a Phase One large-format digital back and macro lens. Materials rendered with full photographic realism: brushed brass with subtle warm patina and micro-scratches; polished steel with hard catch-light; tiny faceted forest-green jewels with internal sparkle; burnt-orange polished copper. Near-black void background (#0B0B0B). Single soft directional studio light from upper-left at ~4000K, subtle warm fill from below, hard sharp shadows. No CGI gloss.
>
> **CAMERA:** Slight downward tilt to look onto the movement's top face. Camera is at a similar close distance to Station 2.
>
> **SCENE:** Same exploded mechanism as established in Station 1, same near-black void, same lighting. Camera has dollied down from inspecting Layer 1 to inspect Layer 2 — the watch movement plate. The movement fills the central ~60% of the frame.
>
> The movement plate: a brushed-brass circular plate, ~22cm diameter, ~2cm thick, displayed with its mechanical face fully visible. Across its top face, real horological detail: a train of three to four interlocking gear teeth visible at the edges; a small centered balance wheel with a delicate hairspring coiled around its axis; brushed-brass bridges (the curved support arms) connecting jeweled pivot points. The pivot jewels are tiny faceted FOREST-GREEN stones inset into brass settings — small, jewel-like, internal sparkle. Polished steel screws hold the bridges down, with hard catch-lights on each screw head. Everything reads as a real, working watch movement laid open for inspection. **No text or numbers etched anywhere on the movement.**
>
> The four burnt-orange copper rods rise vertically through aligned holes near the rim of the movement, visible above and below the plate.
>
> At the top edge of the frame, partially visible and slightly out of focus: the underside of Layer 1 (the sapphire crystal). At the bottom edge of the frame, partially visible and slightly out of focus: the top face of Layer 3 (the paired plates). These edges anchor the spatial relationship between the layers.
>
> Sharp specular highlights on every brass and steel surface. Near-black void background. 16:9, 2880×1620. No on-render text labels.

**Higgsfield transition prompt (Station 2 → 3):**

> Continuous cinematic dolly downward through the assembly. Camera descends smoothly from inspecting Layer 1 (sapphire crystal) to inspecting Layer 2 (movement plate), tilting down slightly as it goes so the movement's top face is presented to the camera. The mechanism stays perfectly still — only the camera moves. As the movement resolves into focus, the forest-green jewels catch the light. Photoreal studio motion, no jitter. 4.5 seconds, 24fps, 1080p.

---

### Station 4 — The Complication.

**Teaches:** The voice model is two distinct things — a structured profile AND a library of real examples — pinned together as a working module.
**Copy:** *Two layers of voice.* / A structured profile of how you write, fused to a library of letters you've actually sent. Together, your voice.

**Camera:** Move to Layer 3, slight off-axis rotation from the right (~15°) so both plates of the complication module are visible in profile — you can see the top plate, the bottom plate, and the four copper pins joining them. The module fills roughly the central 65% of the frame.

**Nano Banana Pro prompt:**

> **STYLE:** Photorealistic studio product macro photograph in the style of a high-end watchmaker's exploded technical illustration. Photographed as if with a Phase One large-format digital back and macro lens. Materials rendered with full photographic realism: brushed brass with subtle warm patina and micro-scratches; burnt-orange polished copper with realistic reflectance. Near-black void background (#0B0B0B). Single soft directional studio light from upper-left at ~4000K, subtle warm fill from below, hard sharp shadows. No CGI gloss.
>
> **CAMERA:** Slight off-axis rotation from the right (~15°) so the layer is seen in semi-profile rather than straight on. This reveals both plates of the complication module — the top plate, the bottom plate, and the connecting copper pins between them.
>
> **SCENE:** Same exploded mechanism as established in Station 1, same near-black void, same lighting. Camera has moved to inspect Layer 3 — the complication module — at a slight angled view. The module fills the central ~65% of the frame.
>
> The complication module: two thin matched circular plates, each ~20cm diameter, ~0.8cm thick, with brushed-brass rims. The two plates are stacked vertically with a ~2cm gap between them, joined by four tiny burnt-orange polished copper pins arranged at the corners — like a chronograph module ready to be installed in a movement.
>
> The TOP plate's top face is engraved with a tight rectilinear grid pattern — clean rows and columns of small etched marks (no text, no numbers, just geometric grid). The pattern reads as structured data, a vocabulary index, a profile.
>
> The BOTTOM plate's top face (visible through the gap between the plates) is engraved with flowing cursive script-like lines — looping, freeform, reading as handwritten correspondence (no actual readable text — illegible script, just the visual feel of cursive writing).
>
> The contrast between the two engravings is clear and intentional: order on top, expression on the bottom; the structured profile and the real letters, pinned together by the copper.
>
> The four vertical structural copper rods rise through aligned holes near the rim, visible above and below the module.
>
> At the top and bottom edges of the frame, partially visible and out of focus: the underside of Layer 2 (movement) above, and the top of Layer 4 (sealed chamber) below. These anchor the spatial relationship.
>
> Near-black void background. 16:9, 2880×1620. No on-render text labels.

**Higgsfield transition prompt (Station 3 → 4):**

> Continuous cinematic dolly downward and slight rotation to the right. Camera descends from inspecting Layer 2 (movement) to inspecting Layer 3 (complication module), rotating to a slight off-axis-right view so both plates and the copper pins between them become visible in profile. The mechanism stays perfectly still — only the camera moves. As Layer 3 resolves, the two distinct engravings (grid on top, cursive on bottom) become clearly visible. Photoreal studio motion, no jitter. 4.5 seconds, 24fps, 1080p.

---

### Station 5 — The Heart.

**Teaches:** Claude composes inside one careful chamber, server-side. The model is small, careful, contained — not a feature firehose.
**Copy:** *Sealed and careful.* / Claude composes here, in a single chamber, server-side, one careful draft at a time. Yours.

**Camera:** Tight macro close-up on Layer 4. The chamber and its crystal lid fill the central 75% of the frame. The camera is almost at the level of the crystal lid, slightly above, looking down into the chamber to reveal the glowing amber jewel inside.

**Nano Banana Pro prompt:**

> **STYLE:** Photorealistic studio product macro photograph in the style of a high-end watchmaker's exploded technical illustration. Photographed as if with a Phase One large-format digital back and a true macro lens — this is an extreme close-up. Materials rendered with full photographic realism: brushed brass with subtle warm patina and micro-scratches; polished crystal with realistic refractive depth; a single amber jewel with deep internal facet sparkle and a warm internal glow; burnt-orange polished copper. Near-black void background (#0B0B0B). Single soft directional studio light from upper-left at ~4000K plus a strong warm bounce light from BELOW (rising up from inside the chamber). Hard sharp shadows surround. No CGI gloss.
>
> **CAMERA:** Macro close-up. Camera positioned just above the height of the crystal lid, looking slightly downward into the chamber. The chamber and its lid fill ~75% of the frame.
>
> **SCENE:** Same exploded mechanism as established in Station 1, same near-black void, same upper lighting. Camera has moved in for an extreme close-up on Layer 4 — the sealed chamber.
>
> The sealed chamber: a cylindrical brushed-brass housing, ~14cm diameter, ~3cm thick. Sealed on top with a small clear crystal disc that reveals what's inside. Inside the chamber, centered: a single AMBER faceted jewel — like a cut citrine or yellow sapphire — emitting a soft warm internal glow. The glow is visible THROUGH the crystal lid as a warm pool of light, and also leaks out through the seam between the brass housing and the crystal lid, casting a subtle amber wash upward on the underside of Layer 3 above (partially visible at the top edge of frame, slightly out of focus). Realistic light scatter through the crystal.
>
> The brushed-brass housing of the chamber shows hard sharp specular highlights along its top edge and around the crystal lid's brass setting.
>
> The four burnt-orange structural copper rods rise vertically past the chamber at its perimeter, partially visible at the corners of the frame.
>
> At the very bottom edge of the frame, partially visible: the top face of Layer 5 (the integrations turret) — slightly out of focus.
>
> Near-black void background. 16:9, 2880×1620. No on-render text labels.

**Higgsfield transition prompt (Station 4 → 5):**

> Continuous cinematic dolly forward and downward into an extreme close-up. Camera descends from inspecting Layer 3 to a macro position just above Layer 4's crystal lid. The amber jewel inside the sealed chamber gradually resolves into focus, its warm internal glow intensifying subtly as the camera approaches. The mechanism stays perfectly still — only the camera moves. Photoreal macro studio motion. 4.5 seconds, 24fps, 1080p.

---

### Station 6 — The Base.

**Teaches:** Every integration sits on one bus, and the whole thing rests on a vault-locked foundation. Signed work. Yours.
**Copy:** *Locked, signed, yours.* / Eleven integrations on the bus, sitting on a vault-locked foundation that's yours alone.

**Camera:** Pull back from the macro and tilt slightly downward to frame the BOTTOM TWO LAYERS together — Layer 5 (the integrations turret) and Layer 6 (the case-back foundation). Both fully visible. Layer 4 (sealed chamber) just visible at the top edge of the frame as a spatial anchor.

**Nano Banana Pro prompt:**

> **STYLE:** Photorealistic studio product macro photograph in the style of a high-end watchmaker's exploded technical illustration. Photographed as if with a Phase One large-format digital back and macro lens. Materials rendered with full photographic realism: brushed brass with subtle warm patina and micro-scratches (the case-back has a slightly darker patina than the layers above); polished steel with hard catch-light; burnt-orange polished copper with realistic reflectance. Near-black void background (#0B0B0B). Single soft directional studio light from upper-left at ~4000K, subtle warm fill from below, hard sharp shadows beneath each layer. No CGI gloss.
>
> **CAMERA:** Slight downward tilt to frame the bottom two layers of the assembly together. Camera is at a moderate distance — wider than Station 5's macro, similar to Stations 3–4. Both Layer 5 and Layer 6 are fully visible in the frame, with Layer 5 occupying the upper half and Layer 6 the lower half.
>
> **SCENE:** Same exploded mechanism as established in Station 1, same near-black void, same lighting. Camera has pulled back from the macro chamber view and tilted slightly downward to frame the BOTTOM TWO layers together — Layer 5 (the integrations turret) and Layer 6 (the foundation case-back).
>
> Layer 5 (upper portion of frame — the integrations turret): a wider circular brushed-brass plate, ~26cm diameter, ~1.5cm thick. Around its outer rim are ELEVEN small brass ports arranged evenly — each port is a small recessed brass cylinder, and each is engraved on its visible face with a different small abstract icon: a simple clock face, an envelope shape, a chat bubble, a phone outline, a calendar grid, a paper-plane shape, a chain link, a microphone, a bell, a key, and a node graph. The icons are simple geometric engravings, no readable text. A continuous burnt-orange polished copper ring runs around the disc connecting all eleven ports — like a wiring harness.
>
> Layer 6 (lower portion of frame — the case-back foundation): a thick substantial circular brushed-brass plate, ~26cm diameter, ~4cm thick. The brass has a slightly darker warm patina than the layers above, suggesting heavier mass and older finish. Engraved deeply into its top face, arranged in a circular ring around the disc's perimeter in fine serif: "SONOROUS DIGITAL · EST 2026". At the dead center of the disc: a small brass-and-steel keyhole, the keyhole shape clearly visible, with subtle decorative inlay around it suggesting a vault door.
>
> The four burnt-orange structural copper rods are clearly visible rising from Layer 6 up through Layer 5 and continuing upward past the top of the frame — at this framing the rods read as the architectural columns of the whole assembly.
>
> At the top edge of the frame, partially visible and slightly out of focus: the underside of Layer 4 (the sealed chamber), with a faint warm amber glow emanating from it.
>
> Sharp specular highlights on the brass and copper. Near-black void background. 16:9, 2880×1620. The engraved "SONOROUS DIGITAL · EST 2026" is the ONLY rendered text in the entire image and must be sharp and legible.

**Higgsfield transition prompt (Station 5 → 6):**

> Final cinematic pull-back and slight downward tilt. Camera retreats from the macro view of Layer 4's amber jewel and tilts down to frame the bottom two layers of the assembly together — Layer 5 (integrations turret) and Layer 6 (case-back foundation). As the camera settles into the final composition, the eleven brass ports on Layer 5 catch the light one by one in a soft sequential gleam — like a status check completing. The engraved "SONOROUS DIGITAL · EST 2026" maker's mark on Layer 6 resolves into sharp focus. The mechanism stays perfectly still — only the camera moves. Photoreal studio motion, the camera holds on the final composition for the last 1.5 seconds of the clip. 5.5 seconds, 24fps, 1080p.

---

## GSAP Notes (direction-specific)

- **Always render this direction in dark mode.** Even if the user's theme is light, the landing page should force `data-theme="dark"` over this section. The brass, copper, and amber jewel depend on a near-black void to read properly.
- **The mechanism never moves.** All animation in the master video is camera motion. This is the most production-friendly aspect of this direction — Higgsfield is rock-solid on camera dolly/orbit over a static photoreal subject, and unreliable on subject animation. Do not be tempted to "animate" the layers separating; they are always exploded.
- **Copper rod alignment is the consistency check.** The four burnt-orange rods are the through-line that proves it's the same object across all six stations. If any clip seam shifts the rod x-coordinates by more than 5px, the illusion of "one object, one camera move" breaks. Audit by overlaying frame 0 of each clip on a fixed background and checking rod positions.
- **DOM headlines align with the visible layer.** When the user is on Station 3 (The Movement), the on-screen headline "What runs underneath" should be DOM text positioned to the right of where the movement is in frame — not baked into the video. This gives crisp typography and screen-reader access. Animate each headline in as the camera settles on its layer.
- **Final CTA composition.** After Station 6, GSAP fades in a CTA button (`#cta-book`) styled in brushed-brass with a burnt-orange ring, visually aligned with the copper ring on Layer 5 — it reads as "your ports are now wired, this is your live integration board."

---

## Production Checklist

- [ ] Render Station 1 hero first; lock it as the **master object reference**
- [ ] Verify the master reference shows ALL SIX layers as mechanically distinct (sapphire crystal, movement, paired plates, sealed chamber, port turret, case-back) — if any two layers look similar, re-roll
- [ ] Verify FOUR copper rods are clearly visible threading through all layers (this is the #1 consistency check across stations)
- [ ] Verify NO on-render text labels anywhere except the "SONOROUS DIGITAL · EST 2026" engraving on the case-back
- [ ] For Stations 2–6, upload Station 1 as reference image AND include "same exploded mechanism as established in Station 1" in every prompt (already baked in above)
- [ ] Audit copper rod x-coordinates across clip seams during concat
- [ ] Run 5 Higgsfield transitions, 4.5s each (final one 5.5s with a hold)
- [ ] ffmpeg concat + encode (H.264 + VP9), strip audio
- [ ] Build `LandingHeroB.tsx` with the GSAP scaffold from `_shared.md`, force-dark-mode wrapper
- [ ] Wire DOM headlines to align spatially with the visible layer per scroll position
- [ ] Final CTA: brushed-brass button with burnt-orange ring, visually aligned with Layer 5's copper ring
- [ ] Run `/impeccable audit`
- [ ] Mobile static fallback (6 stills + copy stacked, force-dark)
- [ ] Lighthouse mobile ≥ 90 perf
- [ ] Safari iOS scrubbing smoke test

---

## Estimated Effort

- Station 1 hero generation + lock-in (highest cost, most critical): 3–5 hours
- Stations 2–6 generation (reference-driven, easier once hero is locked): 4–6 hours
- Higgsfield clips + copper-rod alignment audit: 3 hours
- GSAP/Next.js integration with force-dark wrapper + DOM headlines: 5 hours
- Mobile + a11y + polish: 3 hours
- **Total: ~2.5 working days**
