# RockLink — Design System
### Companion to `RockLink-Project-Blueprint.md` — the two together are the source of truth.

Status: **Approved — reference during all UI implementation**

---

## Design Thesis

RockLink should feel like the loading screen of a AAA competitive shooter, not a web form. The signature move: **the hand IS the interface.** Instead of buttons being the primary interaction metaphor, the camera/gesture panel is treated as the hero element throughout — glowing, tracked, alive — while everything else (buttons, panels, score) recedes into a quiet, disciplined glass frame around it. The one place we spend visual boldness is the live gesture-tracking view and the reveal moment; everything else stays restrained so that moment lands.

---

## 1. Color Tokens

| Token | Hex / Value | Role |
|---|---|---|
| `--color-bg` | `#050816` | App background — near-black void |
| `--color-bg-elevated` | `#0A0F24` | Slightly raised surfaces (behind glass panels) |
| `--color-primary` | `#6C63FF` | Primary actions, focus rings, default glow |
| `--color-secondary` | `#00E5FF` | Secondary highlights, opponent-side accents |
| `--color-accent` | `#B517FF` | Reserved for peak moments only: winner reveal, countdown "GO" |
| `--color-success` | `#00FF88` | Win state, ready/connected indicators |
| `--color-danger` | `#FF4D6D` | Loss state, errors, disconnect warnings |
| `--color-glass` | `rgba(255,255,255,0.08)` | Panel fill |
| `--color-glass-border` | `rgba(255,255,255,0.16)` | Panel edge (paired with gradient border below) |
| `--color-text-primary` | `#F5F6FA` | Headings, primary copy |
| `--color-text-muted` | `rgba(245,246,250,0.6)` | Secondary/supporting copy |

**Gradient border (signature detail):** panels use a 1px animated gradient border cycling subtly between `--color-primary` and `--color-secondary` (very slow, ~8s loop, low opacity) rather than a flat border — this is one of the few places we allow continuous ambient motion, used sparingly (primary panels only, not every card).

**Usage rule:** `--color-accent` (violet) is deliberately rare — reserved for the countdown's final "GO" flash and the winner-reveal moment. If accent shows up on more than ~2 screens at once, that's a signal it's being overused.

---

## 2. Typography

| Role | Typeface | Notes |
|---|---|---|
| Display / Headings | **Space Grotesk** | Used for room codes, countdown numbers, winner announcement — anywhere type needs to feel like a HUD element |
| Body / UI | **Inter** | All body copy, buttons, labels, form inputs |

**Type scale (rem, 16px base):**

| Token | Size | Weight | Usage |
|---|---|---|---|
| `text-display-xl` | 4.5rem | 700 | Countdown digits, winner reveal headline |
| `text-display-lg` | 2.5rem | 600 | Page-level headings (Home hero, Lobby title) |
| `text-display-md` | 1.75rem | 600 | Section headings (Score, Room Code) |
| `text-body-lg` | 1.125rem | 400 | Primary body copy |
| `text-body` | 1rem | 400 | Standard UI text |
| `text-caption` | 0.8125rem | 500 | Labels, timestamps, hints (letter-spaced +2%) |

**Rule:** never mix Space Grotesk into dense body copy or Inter into HUD-style numerals — the pairing only reads intentional if the split is consistent everywhere.

---

## 3. Spacing Scale

8px base unit, used consistently instead of arbitrary padding values:

`4 · 8 · 12 · 16 · 24 · 32 · 48 · 64 · 96` (px)

**Rule:** large negative space is a deliberate feature, not empty space to "fill" — panels get generous internal padding (24–32px minimum) and generous gaps between major sections (48–64px) to reinforce the premium, uncluttered feel. Resist the urge to add decorative filler in open areas.

---

## 4. Core Components

### `GlassPanel`
- Background: `--color-glass` with `backdrop-filter: blur(20px)`
- Border: 1px animated gradient (see Section 1)
- Corner radius: 16px (large panels), 12px (nested/small panels)
- Shadow: soft, colored (tinted toward `--color-primary` at low opacity), never pure black — reinforces the neon-lit-room feeling
- Props: `glow?: 'primary' | 'secondary' | 'accent' | 'none'`, `elevated?: boolean`

### `Button`
- **Primary:** gradient fill (`--color-primary` → `--color-secondary`), glow on hover (box-shadow blur increases), slight scale-down on press (0.97), never a hard color-swap on hover — always a glow/scale response
- **Ghost:** transparent fill, 1px border in `--color-glass-border`, text brightens on hover
- **Danger:** `--color-danger` fill, used only for destructive/leave actions
- All variants: 44px min height (touch target), 12px corner radius, `text-body` weight 600

### `Skeleton`
- `SkeletonPanel` — a `GlassPanel`-shaped placeholder with a slow shimmer sweep (gradient moving left→right, ~1.5s loop), matching the corner radius and dimensions of the content it replaces
- `SkeletonText` — rounded bars at `text-body`/`text-caption` height
- **Rule:** every skeleton is shaped like the real content (a room-code skeleton looks like a room-code chip, not a generic gray box) so the layout doesn't jump when real content arrives

### `ErrorState`
- Icon (outline style, `--color-danger` or `--color-text-muted` depending on severity) + short plain-language message + one clear action button
- Variants: `inline` (small, embedded in a panel — e.g. "Camera access denied") and `fullPanel` (larger, replaces an entire section — e.g. "Room not found")
- Copy rule: state what happened and what to do next, in the interface's voice — "Camera access is off. Turn it on in your browser settings to continue." not "Error: getUserMedia failed."

### `ParticleField`
- Ambient, slow-moving points of light (primary/secondary hues, low opacity), mounted once at the app shell level
- Reacts subtly to match phase: density/speed ticks up slightly during countdown, calms during lobby — a small touch that makes the background feel alive without being distracting

---

## 5. Motion System

**Timing tokens:**

| Token | Duration | Easing | Usage |
|---|---|---|---|
| `motion-micro` | 120ms | `easeOut` | Hover, press, focus |
| `motion-transition` | 280ms | `easeInOut` | Page/panel transitions |
| `motion-reveal` | 600ms | custom spring (`stiffness: 260, damping: 20`) | Winner reveal, countdown "GO" |
| `motion-ambient` | 8000ms+ | `linear`, infinite | Gradient border cycle, particle drift |

**Named Framer Motion variants (`shared/animations`):**
- `fadeUp` — page/section entrance
- `glowPulse` — ready state, connection restored
- `cardFlip` — gesture reveal (both players' gestures flip simultaneously)
- `countdownPop` — each countdown digit scales in with a spring, then holds
- `scoreTick` — score increments with a brief scale+color flash in the winner's favor color

**Rule:** the winner-reveal sequence is the one place allowed a fuller "moment" — countdown climax → simultaneous gesture flip → winner glow + score tick, choreographed as one continuous sequence rather than isolated animations. Everywhere else, motion stays subtle (micro/transition tier only).

**Accessibility:** all motion respects `prefers-reduced-motion` — ambient/ombient-loop animations (gradient border, particle drift) are disabled outright under reduced motion, and reveal/transition animations fall back to a simple opacity crossfade at `motion-transition` speed.

---

## 6. Iconography

- Outline-style icons only (not filled), consistent 1.5px stroke weight, matching the "HUD" feel rather than a soft consumer-app look.
- Icon color follows text color rules (`--color-text-primary` / `--color-text-muted`) except for state-specific icons (success/danger), which take their state color directly.

---

## 7. Loading & Error State Rules (Product-Wide)

- **No plain "Loading..." text anywhere.** Every async wait — room creation, socket reconnect, camera init, MediaPipe model load — shows a `Skeleton` shaped like the content it precedes.
- **No bare browser `alert()` or unstyled error text anywhere.** All failures — room not found, camera denied, opponent disconnected, socket error — route through `ErrorState`.
- Connection issues use a persistent, non-blocking `ConnectionStatusBadge` (small, corner-anchored) rather than a modal, so a brief reconnect doesn't interrupt the player's flow.

---

## 8. Audio Direction (for future `AudioManager` wiring)

Not implemented yet (see Blueprint Section 7a), but the intended feel is documented now so sound design stays consistent with the visual language when it's added:
- UI sounds: short, synthetic, low-key "tech HUD" clicks/hovers — not skeuomorphic or cartoonish.
- Countdown ticks: a rising pitch per tick, resolving on "GO."
- Win/lose stingers: brief (<1s), win leans bright/major, lose leans low/muted — never harsh or startling.
- Ambient: no looping background music in the MVP; revisit only if user testing calls for it.

---

## Component Checklist Before Any Page Is Built

- [ ] Color tokens defined as CSS variables in `styles/tokens.css`
- [ ] Space Grotesk + Inter loaded and type scale classes established
- [ ] `GlassPanel`, `Button`, `Skeleton`, `ErrorState` built and visually reviewed
- [ ] Motion variants library created in `shared/animations`
- [ ] `ParticleField` mounted at shell level
- [ ] Reduced-motion fallback verified for all ambient/loop animations

Once this checklist is complete, page-level UI work (Lobby, Match, etc.) begins.
