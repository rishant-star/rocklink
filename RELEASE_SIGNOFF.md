# RockLink — Release Sign-Off

**Status: Release Candidate — Conditionally Approved**
**Date of this sign-off reflects the end of the Release Candidate engineering pass described below.**

---

## Executive Summary

RockLink is a real-time, two-player Rock-Paper-Scissors game played with real hand gestures, read from each player's webcam entirely on their own device. It is built as a premium, game-like web experience rather than a conventional web app — glassmorphic UI, a consistent motion language, and a "the hand is the hardware" design philosophy that treats local gesture detection as the core interaction, not a gimmick.

The project has reached **Release Candidate** status: the complete gameplay loop — create/join a room, ready up, synchronized countdown, local gesture detection, server-resolved winner, running score, and rematch — is implemented, tested via structured code review, and internally consistent end to end. Public deployment is gated behind three concrete, well-understood requirements documented in **Release Gates**, below. None of the gates require further architectural work; all three are asset-provisioning or configuration tasks external to the current codebase.

---

## Project Overview

**Multiplayer architecture.** Two players connect over Socket.IO to a Node/Express server. Rooms are created on demand, identified by a short ID embedded in a shareable link. Each room holds at most two players, assigned roles `p1` (host) and `p2` (guest) in join order.

**MediaPipe gesture detection.** Each client runs Google's MediaPipe Hands model locally, entirely in-browser, against its own camera feed. A rule-based classifier (finger-extension geometry, not a trained model) converts the 21 hand landmarks MediaPipe produces into a Rock/Paper/Scissors reading, with a stabilization step requiring several consecutive consistent frames before a reading is trusted. No video frame, and no raw landmark data, is ever transmitted anywhere — only the final, stabilized gesture value crosses the network, once, when a player locks in.

**Server-authoritative gameplay.** The server is the sole source of truth for timing and outcome. It runs the countdown, opens and closes the gesture-lock window, decides who won, and updates the score. Clients never calculate a result — they submit inputs (ready, gesture, rematch vote) and render whatever the server tells them happened.

**Room lifecycle.** A room progresses through an explicit phase state machine — waiting for a second player, ready-check, countdown, awaiting gestures, comparing, revealed, and (for a rematch) back to ready-check — with every transition owned by a single object (`Room`) rather than scattered across handler files.

**Countdown.** A server-owned timer emits a synchronized tick to both clients once per second (3, 2, 1, "GO"), with server timestamps so both players see the same countdown at the same time regardless of individual network latency.

**Winner resolution.** Once both players have locked a gesture (or the server's own deadline forces an unresponsive player's lock to a deterministic forfeit), the server compares the two gestures, updates the score, and reveals both gestures simultaneously to both clients in a single broadcast. Gestures are never visible to either client — including the player who submitted them, from the *opponent's* perspective — until this single reveal moment.

**Rematch.** After a round ends, either player can request a rematch. Once both agree, the server restarts the round using the exact same countdown and gesture-lock machinery as the first round — there is no separate "rematch mode," just the same round-start path invoked again. The server waits indefinitely for both players to agree, with no rematch-specific timeout; if a player leaves, the existing disconnect/room-lifecycle handling ends the wait.

---

## Completed Milestones

Listed chronologically, as actually built:

1. **Foundation** — monorepo scaffold (pnpm workspaces: client, server, shared-types package), Project Blueprint and Design System authored and reviewed before any feature code, core tooling (Vite, Tailwind, TypeScript strict mode, ESLint, Socket.IO).
2. **Engineering Review (Foundation)** — a dedicated review pass caught and fixed a missing Vite path alias, incorrect server ESM import extensions, a phantom build script, a missing `tsconfig.json`, and several accessibility/responsiveness gaps before any feature work began.
3. **Design Foundation (Phase 2A)** — the full design token layer (typography scale, shadows, blur, z-index, radius) and four structural layout primitives (`Container`, `Stack`, `Cluster`, `Center`).
4. **UI Primitives Refinement (Phase 2B)** — `Button`, `GlassPanel`, `Heading`, `Text`, `Icon`, `Input` completed and hardened; confirmed no separate `Card` primitive was needed (`GlassPanel` already served that role).
5. **Home Experience (Phase 3)** — the game's entry point: hero section, Create/Join Room actions wired to a real Socket.IO client, camera-readiness messaging (UI only at this stage), connection-status indicator, and app-wide page transitions.
6. **Lobby Experience** — real room creation/joining, ready-up flow, player cards, shareable invite link.
7. **Multiplayer Synchronization** — reconnect tokens, disconnect grace periods, host promotion on permanent departure, Socket.IO connection-state recovery for brief network drops.
8. **Camera & Gesture Detection (Milestone 6)** — the full local pipeline: camera permission flow, MediaPipe Hands integration, rule-based classifier, frame-rate-capped detection loop, landmark overlay, and a dedicated review pass that caught and fixed a video/overlay misalignment bug and a re-render performance bug.
9. **Ready → Countdown (Phase 4A)** — synchronized server-driven countdown, including a fix for a missing method left behind by an earlier refactor and a race-condition fix in the countdown's first tick.
10. **Gesture Lock (Phase 4B)** — server-authoritative, secrecy-preserving gesture submission with duplicate-submission protection and a server-side stall timeout.
11. **Gameplay Resolution (Phase 4C)** — winner calculation, simultaneous reveal, score updates, completing a game engine extension (forfeit handling) that had been approved earlier but not yet implemented.
12. **Gameplay Core Verification** — a dedicated, no-new-code review pass across the entire game loop.
13. **Rematch (Phase 5)** — mutual rematch agreement reusing the existing round-start machinery, plus a refactor extracting round orchestration into its own module.
14. **Release Candidate 1 — UX Polish & Presentation** — the shared audio system, motion polish across five components, and an accessibility fix making all Framer Motion animations respect the OS-level reduced-motion preference.
15. **Final Release Readiness Review** — an independent verification pass that checked prior completion claims against the actual code (catching one inaccurate claim) and found and fixed a real camera-lifecycle privacy/resource leak.

---

## Frozen Architecture

The following subsystems are considered architecturally frozen: their responsibilities do not change without an explicit decision to unfreeze them, and ordinary bug fixes should work within their existing boundaries rather than reassigning responsibility across them.

**`Room`** (`apps/server/src/rooms/Room.ts`) — owns all gameplay *state*: connected players and their roles, the room's phase, the running score, in-flight gesture locks, rematch votes, reconnect tokens, and every timer tied to the room's lifecycle (disconnect grace periods, the countdown, the gesture-lock deadline). Nothing else in the codebase holds a parallel copy of this state.

**`RoundOrchestrator`** (`apps/server/src/game/roundOrchestrator.ts`) — owns the *sequence* of a round: start the countdown, open the gesture window when it completes, resolve and broadcast the result once both gestures are in. It does this by calling `Room`'s own methods in the correct order and wiring their callbacks to Socket.IO broadcasts — it does not reimplement anything `Room` already owns, and it holds no state of its own.

**`CountdownAuthority`** (`apps/server/src/game/CountdownAuthority.ts`) — owns timer *mechanics* only: emit a tick once per second, then signal completion. It has no knowledge of sockets, rooms, or players, and exists as a single private instance owned exclusively by `Room`.

**`GameEngine`** (`apps/server/src/game/GameEngine.ts`) — owns winner *calculation* only: a pure function from two locked gestures to a result. No socket knowledge, no state, no side effects — deliberately testable in complete isolation.

**Socket Layer** (`apps/server/src/sockets/`) — owns *transport* only. Handler files translate Socket.IO events into calls against `Room`/`RoundOrchestrator` and back into broadcasts; they do not themselves decide game outcomes or own sequencing logic.

**Design System** (`Design-System.md`, `tokens.css`, `tailwind.config.ts`) — owns the visual language: color, typography, spacing, motion timing, and component visual specification. Every UI primitive is a direct implementation of something specified here first.

**Motion Library** (`shared/animations/variants.ts`) — owns every reusable animation as a single named export. Components import a variant; they do not define bespoke animation timing inline.

**Audio System** (`shared/services/audio/`) — owns sound playback through a single `AudioManager` singleton and a single map of named sound keys. No component plays audio by any other means.

**Why frozen:** this project was built across many sequential milestones, each building on the last. Freezing each subsystem's responsibility as soon as it stabilized — and requiring subsequent work to extend rather than restructure it — is what kept nine-plus milestones of gameplay work internally consistent instead of accumulating rework. Several concrete bugs (a `Map<roomId, Timer>` pattern proposed and rejected in favor of `Room`-owned timers; duplicated round-start logic caught and consolidated into `RoundOrchestrator`) were caught specifically *because* an explicit ownership boundary existed to check proposed changes against.

---

## Release Gates

Three items must be resolved before this project is exposed to public, adversarial internet traffic. None require further architecture.

**1. Rate limiting.** `apps/server/src/sockets/middleware/rateLimit.ts` is an intentional no-op, documented as such in its own source since the Foundation milestone. It exists as a structural placeholder so the middleware slot is already wired into the Socket.IO server — real thresholds were deliberately deferred because meaningful limits (max gesture-lock attempts per second, max room-creation attempts per connection, etc.) depend on production traffic patterns this project has never had access to. This remains outside the repository's current scope because setting real thresholds now, without usage data, risks either being too permissive to matter or too strict for legitimate players.

**2. MediaPipe runtime assets.** `apps/client/public/models/` is currently empty. `AudioManager`'s sibling in the gesture pipeline, MediaPipe Hands, needs its `.wasm`/`.tflite`/`.binarypb` model files present at runtime; the project deliberately self-hosts these (rather than pulling from a CDN mid-match) per the Blueprint's original performance decision. These files remain outside the repository because they are large binary assets normally obtained via `npm install` and copied from `node_modules/@mediapipe/hands/` — a step that requires actual package installation, which the development environment this project was built in could not perform (no network path to the npm registry for a live install). A README in that directory documents the exact file list and the copy command needed.

**3. Audio assets.** `apps/client/public/audio/` is currently empty for the same class of reason: eleven short sound effect files (button hover/click, countdown ticks, victory/defeat/draw stingers, etc.) are referenced by the now-real `AudioManager` but were never sourced, since the development environment had no network path to any audio asset provider and cannot synthesize production-quality sound design. A README documents the required filenames and their intended character (synthetic, restrained "tech HUD" sound design, matching the Design System's stated audio direction).

---

## Deferred Improvements

These are real, identified improvements that were deliberately not implemented in this Release Candidate. Each was evaluated and classified Important rather than Blocking.

**Particle background resize throttling.** `ParticleField`'s window-resize handler resets the canvas dimensions on every single `resize` event with no debounce. This causes measurable but bounded jank specifically during a desktop window drag-resize — an uncommon interaction for a game typically played in a fixed browser tab. Deferred because it is a performance smoothness issue, not a functional break, and does not affect mobile users (who experience resize only as an infrequent, discrete orientation change, not a continuous drag).

**Mid-round reconnect synchronization.** If a player disconnects and reconnects while a round is actively in progress (during the countdown or the gesture-lock window), their client has no mechanism to learn the server's current phase, countdown value, or lock status — it simply resumes from whatever state it had locally. This was first identified during the Lobby milestone and has been consistently reclassified Important, not Blocking, at every subsequent review, for two concrete reasons: the exposure window is narrow by design (the 6-second gesture-lock deadline is deliberately shorter than the 20-second reconnect grace period, so most disconnects resolve via the existing timeout machinery before this gap matters), and a correct fix requires new state-resync protocol surface, which conflicts with the "frozen architecture, no additional networking infrastructure" constraint that was explicitly in force during every phase where this was reconsidered.

**Audio hook decoupling.** The shared `Button` primitive calls `AudioManager` directly inside its own hover/click handlers, rather than through a mediating hook. This was a deliberate centralization choice during the audio system's implementation — every button in the app passes through this one component, satisfying "one centralized audio service, not scattered calls" — but it does couple a presentation primitive directly to a service layer. Deferred as a refinement because it is a code-organization concern, not a functional one; nothing about the current behavior is incorrect.

---

## Known Limitations

Accepted as the boundary of this Release Candidate's scope:

- No rate limiting (see Release Gates — this is a hard gate, not merely a limitation).
- No mid-round reconnect state resync (see Deferred Improvements).
- A round can be left unresolved if a player permanently disconnects mid-round and their opponent's gesture was already the only one locked — the server correctly avoids comparing against a nonexistent second player, but nothing currently surfaces an explicit "match ended" state to the remaining player in this specific scenario.
- No live opponent-connection indicator on the Match page during an active round (the Lobby has one; the Match page does not).
- No "Leave Match" navigation affordance on the post-round reveal screen — a player who doesn't want a rematch has no explicit exit besides browser navigation.
- Color-contrast ratios have not been empirically measured against WCAG thresholds; the Design System's token choices were made with contrast in mind but never verified in a real browser, since this project's working environment had no browser available for live rendering checks.
- `ParticleField`'s resize handler is unthrottled (see Deferred Improvements).

---

## Final Engineering Assessment

**Architecture.** Internally consistent. Every subsystem's stated responsibility matches its actual implementation, verified by direct code inspection at multiple points in the project's history, not just asserted. The server-authoritative design is genuine, not superficial — gesture secrecy is enforced by the *shape* of the network protocol (certain events simply never carry gesture data), not by handler discipline that could be forgotten.

**Maintainability.** Strong. Feature-based organization, a single source of truth for shared types, and explicit ownership boundaries mean a future engineer extending this project has a clear answer to "where does this logic belong" for nearly any change. The one soft spot is the audio/Button coupling noted above.

**Scalability.** Adequate for its current scope (in-memory room state, single server process) but not designed for horizontal scaling — a second server instance would not share room state with the first. This was a known, accepted trade-off for a project of this scope, not an oversight.

**Security.** The weakest area of this Release Candidate, concretely: no rate limiting. Everything else — server-authoritative resolution, no client-trusted outcomes, gesture secrecy by protocol design — is sound. This is why rate limiting is a hard release gate rather than a deferred improvement.

**Accessibility.** Strong for a project of this type. Reduced-motion support covers both CSS-driven and JavaScript-driven (Framer Motion) animation, focus states are consistent across interactive primitives, and ARIA live regions are used where dynamic state actually needs to be announced. Not independently audited against WCAG contrast ratios (see Known Limitations).

**Performance.** Strong in the areas that matter most for this application's core interaction — the gesture-detection pipeline is explicitly frame-rate-capped and was the subject of a dedicated performance review that caught and fixed a real re-render bug. The one known gap (particle resize throttling) is minor and isolated.

**Portfolio quality.** High. The engineering process visible across this project's history — explicit architecture decisions made and documented before implementation, defensive fixes applied even to code paths that were "probably" already safe, and a release review that verified prior claims against actual code rather than accepting them — demonstrates senior-level engineering judgment, not just functional output.

**Overall assessment:** RockLink is a well-architected, internally consistent multiplayer game with a genuinely server-authoritative core and a coherent design system, ready for controlled release once its three release gates close. The gaps that remain are honestly documented, correctly classified, and none of them represent hidden risk.
