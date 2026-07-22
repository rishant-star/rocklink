# RockLink — Architecture Decisions

This document records the significant architectural decisions made during RockLink's development, in the order they were made. Each entry reflects a real decision point encountered during the project, not a retrospective idealization of the process.

---

## 1. Feature-Based Architecture

**Decision.** Client code is organized by feature (`features/home`, `features/lobby`, `features/match`, `features/camera`, `features/gesture-detection`), each owning its own components and hooks, with `shared/` reserved for genuinely cross-cutting concerns (design primitives, the socket client, the audio system).

**Context.** Established at Foundation, before any feature existed, as part of the initial Blueprint.

**Alternatives considered.** A type-based structure (`components/`, `hooks/`, `pages/` at the top level, sorted by kind rather than purpose) is the more common default for smaller React projects.

**Final reasoning.** The project was always scoped as a multi-milestone build (camera, lobby, gameplay, etc. as distinct, separately-developed capabilities). A type-based structure would have scattered each feature's files across several top-level folders, making it harder to reason about a feature in isolation or to enforce boundaries between them.

**Consequences.** Feature boundaries were checked directly (by import-graph inspection) at several points in the project and held up — `camera/` never imports from `gesture-detection/` or `match/`, for example. The cost is some duplication of small structural patterns (each feature has its own `hooks/`/`components/` split) rather than one shared convention file.

---

## 2. Monorepo Structure

**Decision.** A single pnpm workspace containing `apps/client`, `apps/server`, and `packages/shared-types`.

**Context.** Established at Foundation.

**Alternatives considered.** Separate repositories for client and server, with the event contract either duplicated on both sides or published as a versioned npm package.

**Final reasoning.** The client and server need to agree on an exact Socket.IO event contract, and that contract changes frequently during active development. A monorepo lets both sides import the same TypeScript types directly, with changes to the contract causing immediate compile errors on whichever side hasn't been updated — versioned package publishing would introduce a release/update lag that active development couldn't tolerate.

**Consequences.** Some early tooling friction (see Decision 3) from treating the shared package like a normal buildable library when it didn't need to be one. Resolved once identified.

---

## 3. Shared Types Package

**Decision.** `packages/shared-types` holds every cross-boundary type (game state, Socket.IO event signatures) as type-only exports, consumed exclusively via `import type` on both client and server.

**Context.** Established at Foundation; its build configuration was corrected during the Foundation engineering review.

**Alternatives considered.** Duplicating type definitions independently in each app; using a runtime schema-validation library (e.g., zod) shared between both sides.

**Final reasoning.** Since every consumer uses `import type`, TypeScript erases all of these types before anything reaches runtime — meaning the package needs no build step and no compiled output at all. This was not the original assumption: the package initially had a `build` script wired into the root build pipeline that referenced a script the package didn't actually have, which the Foundation review caught and corrected by recognizing the package was type-only and removing the unnecessary build step entirely, rather than adding the missing script.

**Consequences.** Zero-runtime-cost type sharing, and an entire class of "client and server disagree about an event's shape" bugs became compile-time errors instead of runtime mysteries. The corrected build configuration is simpler than the original, not more complex — a rare case where fixing a bug also reduced the codebase's footprint.

---

## 4. Server-Authoritative Multiplayer

**Decision.** The server is the sole source of truth for match timing and outcome. Clients submit inputs (ready state, locked gesture, rematch vote); they never compute or report a result themselves.

**Context.** Established in the Blueprint, before any gameplay code existed, and held without exception through every subsequent gameplay milestone.

**Alternatives considered.** A client-reports-winner model with server-side validation after the fact; a fully peer-to-peer model with no server arbitration at all.

**Final reasoning.** A game where either client could declare its own outcome is trivially cheatable by editing client code. Making the server the only party that ever compares gestures or advances the countdown removes that entire attack surface, at the cost of the server needing to own more state and more timers than a purely relay-based server would.

**Consequences.** Every gameplay subsystem (`Room`, `RoundOrchestrator`, `CountdownAuthority`, `GameEngine`) exists specifically because of this decision — a peer-to-peer design would not have needed most of them. This is the single decision the rest of the gameplay architecture is downstream of.

---

## 5. Gesture-Only Networking

**Decision.** No video frame, and no raw hand-landmark data, is ever transmitted over the network. Only the final, classified, stabilized gesture value is sent, once, at lock time.

**Context.** Established in the Blueprint's privacy requirements and restated as an explicit, unwavering constraint in every subsequent camera- or gameplay-related milestone.

**Alternatives considered.** Streaming video to the server for server-side gesture recognition (would also satisfy "server-authoritative" for the gesture-reading step itself, not just the comparison).

**Final reasoning.** Streaming video would meaningfully increase bandwidth requirements, add a privacy exposure most players would reasonably object to, and add latency to the local detection loop for no gameplay benefit — the server only ever needs to know *what gesture was shown*, never *what the camera actually saw*. This is also the concrete meaning behind the project's "the hand is the hardware" design framing: gesture reading is treated as a local, private, on-device capability, not a networked service.

**Consequences.** The gesture pipeline (MediaPipe, classifier, stabilizer) had to be built entirely client-side (see Decision 6), and the anti-cheat secrecy guarantee (Decision — see Gesture Lock milestone) had to be enforced at the protocol level, since the server never has access to raw visual data to double-check a client's claim against.

---

## 6. Local MediaPipe Inference

**Decision.** MediaPipe Hands runs entirely in the browser, with its model assets self-hosted from the app's own server rather than fetched from a third-party CDN at runtime.

**Context.** Established in the Blueprint, implemented in the Camera & Gesture Detection milestone.

**Alternatives considered.** Loading MediaPipe's model files from its default CDN at runtime.

**Final reasoning.** A CDN dependency mid-match — however reliable in practice — is a third-party outage risk this project chose not to accept for a real-time interaction. Self-hosting trades a one-time asset-provisioning step (see Release Gates in the sign-off document) for zero runtime third-party dependency.

**Consequences.** The model files must be present in `public/models/` for the pipeline to function at all — this became one of the project's Release Gates, since the development environment had no path to actually fetch them.

---

## 7. Room-Owned Gameplay State

**Decision.** A single `Room` class holds every piece of state relevant to one match: players, phase, score, gesture locks, rematch votes, reconnect tokens, and every timer tied to the room's lifecycle.

**Context.** Established from Foundation, but most concretely reinforced during Phase 4A, when a proposal to track the countdown in a `Map<roomId, CountdownAuthority>` living in a handler file was explicitly rejected in favor of `Room` owning a private `CountdownAuthority` instance directly.

**Alternatives considered.** Distributing state across multiple maps keyed by room ID, living in whichever handler file happened to need that piece of state.

**Final reasoning.** Parallel state (the same room's data tracked in two different places) is a synchronization bug waiting to happen, and makes it unclear which piece of code is authoritative when two representations disagree. Keeping all of a room's state inside one object, with handler files only ever calling methods on it, removes that entire bug class by construction.

**Consequences.** This decision is why `RoundOrchestrator` (Decision 9) exists as a *pure sequencing* layer rather than a state-holding one — it was explicitly designed not to duplicate what `Room` already owned.

---

## 8. Pure GameEngine

**Decision.** `GameEngine` is a stateless class with a single method, `compare()`, taking two gesture values and returning a result. No socket knowledge, no side effects.

**Context.** Established at Foundation as a stub; completed with forfeit-handling logic (`NONE` gesture support) during Phase 4C.

**Alternatives considered.** Folding comparison logic directly into the socket handler that receives the second player's gesture lock.

**Final reasoning.** Keeping the actual game rules (what beats what, how a forfeit resolves, what counts as a draw) in a pure function makes them independently testable without any networking or room-state setup, and makes the rules themselves easy to read in one place rather than interleaved with transport code.

**Consequences.** When the forfeit-handling extension was needed, it was a self-contained change to one file with no ripple effects into the socket layer beyond widening the type of value being passed in.

---

## 9. RoundOrchestrator

**Decision.** A dedicated module, `game/roundOrchestrator.ts`, owns the sequencing of a round — starting the countdown, opening the gesture window on its completion, and resolving/broadcasting the result — by calling `Room`'s methods in the correct order.

**Context.** Introduced during Phase 5 (Rematch) as an explicit refactor. The logic it now contains was originally written inline inside a Socket.IO handler, and then duplicated into a second handler when rematch needed to trigger the same sequence.

**Alternatives considered.** Leaving the sequencing logic inline in whichever handler triggered it first (the state the codebase was briefly in before this refactor); duplicating it a second time for the rematch trigger path (also briefly the actual state of the codebase).

**Final reasoning.** Once a second call site needed the exact same "start a round" sequence, the duplication was recognized as a violation of the project's "reuse over duplication" norm (Decision 13) and extracted into one shared module that both the original Ready-triggered path and the new rematch-triggered path call identically.

**Consequences.** There is exactly one implementation of "how a round starts" and "how a round resolves" in the entire codebase, regardless of what triggered it. This made the Rematch milestone's core requirement — reuse the existing pipeline, don't build a parallel one — straightforward to satisfy correctly.

---

## 10. CountdownAuthority

**Decision.** A minimal, pure timer class: emit a value once per second, then signal completion. No knowledge of sockets, rooms, or players.

**Context.** Established at Foundation as a stub; its exact tick timing was revised during Phase 4A.

**Alternatives considered.** Driving the countdown directly from `setTimeout` calls inside the handler or inside `Room` itself, without a separate class.

**Final reasoning.** Isolating timer *mechanics* from timer *ownership* (which `Room` handles) and timer *usage* (which `RoundOrchestrator` handles) meant that a genuine bug in the timing itself — the first tick firing synchronously in the same instant as the event that triggers client-side navigation, creating a race where a client could miss it — was straightforward to find, reason about, and fix in one small, isolated class, without needing to trace through room or socket logic to understand the timer's behavior.

**Consequences.** The fix (delaying the first tick so every tick, including the first, comes from the same one-second interval) was a small, self-contained, low-risk change specifically because the class had no other responsibilities to accidentally disturb.

---

## 11. Frozen Gameplay Architecture

**Decision.** After the Gameplay Core milestone completed, `Room`, `RoundOrchestrator`, `CountdownAuthority`, and `GameEngine`'s responsibilities were explicitly declared frozen — subsequent work could extend them additively but not reassign responsibility across them without an explicit unfreeze decision.

**Context.** Declared after Gameplay Core, and re-affirmed at the start of each subsequent phase (Rematch, each Release Candidate stage).

**Alternatives considered.** Continuing to allow open-ended refactoring of the gameplay layer as each new feature was added.

**Final reasoning.** A long, multi-milestone build is at real risk of accumulating rework if core responsibilities keep shifting — each new feature would need to re-verify assumptions about subsystems it doesn't directly touch. Freezing the gameplay layer once it was verified correct meant later milestones (Rematch, RC audio/motion polish) could be built and reviewed with confidence that the underlying game loop hadn't silently changed underneath them.

**Consequences.** Every subsequent proposed change was checked against this freeze explicitly — including, correctly, rejecting a reconnect-recovery feature proposal during a later QA pass specifically because it would have required new gameplay behavior in frozen territory.

---

## 12. Design System First, Features Second

**Decision.** The Project Blueprint and `Design-System.md` were authored and reviewed before any feature was built, and the token layer plus core UI primitives (Phase 2A/2B) were completed before the first real feature (Home, Phase 3).

**Context.** The project's very first substantive work, before any application code.

**Alternatives considered.** Building the Home page (or any feature) first, and extracting shared design tokens/primitives once patterns emerged organically.

**Final reasoning.** Retrofitting a design system after features already exist tends to produce inconsistency (each feature reflects the moment it was built rather than a coherent system) and expensive rework (updating already-built features to match tokens introduced later). Front-loading the design system meant every feature from Home onward was built by composing already-approved primitives, never inventing new visual patterns ad hoc.

**Consequences.** Later milestones were repeatedly instructed to "reuse existing primitives, do not create duplicates" — and were able to comply, because the primitives already existed and were sufficient. The Design System document itself became the reference multiple later reviews checked implementation against (for example, catching that a "GO" countdown flash wasn't actually using the accent color the Design System had specified for it since Phase 1).

---

## 13. Reuse Over Duplication

**Decision.** A recurring, explicitly-enforced norm throughout the project: before building something new, check whether an existing primitive, type, or piece of logic already covers the need.

**Context.** Not a single decision point but a constraint applied repeatedly — confirming `GlassPanel` already served as the project's "Card" primitive (no duplicate built), extracting shared `AppServer`/`AppSocket` types instead of duplicating them per handler file, and the `RoundOrchestrator` extraction (Decision 9) itself.

**Alternatives considered.** Allowing each milestone to build what it needed locally, accepting some duplication as the cost of development speed.

**Final reasoning.** Duplication in a project with this many sequential milestones compounds — a bug fixed in one copy of duplicated logic silently persists in the other. Treating "does this already exist" as a mandatory first question before writing new code kept the codebase's actual surface area smaller than its feature count might suggest.

**Consequences.** Concretely fewer files and less code than an equivalent project built without this discipline, and — more importantly — no instance found during any review pass of the same bug existing in two places because logic had been copy-pasted rather than shared.

---

## 14. Centralized Motion Library

**Decision.** Every reusable animation is a single named export from `shared/animations/variants.ts` (`fadeUp`, `glowPulse`, `cardFlip`, `countdownPop`, `scoreTick`). Components import a variant rather than defining animation timing inline.

**Context.** Established at Foundation alongside the rest of the Design System; enforced explicitly as a requirement during Release Candidate 1's motion-polish work ("reuse the centralized motion library, do not introduce new animation styles unless required").

**Alternatives considered.** Letting each component define its own Framer Motion transition values inline as needed.

**Final reasoning.** Inline, per-component animation timing tends to drift — small, unintentional inconsistencies in duration or easing accumulate across a large UI until nothing feels quite consistent. A single named set of variants makes "does this feel like the same product" a property of the code's structure, not something that has to be manually re-verified across every screen.

**Consequences.** When Release Candidate 1 needed to polish several components' motion (`ScoreBoard`, `WinnerRevealCard`, `CountdownOverlay`, `GestureLockIndicator`, `RematchPanel`), the work was to *apply* existing variants that had gone unused since Foundation, not to invent a new motion vocabulary — the `scoreTick` variant, for example, had existed since Milestone 1 with no consumer until this pass.

---

## 15. Centralized Audio System

**Decision.** A single `AudioManager` singleton, driven by a single map of named sound keys (`audioSprites`), is the only way any part of the app plays a sound.

**Context.** Scaffolded as an explicit no-op stub at Foundation (deliberately deferred, not forgotten — the interface was designed before any real audio existed so nothing would need to change shape when it did); implemented for real during Release Candidate 1.

**Alternatives considered.** Playing sounds directly from wherever they're needed (e.g., a raw `new Audio().play()` call inside each component that needs one).

**Final reasoning.** Scattered audio calls make it impossible to answer simple questions like "what sounds does this app play" or "how do I mute everything" without searching the entire codebase. A single service with a fixed vocabulary of named cues makes both questions trivial, and matches the same reasoning already applied to motion (Decision 14).

**Consequences.** All eleven required sound cues are triggered from a small number of well-understood locations: the one shared `Button` primitive (hover/click, reaching every button in the app at once) and the handful of hooks that already own the relevant game-state transitions (countdown ticks, gesture lock, match result, player joined/left, rematch accepted) — never from arbitrary UI code. The one open question this raised (whether `Button` calling `AudioManager` directly, rather than through a mediating hook, is the *right* kind of centralization) is recorded as a deferred improvement in the sign-off document, not treated as settled.

---

## 16. Accessibility-First Reduced-Motion Implementation

**Decision.** A single `<MotionConfig reducedMotion="user">` wrapper at the application root makes every Framer Motion animation in the app respect the OS-level reduced-motion preference.

**Context.** Discovered as a gap during Release Candidate 1: a global CSS media query already existed (from Foundation) covering CSS-driven animations, but it had no effect on Framer Motion's JavaScript-driven animations, which make up most of the app's motion.

**Alternatives considered.** Adding a `useReducedMotion()` check individually to every component that uses Framer Motion.

**Final reasoning.** A per-component check would need to be remembered and correctly applied every time a new animated component is built — an easy requirement to silently miss. Framer Motion's built-in `MotionConfig` mechanism solves this once, for the entire app, with no per-component discipline required going forward.

**Consequences.** This was implemented as a Blocking finding during a scoped review specifically because "reduced motion support" was an explicit, named requirement of that review — a good example of a review process catching something structurally, not just fixing an isolated instance of it.

---

## 17. QA-Driven Release Candidate Process

**Decision.** Each Release Candidate phase paired an implementation pass with a distinct, explicit verification pass that checked claims against the actual code rather than trusting a summary of work done.

**Context.** Established as the project moved from active feature development into hardening — most concretely visible in the final release readiness review, which directly re-verified several specific claims from a prior implementation summary.

**Alternatives considered.** Treating a phase's own completion summary as sufficient evidence the work was done correctly.

**Final reasoning.** A completion summary is a claim, not a proof. This project's review process treated every such claim as needing independent verification — and this was not a hypothetical precaution: the final review found one claim ("particle resize is throttled") that did not match the actual code at all, alongside a genuine, previously-unreported bug (a camera stream that could leak past component unmount) that no summary had mentioned.

**Consequences.** Two real issues were caught specifically because the process didn't stop at reading a summary. This is recorded here as a decision because it shaped how the entire Release Candidate stage was run, not just as an incidental finding.

---

## 18. Why Reconnect Synchronization Was Intentionally Deferred

**Decision.** Full match-state resynchronization for a client reconnecting mid-round was identified, repeatedly reconsidered, and deliberately not implemented in this Release Candidate.

**Context.** First identified during the Multiplayer Synchronization milestone (Lobby-level reconnect), and explicitly re-raised at nearly every subsequent gameplay milestone as a known gap that extends into each new capability as it's built.

**Alternatives considered.** Building a general "resync full match state on reconnect" mechanism at the point it was first identified.

**Final reasoning.** Two things kept this out of scope every time it was reconsidered: first, the actual exposure window is narrow by design — the gesture-lock deadline (6 seconds) is deliberately shorter than the reconnect grace period (20 seconds), so most disconnects during a round resolve via the existing stall-timeout machinery before a resync would even matter. Second, a correct fix requires new protocol surface (some way for a reconnecting client to ask "what's the current state of my match"), which directly conflicts with the "frozen architecture" and "no additional networking infrastructure" constraints that were explicitly in force during every phase where this was reconsidered.

**Consequences.** This is documented as a known limitation, not a hidden one — every review pass from Milestone 5 onward re-confirmed and re-classified it rather than letting it quietly disappear from consideration.

---

## 19. Why Rate Limiting Is Treated as a Deployment Concern

**Decision.** `rateLimitMiddleware` remains an explicit no-op through the entire development process, promoted from "not yet needed" to "release gate" only once the project reached Release Candidate.

**Context.** Scaffolded as a structural stub at Foundation, with its own source comment stating real thresholds would be set "once real traffic patterns are visible."

**Alternatives considered.** Picking arbitrary rate-limit thresholds early in development, to have *something* in place.

**Final reasoning.** Meaningful rate limits depend on knowing what legitimate usage looks like — how often a real player actually re-emits a ready toggle, how quickly a real gesture lock can legitimately follow a countdown's "GO." Setting thresholds without that data risks either being too permissive to prevent abuse or too strict for real players, and this project never had production traffic to calibrate against. Leaving the middleware slot wired in but inert kept the *integration point* ready without pretending to have solved a problem that wasn't actually solvable yet.

**Consequences.** This is the single item in the entire project classified as a hard release gate rather than a deferred improvement — everything else can ship and be improved after the fact; an unthrottled public multiplayer server cannot responsibly ship at all.

---

## 20. Lessons Learned

A few genuine observations from the project's actual history, not idealized retrospectively:

**Explicit review passes caught real bugs that summaries alone would have missed.** The missing `toggleReady` method (left behind by an earlier rewrite, silently broken until a dedicated review traced the actual call sites), the false "particle resize throttled" claim, and the camera-unmount resource leak were all found by verification against code, not by reading about what had supposedly been done.

**"Frozen architecture," stated explicitly and re-affirmed at each phase boundary, measurably prevented scope drift.** Proposed changes that would have violated a freeze (a parallel countdown-tracking map, a reconnect-recovery feature during a frozen gameplay stage) were caught and redirected before implementation, not after.

**Type-only shared packages are close to free.** `packages/shared-types` eliminated an entire bug class (client/server contract drift) for effectively zero runtime cost, once it was correctly recognized that a type-only package needs no build step at all.

**A claim should be verified against the code before being trusted — including a claim about one's own prior work.** This is the single most repeated pattern across this project's review history, and it held up as genuinely valuable every time it caught something: the discipline of re-checking rather than assuming is what a "final review" is actually for.
