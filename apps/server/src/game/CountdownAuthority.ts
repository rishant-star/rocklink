import { config } from "../config/index.js";

type TickCallback = (value: number, serverTimestamp: number) => void;
type CompleteCallback = () => void;

/**
 * Emits authoritative, server-timestamped countdown ticks. Clients derive
 * their local display from `serverTimestamp`, not from an independent
 * local timer — this is what keeps both players' countdowns tightly
 * synced and makes the server (not either client) the one that decides
 * exactly when the gesture window opens. See Blueprint Section 5.
 *
 * Every tick — including the first — comes from the same interval,
 * deliberately not fired synchronously on start(). match:bothReady (which
 * triggers the client's Lobby -> Match navigation) and the first tick
 * would otherwise land in the same instant, and a client mid-navigation
 * could miss it entirely.
 */
export class CountdownAuthority {
  private timer?: NodeJS.Timeout;

  start(onTick: TickCallback, onComplete: CompleteCallback): void {
    this.stop(); // Defensive: a stray double-start can't leak a prior interval running alongside the new one.
    let value: number = config.countdown.startValue;

    this.timer = setInterval(() => {
      onTick(value, Date.now());
      if (value === 0) {
        this.stop();
        onComplete();
        return;
      }
      value -= 1;
    }, config.countdown.tickIntervalMs);
  }

  stop(): void {
    if (this.timer) clearInterval(this.timer);
  }
}
