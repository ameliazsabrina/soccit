// Web Audio sound-effects manager.
//
// Uses predecoded AudioBuffers for zero-latency playback (no <audio> tag
// seeking/glitches) and lazy-inits the AudioContext on the first user gesture
// so it complies with browser autoplay policies.
//
// Sound files live at /public/sounds/<name>.wav. Replace the placeholder
// silent files with real recordings — same path/filename, no code change.
//
// Recommended source format:
//   WAV (PCM, 16-bit, 44.1 kHz, mono)
//   - hover:  50–120 ms, soft attack, quick fade-out (no click/pop at edges)
//   - click:  80–180 ms, punchy attack, short decay
//   Keep peaks around -3 dBFS to avoid clipping when layered.
//   WAV gives instant playback via decodeAudioData + AudioBufferSourceNode.
//   MP3/OGG also work but add decode cost and tiny first-play latency.

type SoundName = "hover" | "click";

const HOVER_COOLDOWN_MS = 70; // global min gap between hover sounds
const HOVER_ELEMENT_MS = 500; // don't replay on the same element within this window

class SoundManager {
  private ctx: AudioContext | null = null;
  private buffers: Partial<Record<SoundName, AudioBuffer>> = {};
  private loaded = false;
  private loading: Promise<void> | null = null;
  private muted = false;

  private lastHoverEl: WeakRef<Element> | null = null;
  private lastHoverAt = 0;

  constructor() {
    if (typeof window !== "undefined") {
      this.muted =
        window.localStorage.getItem("soccit-sound-muted") === "1";
    }
  }

  /** Lazily create the AudioContext. Must be called from a user gesture. */
  private ensureContext(): AudioContext | null {
    if (this.ctx) return this.ctx;
    if (typeof window === "undefined") return null;
    const Ctx =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext?: typeof AudioContext })
        .webkitAudioContext;
    if (!Ctx) return null;
    this.ctx = new Ctx();
    return this.ctx;
  }

  /** Initialise on first gesture. Safe to call repeatedly. */
  initOnGesture(): Promise<void> {
    const ctx = this.ensureContext();
    if (!ctx) return Promise.resolve();
    if (ctx.state === "suspended") void ctx.resume();
    if (this.loaded) return Promise.resolve();
    if (this.loading) return this.loading;
    this.loading = Promise.all([
      this.load("hover"),
      this.load("click"),
    ]).then(() => {
      this.loaded = true;
      this.loading = null;
    });
    return this.loading;
  }

  private async load(name: SoundName) {
    if (this.buffers[name]) return;
    const ctx = this.ctx;
    if (!ctx) return;
    try {
      const res = await fetch(`/sounds/${name}.wav`, {
        cache: "force-cache",
      });
      if (!res.ok) return;
      const arr = await res.arrayBuffer();
      // decodeAudioData resolves with the buffer in modern browsers.
      const buf = await ctx.decodeAudioData(arr);
      this.buffers[name] = buf ?? undefined;
    } catch {
      // Placeholder missing or decode failed — stay silent.
    }
  }

  isMuted() {
    return this.muted;
  }

  setMuted(m: boolean) {
    this.muted = m;
    if (typeof window !== "undefined") {
      window.localStorage.setItem("soccit-sound-muted", m ? "1" : "0");
    }
  }

  /** Hover sound with global + per-element throttling. */
  playHover(el?: Element | null) {
    if (this.muted) return;
    const now =
      typeof performance !== "undefined" ? performance.now() : Date.now();
    if (now - this.lastHoverAt < HOVER_COOLDOWN_MS) return;
    const sameEl = el && this.lastHoverEl?.deref?.() === el;
    if (sameEl && now - this.lastHoverAt < HOVER_ELEMENT_MS) return;
    this.lastHoverAt = now;
    if (el) this.lastHoverEl = new WeakRef(el);
    this.play("hover", 0.22);
  }

  /** Click/tap sound. */
  playClick() {
    if (this.muted) return;
    this.play("click", 0.45);
  }

  private play(name: SoundName, volume: number) {
    const ctx = this.ctx;
    const buf = this.buffers[name];
    if (!ctx || !buf) return;
    if (ctx.state === "suspended") void ctx.resume();
    const gain = ctx.createGain();
    gain.gain.value = volume;
    const src = ctx.createBufferSource();
    src.buffer = buf;
    src.connect(gain).connect(ctx.destination);
    src.start();
  }
}

export const sound = new SoundManager();
