import { useEffect } from "react";
import { AudioManager } from "./AudioManager";
import type { SoundKey } from "./audioSprites";

/**
 * Subscribes to a piece of state and fires a sound cue when it changes.
 * Audio is triggered by subscribing to *existing* state (match phase,
 * socket events) — never by inserting new "play sound" calls into game
 * logic. This keeps audio purely additive: deleting this hook everywhere
 * has zero impact on match correctness. See Blueprint Section 7a.
 */
export function useAudioCue<T>(value: T, soundKey: SoundKey, when: (value: T) => boolean): void {
  useEffect(() => {
    if (when(value)) {
      AudioManager.play(soundKey);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);
}
