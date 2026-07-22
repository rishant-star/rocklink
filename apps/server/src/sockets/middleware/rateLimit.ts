import type { Socket } from "socket.io";
import { config } from "../../config/index.js";

type EventName = keyof typeof config.rateLimits.events;

const EVENT_NAMES = new Set(Object.keys(config.rateLimits.events));

/**
 * Fixed-window counter, reset lazily on first hit after the window
 * elapses. Good enough at this project's traffic scale (two-player
 * rooms, single in-memory process — see Blueprint's accepted
 * scalability trade-off) without pulling in a dependency for a proper
 * sliding-window/token-bucket implementation.
 */
class FixedWindowCounter {
  private windowStart = 0;
  private count = 0;

  /** Returns true if this hit is allowed, false if the limit is exceeded. */
  hit(max: number, windowMs: number, now: number): boolean {
    if (now - this.windowStart >= windowMs) {
      this.windowStart = now;
      this.count = 0;
    }
    this.count += 1;
    return this.count <= max;
  }

  /** True if this counter's window started before `cutoff` — safe to evict. */
  isStale(cutoff: number): boolean {
    return this.windowStart < cutoff;
  }
}

/**
 * Connection-level gate (Socket.IO `io.use`): limits new connections
 * per client IP per rolling window, mitigating scripted connection
 * floods before a socket is ever fully established. Rejecting via
 * `next(new Error(...))` is Socket.IO's built-in mechanism for refusing
 * a handshake — the client sees a `connect_error`, no new event
 * contract required.
 */
const connectionCounters = new Map<string, FixedWindowCounter>();

// Without this, `connectionCounters` would grow by one entry per
// distinct client IP ever seen, forever, for the lifetime of the
// process — a slow memory leak on a long-running server. Unref'd so it
// never keeps the process alive on its own (matches the resource-
// cleanup discipline already applied to Room's own timers).
setInterval(
  () => {
    const cutoff = Date.now() - config.rateLimits.connectionsPerIp.windowMs;
    for (const [ip, counter] of connectionCounters) {
      if (counter.isStale(cutoff)) {
        connectionCounters.delete(ip);
      }
    }
  },
  Math.max(config.rateLimits.connectionsPerIp.windowMs, 60 * 1000),
).unref();

export function connectionRateLimitMiddleware(socket: Socket, next: (err?: Error) => void) {
  const ip = socket.handshake.address;
  const { max, windowMs } = config.rateLimits.connectionsPerIp;

  let counter = connectionCounters.get(ip);
  if (!counter) {
    counter = new FixedWindowCounter();
    connectionCounters.set(ip, counter);
  }

  if (!counter.hit(max, windowMs, Date.now())) {
    next(new Error("rate_limited"));
    return;
  }
  next();
}

/**
 * Per-socket, per-event gate (Socket.IO `socket.use`): throttles the
 * five real client-to-server events this protocol defines
 * (room:create/join/ready, match:gestureLock/rematchRequest — see
 * room.handlers.ts/match.handlers.ts, this list is exhaustive and
 * doesn't need to change unless a new event is added there). Exceeding
 * a limit silently drops the packet (next() is simply never called) —
 * a dropped `room:ready` or `match:gestureLock` just means the
 * legitimate client tries again on its own next real action, exactly
 * as if the packet had been lost in transit, so no new error event is
 * needed for the normal client to stay correct.
 */
export function createEventRateLimiter() {
  const counters = new Map<EventName, FixedWindowCounter>();

  // Socket.IO's own `socket.use()` typing (`Event = any[]`) is
  // inherently untyped — packet[0] is checked against the known event
  // name set below before anything is trusted.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return function eventRateLimitMiddleware(packet: any[], next: (err?: Error) => void) {
    const eventName = packet[0];
    if (typeof eventName !== "string" || !EVENT_NAMES.has(eventName)) {
      next();
      return;
    }

    const key = eventName as EventName;
    const { max, windowMs } = config.rateLimits.events[key];

    let counter = counters.get(key);
    if (!counter) {
      counter = new FixedWindowCounter();
      counters.set(key, counter);
    }

    if (!counter.hit(max, windowMs, Date.now())) {
      return; // Drop silently — see doc comment above.
    }
    next();
  };
}
