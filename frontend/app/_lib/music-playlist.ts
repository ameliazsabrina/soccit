import { assetUrl } from "./assets";

// Add new background tracks to the backend asset seed, then list their keys here.
// Playback starts at a random track and avoids immediate repeats.
export const MUSIC_TRACKS: readonly [string, ...string[]] = [
  assetUrl("sounds/music.mp3"),
  assetUrl("sounds/music1.mp3"),
  assetUrl("sounds/music2.mp3"),
  assetUrl("sounds/music3.mp3"),
] as const;
