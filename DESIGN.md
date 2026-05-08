# Design

## Color

**Strategy**: Restrained. Tinted warm neutrals throughout, one accent color (amber-gold) for primary actions and active state only.

**Palette (OKLCH)**

| Token | Light | Dark | Role |
|---|---|---|---|
| `--background` | `oklch(97% 0.008 60)` | `oklch(14% 0.010 50)` | Page surface |
| `--foreground` | `oklch(20% 0.008 60)` | `oklch(93% 0.008 60)` | Body text |
| `--card` | `oklch(94% 0.010 55)` | `oklch(19% 0.012 50)` | Card surfaces |
| `--muted-foreground` | `oklch(48% 0.008 60)` | `oklch(60% 0.008 55)` | Secondary text, labels |
| `--accent` / `--primary` | `oklch(62% 0.14 50)` | `oklch(70% 0.14 50)` | Amber-gold — CTA, active nav, ring |
| `--border` | `oklch(88% 0.010 55)` | `oklch(28% 0.012 50)` | Dividers, card borders |
| `--destructive` | `oklch(55% 0.18 25)` | `oklch(65% 0.18 25)` | Error, destructive actions |
| `--health-green` | `oklch(60% 0.14 145)` | `oklch(68% 0.14 145)` | Integration connected |
| `--health-red` | `oklch(55% 0.20 25)` | `oklch(65% 0.22 25)` | Integration disconnected |

**Glass overlay**: `bg-white/10 dark:bg-white/5` with `backdrop-blur-md` and `border border-white/10` — used for elevated card surfaces, not as default.

**Hue family**: All neutrals carry hue ~50–60 (warm amber-sand). Never pure gray. Never cool-tinted.

## Typography

**Fonts**
- Sans: `Geist Sans` (Vercel) — used for all UI text, headings, labels, buttons
- Mono: `Geist Mono` — used for data values (lead counts, timestamps, draft body preview in edit mode)

**Scale** (product register — tighter ratio)

| Step | Size | Weight | Usage |
|---|---|---|---|
| Display | `text-[28px]` | 600 | Page headings, metric values |
| Heading | `text-xl` | 600 | Card titles, draft lead name |
| Body | `text-sm` | 400 | General UI text |
| Label | `text-xs` | 400 | Muted metadata, nav section headers |
| Micro | `text-[10px]` | 400 | Badges, keyboard shortcut hints |

**Leading**: `leading-[1.2]` on headings, `leading-[1.5]` on body prose. Line length capped at `max-w-[65ch]` on draft body text.

## Elevation

Three levels, expressed through surface treatment (not drop shadows):

| Level | Treatment | Usage |
|---|---|---|
| Base | `--background` bare | Page background |
| Raised | `--card` surface, `border-border` | Standard content cards |
| Glass | `backdrop-blur-md bg-white/10 dark:bg-white/5 border border-white/10 shadow-[inset_0_1px_0_rgba(255,255,255,0.08)]` | Priority surfaces — DraftCard, empty states, health card |

No drop shadows (`shadow-*`) on cards. Elevation through surface contrast, not box-shadow.

## Spacing & Radius

**Radius**: `--radius: 1rem` (base). Applied as:
- `rounded-2xl` (`1rem`) — cards, pill containers
- `rounded-xl` (`0.75rem`) — nav items, badges
- `rounded-md` (`0.75rem`) — buttons, inputs

**Spacing rhythm**: Sections use `space-y-6` or `gap-6`. Card internal padding `p-6`. Sidebar padding `p-3`/`p-6`. Top bar `p-4`. Avoid identical padding everywhere — vary for rhythm.

## Components

**Sidebar nav item (active)**: `bg-accent text-accent-foreground rounded-xl px-3 min-h-[44px]`

**Sidebar nav item (default)**: `hover:bg-white/5 text-foreground rounded-xl px-3 min-h-[44px]`

**Locked module row**: Static, no hover. Icon: `LockSimple`. Shows label + "Coming soon" badge. Tooltip holds full upsell copy. Full visible sell copy belongs in sidebar, not hidden in title attribute.

**DraftCard**: Glass elevation. Framer Motion spring animation (`stiffness: 120, damping: 18`). Keyboard shortcuts: A (approve), S (skip), H (hold). `KeyBadge` component for shortcut hints.

**IntegrationHealthCard**: Two states — connected (green check) and disconnected (red warning + reconnect CTA). Located at bottom of sidebar, above sign-out.

**Buttons**: shadcn/ui Button component. Primary uses `--primary`. Ghost/outline for secondary actions.

## Motion

- DraftCard enter/exit: `x: ±300, opacity: 0→1` spring. Duration approx 200–300ms at spring settings.
- All other transitions: `transition-colors` only (150ms). No layout-property animation.
- `AnimatePresence mode="wait"` wraps DraftCard — one card visible at a time.

## Dark / Light

Both modes are first-class. Dark background is warm near-black (`oklch(14% 0.010 50)`), not cool gray. Light background is warm off-white. The toggle is always accessible in the top-right corner of every page (desktop) and mobile header.

## Custom Background

`:root` carries `--bg-image: none` by default. Coaches can swap this to a CSS image URL for personalized backgrounds. The `body` has `background-image: var(--bg-image); background-size: cover; background-attachment: fixed`.
