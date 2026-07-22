# Audio assets

`AudioManager` self-hosts these assets (fetched from `/audio/*.mp3`)
rather than pulling them from a CDN at runtime, for the same reason as
`public/models/` — no third-party network dependency mid-match.

**This directory is currently empty and needs to be populated before any
sound will actually play.** `AudioManager` loads each file defensively —
a missing file simply means that one cue never plays, nothing breaks —
but the app is silent until these exist.

Eleven files are required, matching the keys in
`apps/client/src/shared/services/audio/audioSprites.ts` exactly:

```
ui-hover.mp3
ui-click.mp3
ui-lock.mp3
countdown-tick.mp3
countdown-go.mp3
match-win.mp3
match-lose.mp3
match-draw.mp3
player-joined.mp3
player-left.mp3
rematch-accepted.mp3
```

Intended character, per Design-System.md's audio direction: short
(under ~600ms for UI/countdown cues, up to ~2s for match-result
stingers), synthetic, restrained "tech HUD" sound design — not
realistic/organic sound effects. Think Riot Client or Arc Browser, not
an arcade cabinet.

These were never sourced because this project's working environment had
no network path to any audio asset provider and cannot synthesize
production-quality sound design (see RELEASE_SIGNOFF.md Release Gates
#3). Source or record eleven files matching the above filenames and
drop them directly into this directory — no code changes needed.
