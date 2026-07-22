# RockLink — Project Blueprint
### Real-Time Multiplayer Rock Paper Scissors via Hand Gesture Detection

Status: **Approved — Phase 1 in progress**

**Source of truth:** This document and `Design-System.md` are the two canonical references for RockLink. Any implementation decision that contradicts either document should trigger a discussion, not a silent deviation — update the doc first, then the code.

---

## 1. System Architecture

RockLink is a **thin-client, authoritative-server** real-time game. The browser does all camera/vision work; the server does all game-truth work.

```
┌─────────────────────────┐        WebSocket (Socket.IO)        ┌──────────────────────────┐
│        CLIENT (x2)      │ ◄──────────────────────────────────►│         SERVER            │
│                          │                                      │                          │
│  Camera → MediaPipe      │   emits: gesture, ready, rematch     │  RoomManager (in-memory)  │
│  Hands → Gesture         │   ------------------------------->   │  GameEngine (compare)     │
│  Classifier (local)      │                                      │  Countdown Authority      │
│                          │   receives: countdown, reveal,       │  Socket.IO event router   │
│  React UI + Framer       │              score, opponentState    │                          │
│  Motion + Zustand/Context│  <-------------------------------    │  Express (health/HTTP)    │
└─────────────────────────┘                                      └──────────────────────────┘
        Vercel (static + edge)                                        Render (Node process)
```

**Core principle:** video frames never leave the device. Only a discrete gesture enum (`ROCK | PAPER | SCISSORS`) and control events (ready, lock, rematch-request) cross the wire. The server is the single source of truth for *timing* (countdown) and *outcome* (winner), so two clients can never disagree about what happened.

**Why authoritative server for timing/outcome, not gestures:**
- Gesture detection is expensive (ML inference) and privacy-sensitive → must stay client-side.
- Timing and win/loss logic are cheap and must be tamper-proof and consistent → must stay server-side.
- This split is what makes cheating (e.g. editing client code to always win) require server-side gesture spoofing only, which is a much narrower attack surface than trusting client-declared winners.

---

## 2. Complete Folder Structure

```
rocklink/
├── apps/
│   ├── client/                          # React + Vite app (Vercel)
│   │   ├── public/
│   │   │   └── models/                  # MediaPipe wasm/model assets (self-hosted, no CDN dependency)
│   │   ├── src/
│   │   │   ├── app/
│   │   │   │   ├── App.tsx
│   │   │   │   ├── router.tsx           # React Router route table
│   │   │   │   └── providers.tsx        # composed context providers
│   │   │   ├── features/
│   │   │   │   ├── home/
│   │   │   │   │   ├── components/
│   │   │   │   │   └── HomePage.tsx
│   │   │   │   ├── lobby/
│   │   │   │   │   ├── components/      # RoomCard, PlayerSlot, ShareLink
│   │   │   │   │   ├── hooks/           # useLobbySocket
│   │   │   │   │   └── LobbyPage.tsx
│   │   │   │   ├── camera/
│   │   │   │   │   ├── components/      # CameraPermissionGate, CameraPreview
│   │   │   │   │   ├── hooks/           # useCameraStream
│   │   │   │   │   └── utils/
│   │   │   │   ├── gesture-detection/
│   │   │   │   │   ├── mediapipe/       # hands model init, landmark config
│   │   │   │   │   ├── classifier/      # landmark → ROCK/PAPER/SCISSORS logic
│   │   │   │   │   ├── hooks/           # useGestureDetector
│   │   │   │   │   └── types.ts
│   │   │   │   ├── match/
│   │   │   │   │   ├── components/      # CountdownOverlay, GestureLockButton,
│   │   │   │   │   │                     # WinnerRevealCard, ScoreBoard
│   │   │   │   │   ├── hooks/           # useMatchSocket, useCountdownSync
│   │   │   │   │   ├── store/           # useMatchStore.ts (Zustand)
│   │   │   │   │   └── MatchPage.tsx
│   │   │   │   └── rematch/
│   │   │   │       └── components/
│   │   │   ├── shared/
│   │   │   │   ├── components/          # Button, GlassPanel, Modal, ParticleField
│   │   │   │   ├── animations/          # framer-motion variants, transitions.ts
│   │   │   │   ├── hooks/               # useSocket (singleton), useMediaQuery
│   │   │   │   ├── services/
│   │   │   │   │   ├── socket/          # socket client instance + typed emitters
│   │   │   │   │   └── audio/           # AudioManager, audioSprites, useAudioCue
│   │   │   │   ├── types/               # shared TS types (mirrors backend contract)
│   │   │   │   ├── utils/
│   │   │   │   └── constants/           # colors, timing constants, routes
│   │   │   ├── styles/
│   │   │   │   ├── tailwind.css
│   │   │   │   └── tokens.css           # CSS variables for design system
│   │   │   └── main.tsx
│   │   ├── index.html
│   │   ├── vite.config.ts
│   │   ├── tailwind.config.ts
│   │   ├── tsconfig.json
│   │   └── package.json
│   │
│   └── server/                          # Node + Express + Socket.IO (Render)
│       ├── src/
│       │   ├── index.ts                 # entrypoint, HTTP+socket bootstrap
│       │   ├── config/                  # env, CORS, constants (timings, room limits)
│       │   ├── rooms/
│       │   │   ├── RoomManager.ts       # in-memory Map<roomId, Room> (Redis-swappable interface)
│       │   │   ├── Room.ts              # single room state machine
│       │   │   └── types.ts
│       │   ├── game/
│       │   │   ├── GameEngine.ts        # gesture comparison, win logic
│       │   │   ├── CountdownAuthority.ts# server-timestamp countdown emitter
│       │   │   └── types.ts
│       │   ├── sockets/
│       │   │   ├── index.ts             # socket.io server init
│       │   │   ├── handlers/            # room.handlers.ts, match.handlers.ts
│       │   │   └── middleware/          # rate limiting, validation
│       │   ├── http/
│       │   │   └── health.routes.ts     # /health for Render
│       │   └── utils/
│       ├── tsconfig.json
│       └── package.json
│
├── packages/
│   └── shared-types/                    # optional: npm workspace shared between
│                                         # client & server for event contracts
│       ├── src/events.ts                # SocketEventName enums + payload types
│       └── package.json
│
├── .github/
│   └── workflows/                       # CI: lint, typecheck, build on PR
├── package.json                         # workspace root (pnpm/npm workspaces)
├── pnpm-workspace.yaml
└── README.md
```

**Why a monorepo with a `shared-types` package:** the single biggest source of real-time-game bugs is client/server event payloads drifting out of sync. A shared types package makes that a compile-time error instead of a runtime mystery. This is additive — if you'd rather keep client/server fully separate repos initially, the same folder shapes work standalone and we adopt `shared-types` later without a rewrite.

---

## 3. Component Hierarchy (Client)

```
App
└── RouterProvider
    ├── HomePage
    │   ├── HeroPanel
    │   ├── CreateRoomButton
    │   └── JoinRoomForm
    │
    ├── LobbyPage (/room/:roomId)
    │   ├── ShareLinkPanel
    │   ├── PlayerSlot (self)
    │   ├── PlayerSlot (opponent)
    │   └── ReadyToggle
    │
    ├── MatchPage (/room/:roomId/match)
    │   ├── CameraPermissionGate
    │   │   └── CameraPreview
    │   ├── GestureDetectionLayer (invisible logic layer, MediaPipe hook)
    │   ├── CountdownOverlay          (3 → 2 → 1 → GO)
    │   ├── GestureLockIndicator      (shows local lock state + opponent lock state)
    │   ├── WinnerRevealCard          (animated reveal, both gestures shown)
    │   ├── ScoreBoard                (live running score)
    │   └── RematchPanel              (request / waiting / accepted)
    │
    └── NotFoundPage

Shared / cross-cutting (rendered at App shell level):
    ├── ParticleBackground
    ├── ToastLayer (connection lost, opponent disconnected, errors)
    └── ConnectionStatusBadge
```

**State ownership rule:** `useMatchStore` (Zustand) owns match-phase state (`lobby → countdown → detecting → locked → revealed → rematch`) and is the *only* thing allowed to transition phases, driven by socket events — components subscribe to slices of it, they don't self-manage phase transitions. This avoids the classic bug where two components independently decide "we're in countdown now" and drift apart.

---

## 4. Backend Architecture

**Layers:**
1. **Transport** — Express (HTTP, for `/health` and future REST needs) + Socket.IO (game transport).
2. **Room layer** (`RoomManager` / `Room`) — owns room lifecycle: create, join, leave, destroy-on-empty, TTL cleanup for abandoned rooms.
3. **Game layer** (`GameEngine` / `CountdownAuthority`) — pure logic, no socket knowledge. Takes two gestures, returns a result. Takes a "start countdown" call, emits timestamped ticks. This separation means `GameEngine` is unit-testable with zero mocking of sockets.
4. **Socket handler layer** — thin adapters that receive socket events, call into Room/Game layer, and re-emit results. Handlers contain no game logic themselves — this is what lets us swap Socket.IO for another transport later without touching game rules.

**Room state machine** (per room):
```
WAITING_FOR_PLAYER → BOTH_CONNECTED → READY_CHECK → COUNTDOWN
    → AWAITING_GESTURES → COMPARING → REVEALED → REMATCH_PENDING → COUNTDOWN (loop)
```

**RoomManager design (already decided, carried forward):**
- In-memory `Map<roomId, Room>` for now.
- Room interface deliberately mirrors what a Redis-backed store would need (`get`, `set`, `delete`, `list-by-ttl`) so migrating to Redis later is a swap of the storage adapter, not a rewrite of room logic.
- Each room auto-expires after inactivity (e.g. 10 min no activity) to prevent memory leaks on a single Render instance.

**Horizontal scaling note (future):** in-memory RoomManager means a room is pinned to one server process. Fine for MVP/single Render instance. Documented now so it's not a surprise later — see Section 15.

---

## 5. Socket.IO Event Flow

**Naming convention:** `namespace:action`, past-tense for server→client confirmations, imperative for client→server requests.

| Direction | Event | Payload | Purpose |
|---|---|---|---|
| C → S | `room:create` | `{}` | Create a new room, become host |
| S → C | `room:created` | `{ roomId }` | Confirm creation, return shareable id |
| C → S | `room:join` | `{ roomId }` | Join existing room |
| S → C | `room:joined` | `{ roomId, players }` | Confirm join, current occupants |
| S → C | `room:playerJoined` | `{ player }` | Notify existing player of new joiner |
| S → C | `room:full` / `room:notFound` | `{ reason }` | Join rejected |
| C → S | `room:ready` | `{}` | Player signals ready for match |
| S → C | `match:bothReady` | `{}` | Both players ready, countdown imminent |
| S → C | `match:countdownTick` | `{ value, serverTimestamp }` | Authoritative countdown tick (3,2,1,GO) |
| C → S | `match:gestureLock` | `{ gesture }` | Client sends locked gesture (only after GO) |
| S → C | `match:opponentLocked` | `{}` | Notify opponent locked (no gesture leaked yet) |
| S → C | `match:result` | `{ winner, gestures: {p1, p2}, score }` | Authoritative outcome, both gestures revealed simultaneously |
| C → S | `match:rematchRequest` | `{}` | Request another round |
| S → C | `match:rematchPending` | `{ requestedBy }` | Notify other player |
| S → C | `match:rematchAccepted` | `{}` | Both agreed, loop back to countdown |
| S → C | `room:playerLeft` | `{}` | Opponent disconnected |
| S → C | `error:generic` | `{ code, message }` | Typed error channel |

**Critical rule:** `match:opponentLocked` never includes the gesture value. Gestures are withheld server-side until *both* players have locked, then released together in `match:result`. This prevents a fast client from inferring the opponent's move by peeking at network traffic before locking their own.

**Countdown authority pattern:** the server emits `serverTimestamp` with each tick; the client computes local countdown display from `serverTimestamp - Date.now() + estimatedLatency`, not from a local `setTimeout` chain alone. This keeps both players' visual countdowns tightly synced even under moderate latency variance, and — more importantly — the server (not the client clock) decides the exact moment the "gesture window" opens and closes.

---

## 6. Game State Management (Client)

**Decision: Zustand store for match state, Context reserved for narrow scoping needs.** A `useMatchStore` (Zustand) holds the match-phase state machine and is the single source of truth read by every component in the `match` feature — no prop drilling, no provider nesting. Context is still used, but only where its actual strength applies: things like theme/reduced-motion preference or a scoped socket instance for a specific room, where React's built-in scoping (not global state) is the right tool. As a rule of thumb: if two unrelated components need the same piece of state without a natural parent/child relationship, it belongs in Zustand; if it's inherently tied to "everything under this one provider," Context is fine.

```
MatchState {
  phase: 'lobby' | 'countdown' | 'detecting' | 'locked' | 'revealed' | 'rematch-pending'
  countdownValue: number | null
  localGesture: Gesture | null
  localLocked: boolean
  opponentLocked: boolean
  result: { winner: 'p1' | 'p2' | 'draw', gestures: {...} } | null
  score: { self: number, opponent: number }
  connectionStatus: 'connected' | 'reconnecting' | 'disconnected'

  // actions
  handleCountdownTick(value, serverTimestamp): void
  handleOpponentLocked(): void
  handleMatchResult(result): void
  handlePlayerLeft(): void
  reset(): void
}
```

Store actions map 1:1 to socket events received (`countdownTick`, `opponentLocked`, `result`, `playerLeft`, etc.) — socket handlers call store actions directly, and store actions are pure enough to unit test without mocking React at all. Animation/timing side effects (triggering a Framer Motion sequence when `phase` changes) live in component-level `useEffect`s that subscribe to the relevant slice of the store, not inside the store actions themselves — this keeps the store itself framework-agnostic and easy to test.

**Why this changes from the original Context+reducer plan:** Zustand gives the same explicit, event-driven update model as a reducer, but without provider-tree coupling — any component can subscribe to exactly the slice it needs (e.g. `ScoreBoard` only re-renders on `score` changes, not on every `countdownValue` tick), which matters here since countdown ticks and lock-state changes are high-frequency during a match.

---

## 7. MediaPipe Integration Plan

**Pipeline:**
```
Camera stream (getUserMedia)
   → MediaPipe Hands (landmark detection, 21 points/hand)
   → Gesture Classifier (rule-based: finger-curl heuristics on landmark angles)
   → Debounce/Confidence layer (require N consecutive consistent frames)
   → Local gesture state (ROCK | PAPER | SCISSORS | UNKNOWN)
   → On "GO" + user holds gesture through lock window → emit match:gestureLock
```

**Key decisions:**
- **Self-hosted model assets** (`public/models/`) rather than pulling from a CDN at runtime — avoids a third-party network dependency mid-match and improves cold-load reliability.
- **Rule-based classifier first** (finger curl/extension geometry from landmarks), not a trained ML classifier — ships faster, fully explainable, no training data needed. Revisit only if rock/paper/scissors distinction proves unreliable in testing.
- **Confidence debounce:** classify every frame, but only accept a gesture as "locked-in ready" after it's been stable for ~200–300ms, to avoid a hand mid-transition being misread.
- **Resource discipline:** MediaPipe inference is paused/torn down whenever `phase !== 'detecting'` (i.e., not during lobby, not during reveal) to avoid burning CPU/GPU and battery when it's not needed.
- **Graceful degradation:** if camera permission is denied or no hand is detected within a timeout, show a clear retry/troubleshooting UI rather than a silent hang.

---

## 7a. AudioManager Architecture (Future Game Sounds)

No audio ships in the initial phases, but the architecture is scaffolded now so sound can be dropped in later without touching game logic.

```
shared/services/audio/
├── AudioManager.ts        # singleton: load, play, stop, setVolume, mute
├── audioSprites.ts        # named sound keys → asset paths (SFX only, no music files yet)
└── useAudioCue.ts         # hook: subscribes to match-store phase changes, fires cues
```

**Design decisions:**
- `AudioManager` is a plain TypeScript singleton (not a React component) using the Web Audio API — this keeps it usable from both React components and non-React code (e.g. a future service worker or a socket handler) without React as a dependency.
- Sound cues are triggered by **subscribing to existing state** (match-store phase transitions, socket events) via `useAudioCue`, never by adding new "play sound" calls scattered inside game logic — this means audio is purely additive and can be deleted with zero impact on match correctness.
- Named sound keys (`'countdown.tick'`, `'match.win'`, `'match.lose'`, `'ui.hover'`, `'ui.lock'`) are defined once in `audioSprites.ts` so components never reference raw file paths.
- Respects a `muted` preference (persisted client-side) and browser autoplay restrictions — audio only initializes after a user gesture (e.g. the first "Ready" click), which conveniently already exists in the game flow.
- **Phase to introduce:** stub the folder and interface in Phase 1 (empty/no-op implementation), wire real SFX in Phase 5 (Polish) — see Section 11.

---

## 8. UI Design System

**This section is a summary. The full, authoritative design system — including component states, spacing scale, iconography, motion timing values, and accessibility rules — lives in the companion document `Design-System.md`, which must be finalized before any page-level UI is built.** The tokens below are the minimum shared here for architectural context.

**Foundation (from your existing spec, formalized as design tokens):**

| Token | Value | Usage |
|---|---|---|
| `--color-bg` | `#050816` | App background |
| `--color-primary` | `#6C63FF` | Primary actions, focus states |
| `--color-secondary` | `#00E5FF` | Highlights, secondary CTAs |
| `--color-accent` | `#B517FF` | Special moments (winner reveal) |
| `--color-success` | `#00FF88` | Win states |
| `--color-danger` | `#FF4D6D` | Loss/error states |
| `--color-glass` | `rgba(255,255,255,0.08)` | Panel surfaces |

**Typography:** Space Grotesk for display/headings, Inter for body/UI text — enforced via a `Heading`/`Text` component pair, never raw `<h1>`/`<p>` with inline fonts, so type usage stays consistent across features.

**Core primitives (built once in `shared/components`, reused everywhere):**
- `GlassPanel` — the base glassmorphic surface (blur + border-gradient + soft shadow), parameterized by glow color.
- `Button` — variants: primary (gradient glow), ghost, danger — with premium hover/press micro-interactions built in once.
- `ParticleField` — background ambient particles, mounted once at shell level, not re-instantiated per page.
- `Skeleton` — shaped loading placeholders (e.g. `SkeletonPanel`, `SkeletonText`) matching the glass aesthetic, used everywhere something is loading. **Plain "Loading..." text is not used anywhere in the product** — every async wait gets a skeleton shaped like the content it's replacing.
- `ErrorState` — a single reusable component for inline errors (connection lost, room not found, camera denied, etc.) with an icon, a plain-language explanation, and a clear recovery action (retry/back). **Plain browser `alert()`s or bare error text are not used anywhere** — all failure states go through this component so they match the visual language instead of breaking it.
- Animation variants library (`shared/animations`) — named Framer Motion variants (`fadeUp`, `glowPulse`, `cardFlip`, `countdownPop`) reused across features instead of ad-hoc inline animation props, so motion language stays consistent.

**Why centralize primitives before building pages:** this is the single highest-leverage architectural decision for "looking premium" — if `GlassPanel`/`Button`/`Skeleton`/`ErrorState`/animation variants are solid and reused everywhere, every new page automatically inherits the AAA feel with zero extra design work per page, and no page ever falls back to a generic browser default for loading or failure states.

**File size discipline:** implementation files are kept to roughly 300 lines where practical. When a component, hook, or handler file grows past that, it's a signal to extract a sub-component, a utility, or a smaller hook — not a hard blocking rule, but a default trigger to check whether something should be split into a reusable module. This keeps files reviewable and keeps genuinely reusable logic from getting buried inside a single large file.

---

## 9. Routing Structure

```
/                          → HomePage
/room/:roomId              → LobbyPage      (waiting room, ready-check)
/room/:roomId/match        → MatchPage      (camera, countdown, gesture, reveal, score)
*                          → NotFoundPage
```

- **Guard:** `MatchPage` redirects back to `LobbyPage` if accessed directly without an active room/socket connection (no deep-linking straight into a match).
- **Shareable join link:** `/room/:roomId` is the link players share; joining flows automatically from lobby into match once both are ready — no separate "match URL" is ever shared, keeping the link simple and stable.

---

## 10. Database Requirements

**For MVP: none.** All state is ephemeral and lives in server memory for the lifetime of a room (`RoomManager`). This is intentional — there are no accounts, no persistence needs, no user data to store, which keeps the MVP simple, fast, and privacy-friendly (nothing to leak, nothing to secure at rest).

**When a database becomes necessary (see roadmap):**
- **Leaderboards / Ranked Mode / Profiles / Friends** → needs persistent storage. Recommended: **PostgreSQL** (via a managed provider like Supabase/Neon/Render Postgres) for relational data (users, match history, rankings) — relational fits well since leaderboards/friend graphs benefit from joins and constraints.
- **Redis** → recommended first infrastructure addition regardless of Postgres, specifically to replace in-memory `RoomManager` once you need more than one server instance (see Section 15). This is infrastructure for *scaling the existing game*, not a new feature, so it comes before Postgres in priority.

---

## 11. Development Roadmap (Phased)

**Phase 0 — Architecture Finalization** *(this document)*
Review, adjust, sign off.

**Phase 1 — Foundation**
- `Design-System.md` authored and finalized (precedes UI primitive work)
- Monorepo scaffold, shared-types package, lint/format/tsconfig baseline
- Design system primitives: `GlassPanel`, `Button`, `Skeleton`, `ErrorState`, tokens, typography components
- `ParticleField` background shell
- `AudioManager` folder + no-op stub (real SFX wired in Phase 5)
- Zustand store scaffolding for match state (empty/typed shell)
- Basic routing skeleton (empty pages)

**Phase 2 — Rooms & Lobby**
- Backend: `RoomManager`, `Room` state machine, room socket handlers
- Frontend: HomePage (create/join), LobbyPage, ShareLinkPanel, PlayerSlot
- Connection status handling, reconnect UX

**Phase 3 — Camera & Gesture Detection**
- `CameraPermissionGate`, `useCameraStream`
- MediaPipe Hands integration, landmark pipeline
- Rule-based gesture classifier + confidence debounce
- Local-only gesture preview UI (no server involvement yet)

**Phase 4 — Match Core Loop**
- `CountdownAuthority` (server) + `useCountdownSync` (client)
- Gesture lock flow, `GameEngine` comparison logic
- `WinnerRevealCard`, `ScoreBoard`
- Full end-to-end round: countdown → lock → reveal → score

**Phase 5 — Rematch & Polish**
- Rematch request/accept flow
- Full animation pass (Framer Motion variants across all transitions)
- Error states, disconnect/reconnect handling, edge cases (opponent leaves mid-round, etc.)

**Phase 6 — Deployment & Hardening**
- Vercel + Render deployment, environment config, CORS lockdown
- Load/latency testing, performance pass
- Beta test with real users

**Phase 7+ — Future Features** (see Section 15)
Tournament mode, voice chat, emoji reactions, friends, leaderboards, achievements, profiles, ranked mode.

---

## 12. Deployment Strategy

**Frontend (Vercel):**
- Static build via Vite, deployed on push to `main` (preview deployments on PRs).
- Environment variable for backend socket URL (`VITE_SERVER_URL`), never hardcoded.

**Backend (Render):**
- Node web service running the Express + Socket.IO server.
- `/health` HTTP endpoint for Render's health checks.
- Environment variables for allowed CORS origin (Vercel URL), port, room TTL config.
- **Sticky sessions consideration:** Socket.IO with a single Render instance needs no special session affinity; if scaled to multiple instances later, Render's load balancer + Socket.IO's own sticky-session support (or a Redis adapter for Socket.IO) becomes required — flagged now, addressed in Phase 7+/scaling.

**CI (GitHub Actions):**
- On PR: install, typecheck, lint, build both apps — fail fast before merge.
- Deployment itself is handled by Vercel/Render's native git integration, not custom CI scripts.

---

## 13. Testing Strategy

| Layer | Approach | Tooling |
|---|---|---|
| Game logic (`GameEngine`, `Room` state machine) | Unit tests — pure functions, no mocks needed | Vitest |
| Socket handlers | Integration tests with an in-memory Socket.IO client/server pair | Vitest + `socket.io-client` |
| Gesture classifier | Unit tests against recorded landmark fixtures (sample hand poses → expected gesture) | Vitest |
| React components (primitives, cards) | Component tests for rendering + interaction states | React Testing Library |
| Critical user flow (create room → join → match → result) | End-to-end happy-path test | Playwright |
| Manual/exploratory | Real-device camera/gesture accuracy testing across lighting conditions — this genuinely can't be fully automated | Manual test checklist |

**Priority order:** `GameEngine`/`Room` state machine tests first (cheapest, highest-value — this is the part that must never be wrong), then socket integration, then E2E happy path. Gesture-classifier fixture tests added once the classifier is implemented in Phase 3.

---

## 14. Performance Optimization Plan

- **MediaPipe:** run detection at a capped frame rate (e.g. throttle to ~15fps analysis even if camera streams at 30/60fps) — hand gesture classification doesn't need full frame rate, and this alone is often the biggest CPU/battery win.
- **React:** memoize `CameraPreview`, `ParticleField`, and any component receiving high-frequency landmark updates; keep landmark data out of React state entirely where possible (use refs) since it changes every frame and React re-renders are the wrong tool for that.
- **Framer Motion:** prefer `transform`/`opacity` animations (GPU-accelerated) over layout-affecting properties; use `layout` prop sparingly.
- **Socket.IO:** payloads are tiny by design (gesture enums, not video) — the real discipline is *event frequency*, not payload size: no per-frame emits, only discrete state-transition emits.
- **Bundle size:** lazy-load the `gesture-detection` feature (MediaPipe + model assets) only when entering `MatchPage`, not on initial app load — HomePage/LobbyPage should load fast with zero ML weight.
- **Server:** stateless-per-room design means CPU cost scales with concurrent active rooms, not total registered users — no persistent per-user cost when idle.

---

## 15. Future Scalability Plan

| Feature | Architectural Impact | Notes |
|---|---|---|
| **Redis-backed RoomManager** | Swap in-memory `Map` for Redis adapter behind the same `RoomManager` interface | Needed before running >1 server instance; interface already designed for this swap |
| **Socket.IO Redis adapter** | Enables pub/sub across multiple Node instances so players on different servers can still be matched/communicate | Pairs with Redis RoomManager |
| **Leaderboards / Ranked Mode / Profiles** | Introduces PostgreSQL, auth (likely OAuth), and a REST or tRPC layer alongside sockets | New `packages/`/`apps/api` layer, doesn't disturb existing match-loop code |
| **Friends** | Needs persistent user identity → depends on Profiles first | |
| **Tournament Mode** | New `Room` variant (bracket-aware) built on top of existing `GameEngine`/countdown primitives, not a replacement | Reuses match-loop core |
| **Voice Chat** | WebRTC peer connection alongside existing Socket.IO signaling channel | Socket.IO can carry WebRTC signaling messages |
| **Emoji Reactions** | Trivial new socket event (`match:reaction`) + UI overlay | Lowest-effort addition |
| **Achievements** | Depends on persistent match history (Postgres) | Built once Profiles/DB layer exists |

**Guiding principle for all future work:** every future feature should be addable as a *new* feature folder (`features/tournament`, `features/voice-chat`, etc.) or a *new* backend layer, without modifying the core match-loop contract (Section 5's event table) in a breaking way. New events get added; existing ones don't change shape.

---

## Approved Additions (incorporated above)

1. ✅ Zustand adopted for client match state (Section 6), Context reserved for narrow scoping cases.
2. ✅ `Design-System.md` established as the companion source-of-truth document (Section 8), finalized before UI build.
3. ✅ `AudioManager` architecture added (Section 7a), stubbed in Phase 1, wired with real sound in Phase 5.
4. ✅ ~300-line file guideline adopted as a default trigger to extract modules, not a hard rule.
5. ✅ Skeleton loading states and a reusable `ErrorState` component adopted in place of plain loading text / `alert()`s (Section 8).
6. ✅ This Blueprint + `Design-System.md` are the two canonical references for the remainder of development.

**Status: Locked. Phase 1 underway.**
