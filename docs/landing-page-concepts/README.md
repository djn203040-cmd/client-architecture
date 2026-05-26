# Landing Page Concepts — The Client Architecture

Four full directions for a scroll-driven landing hero, each with six stations, Nano Banana Pro prompts per keyframe, and Higgsfield prompts per transition. Pipeline: **Nano Banana stills → Higgsfield clips → ffmpeg concat → GSAP scrub**.

> Start with [`_shared.md`](_shared.md). It defines the brand palette anchor, the production pipeline, the GSAP scaffold, and the canonical headline/body copy that runs through all four directions.

| Direction | One-line | Best for | Production cost |
|---|---|---|---|
| [A — Cross-Section](direction-a-cross-section.md) | Architectural building cross-section, camera dollies floor-to-floor | Mechanism comprehension + strongest brand fit | ~2 days |
| [B — Exploded Mechanism](direction-b-exploded-mechanism.md) | Floating six-disc machine, layers separate on scroll | Technical buyers, "is this real software" answer | ~2.5 days |
| [C — Journey of One Letter](direction-c-journey-of-one-letter.md) | One envelope, time runs backward as you scroll | Emotional payoff, most cinematic | ~3.5 days |
| [D — The Pull-Back](direction-d-pullback.md) | Camera retreats from the coach's hand to the full infrastructure | "Will this replace me?" answer, lifestyle pitch | ~3 days |

## Recommended sequencing

1. Build **A** first. Strongest brand fit, lowest production risk, fastest learning loop on the Nano Banana → Higgsfield → GSAP pipeline.
2. Build **B** second. Reuses the same pipeline, lets you compare engagement on a "mechanism" vs "architecture" framing.
3. Build **D** third. The pull-back motion is different enough to teach the pipeline new things.
4. Build **C** last. Highest cost, highest payoff, but requires the most envelope-consistency discipline — better to learn the tool first.

## Notes on running all four

Once any single direction is built, the next costs ~30% less because:
- The brand color tokens are already in `globals.css`
- The `LandingHero.tsx` GSAP scaffold is already wired
- The mobile fallback pattern is already proven
- Nano Banana Pro prompt voice + Higgsfield motion-prompt voice are calibrated

If you actually ship all four, A/B/C/D each lives at its own marketing route (`/`, `/architecture`, `/story`, `/quiet`) and you split-test which converts. That is itself a strong piece of content marketing for a coaching-software brand.
