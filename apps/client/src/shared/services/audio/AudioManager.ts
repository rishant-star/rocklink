import { AUDIO_SPRITES, type SoundKey } from "./audioSprites";

/**
 * Plain TypeScript singleton (not a React component) so it can be used
 * from both React components and non-React code without React as a
 * dependency. See Blueprint Section 7a.
 *
 * Real Web Audio API playback, wired during Release Candidate 1
 * (Decision 15). The public interface (init/play/setMuted/isMuted) is
 * unchanged from the Phase 1 stub — callers never needed to change
 * shape when real sound was added.
 */
class AudioManagerImpl {
  private muted = false;
  private initialized = false;
  private context: AudioContext | null = null;
  private buffers = new Map<SoundKey, AudioBuffer>();

  /** Must be called after a user gesture (browser autoplay policy). */
  init(): void {
    if (this.initialized) return;
    this.initialized = true;

    try {
      this.context = new AudioContext();
    } catch {
      // Web Audio unavailable in this environment — play() will no-op
      // for every key below since `this.context` stays null.
      return;
    }

    if (this.context.state === "suspended") {
      void this.context.resume();
    }

    (Object.keys(AUDIO_SPRITES) as SoundKey[]).forEach((key) => {
      void this.loadSprite(key);
    });
  }

  /**
   * Loads and decodes one sprite. Deliberately swallows fetch/decode
   * failures per-key rather than throwing — the eleven asset files are
   * a documented release gate (RELEASE_SIGNOFF.md Release Gates #3)
   * that may not exist yet in a given environment, and a missing sound
   * effect must never break gameplay. play() simply no-ops for any key
   * that never made it into `buffers`.
   */
  private async loadSprite(key: SoundKey): Promise<void> {
    if (!this.context) return;
    try {
      const response = await fetch(AUDIO_SPRITES[key]);
      if (!response.ok) return;
      const arrayBuffer = await response.arrayBuffer();
      const audioBuffer = await this.context.decodeAudioData(arrayBuffer);
      this.buffers.set(key, audioBuffer);
    } catch {
      // Missing file, network failure, or undecodable audio — see above.
    }
  }

  play(key: SoundKey): void {
    if (!this.initialized || this.muted || !this.context) return;
    const buffer = this.buffers.get(key);
    if (!buffer) return;

    if (this.context.state === "suspended") {
      void this.context.resume();
    }

    const source = this.context.createBufferSource();
    source.buffer = buffer;
    source.connect(this.context.destination);
    source.start(0);
  }

  setMuted(muted: boolean): void {
    this.muted = muted;
  }

  isMuted(): boolean {
    return this.muted;
  }
}

export const AudioManager = new AudioManagerImpl();
