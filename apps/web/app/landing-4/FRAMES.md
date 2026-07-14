# Landing-4 frame pipeline

`public/landing-4/frames/` (gitignored, like all landing prototype assets) holds
101 alpha-WebP frames scrubbed by `LandingHero.tsx`. To rebuild them from the
source video (`computer element for landin page.mp4`, 2584×3208, 24fps, ~4s):

```bash
# 1. Extract PNG frames, downscaled, watermark removed (bottom-right sparkle)
ffmpeg -i source.mp4 -vf "scale=1200:-2,delogo=x=1000:y=1290:w=100:h=100" png-frames/frame-%04d.png

# 2. Strip backgrounds (macOS Vision + static-plate masks + diff matte)
swiftc -O ../../scripts/landing4-maskbg.swift -o maskbg
./maskbg png-frames alpha-frames png-frames/frame-0001.png

# 3. Encode WebP with alpha
for f in alpha-frames/frame-*.png; do
  cwebp -q 82 -alpha_q 90 "$f" -o "public/landing-4/frames/$(basename "${f%.png}").webp"
done
```

The masker unions four mattes per frame — the key insight is that the camera is
locked, so frame 1 is a clean background plate AND its subject never moves:

1. **Plate Vision mask** — Apple's subject isolation on frame 1 (flawless for
   the laptop + branch), stamped into every frame so the static subject never
   erodes.
2. **Plate darkness mask** — plate pixels below ~0.62 luma (bark, laptop body,
   contact shadow) are always foreground; the studio bg never gets that dark.
3. **Per-frame Vision mask** — catches the glass slabs mid-flight.
4. **Difference matte vs the plate** — exposure-normalized per frame (AI video
   flickers), catches the small flying objects (plane, envelope, watch, bell)
   that Vision misses.

The final matte is dilated 4px: halo pixels are frame-bg colored, and the hero's
sticky gradient in `landing4.css` is sampled from those exact bg pixels, so
halos are invisible. That gradient and the frame bg must stay in sync if the
source video is ever regenerated.
