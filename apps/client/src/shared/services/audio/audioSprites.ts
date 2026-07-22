/**
 * Named sound keys. Components reference these keys, never raw file
 * paths — see Blueprint Section 7a. All eleven cues required by the
 * Release Candidate audio system (Decision 15) are listed here; actual
 * asset files are not yet present (see RELEASE_SIGNOFF.md Release
 * Gates #3) — AudioManager loads each one defensively and simply never
 * plays a key whose file is missing.
 */
export const AUDIO_SPRITES = {
  "ui.hover": "/audio/ui-hover.mp3",
  "ui.click": "/audio/ui-click.mp3",
  "ui.lock": "/audio/ui-lock.mp3",
  "countdown.tick": "/audio/countdown-tick.mp3",
  "countdown.go": "/audio/countdown-go.mp3",
  "match.win": "/audio/match-win.mp3",
  "match.lose": "/audio/match-lose.mp3",
  "match.draw": "/audio/match-draw.mp3",
  "player.joined": "/audio/player-joined.mp3",
  "player.left": "/audio/player-left.mp3",
  "rematch.accepted": "/audio/rematch-accepted.mp3",
} as const;

export type SoundKey = keyof typeof AUDIO_SPRITES;
