// App audio manager: low-latency Web Audio for VFX plus looping background
// music. Browsers may block autoplay until the first gesture; initOnGesture()
// starts both systems at the earliest permitted moment.

type SoundName = "hover" | "click";

export type SoundSettings = {
  muted: boolean;
  musicVolume: number;
  vfxVolume: number;
};

const HOVER_COOLDOWN_MS = 70;
const HOVER_ELEMENT_MS = 500;
const MUSIC_SRC = "/sounds/music.mp3";

function storedNumber(key: string, fallback: number) {
  if (typeof window === "undefined") return fallback;
  const value = Number(window.localStorage.getItem(key));
  return Number.isFinite(value) ? Math.min(1, Math.max(0, value)) : fallback;
}

class SoundManager {
  private ctx: AudioContext | null = null;
  private buffers: Partial<Record<SoundName, AudioBuffer>> = {};
  private loaded = false;
  private loading: Promise<void> | null = null;
  private music: HTMLAudioElement | null = null;
  private settings: SoundSettings = {
    muted: false,
    musicVolume: 0.4,
    vfxVolume: 0.75,
  };
  private listeners = new Set<(settings: SoundSettings) => void>();
  private lastHoverEl: WeakRef<Element> | null = null;
  private lastHoverAt = 0;

  constructor() {
    if (typeof window === "undefined") return;
    this.settings = {
      muted: window.localStorage.getItem("soccit-sound-muted") === "1",
      musicVolume: storedNumber("soccit-music-volume", 0.4),
      vfxVolume: storedNumber("soccit-vfx-volume", 0.75),
    };
  }

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

  private ensureMusic(): HTMLAudioElement | null {
    if (this.music) return this.music;
    if (typeof window === "undefined") return null;
    const music = new Audio(MUSIC_SRC);
    music.loop = true;
    music.preload = "auto";
    this.music = music;
    this.syncMusic();
    return music;
  }

  private syncMusic() {
    if (!this.music) return;
    this.music.muted = this.settings.muted;
    this.music.volume = this.settings.musicVolume;
    if (this.settings.musicVolume === 0 || this.settings.muted) {
      this.music.pause();
    }
  }

  private async startMusic() {
    const music = this.ensureMusic();
    if (!music || this.settings.muted || this.settings.musicVolume === 0) return;
    this.syncMusic();
    try {
      await music.play();
    } catch {
      // Missing future asset or browser autoplay policy; the next gesture retries.
    }
  }

  /** Initialise both audio systems on the first browser-permitted gesture. */
  initOnGesture(): Promise<void> {
    const ctx = this.ensureContext();
    void this.startMusic();
    if (!ctx) return Promise.resolve();
    if (ctx.state === "suspended") void ctx.resume();
    if (this.loaded) return Promise.resolve();
    if (this.loading) return this.loading;
    this.loading = Promise.all([this.load("hover"), this.load("click")]).then(
      () => {
        this.loaded = true;
        this.loading = null;
      },
    );
    return this.loading;
  }

  /** Best-effort autoplay; initOnGesture retries when browser policy blocks it. */
  attemptAutoplay() {
    return this.startMusic();
  }

  private async load(name: SoundName) {
    if (this.buffers[name]) return;
    const ctx = this.ctx;
    if (!ctx) return;
    try {
      const response = await fetch(`/sounds/${name}.wav`, {
        cache: "force-cache",
      });
      if (!response.ok) return;
      const bytes = await response.arrayBuffer();
      const buffer = await ctx.decodeAudioData(bytes);
      this.buffers[name] = buffer ?? undefined;
    } catch {
      // Missing or undecodable VFX stay silent.
    }
  }

  getSettings(): SoundSettings {
    return { ...this.settings };
  }

  subscribe(listener: (settings: SoundSettings) => void) {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  private publish() {
    const snapshot = this.getSettings();
    for (const listener of this.listeners) listener(snapshot);
  }

  isMuted() {
    return this.settings.muted;
  }

  setMuted(muted: boolean) {
    this.settings.muted = muted;
    if (typeof window !== "undefined") {
      window.localStorage.setItem("soccit-sound-muted", muted ? "1" : "0");
    }
    this.syncMusic();
    if (!muted) void this.startMusic();
    this.publish();
  }

  setMusicVolume(volume: number) {
    this.settings.musicVolume = Math.min(1, Math.max(0, volume));
    if (typeof window !== "undefined") {
      window.localStorage.setItem(
        "soccit-music-volume",
        String(this.settings.musicVolume),
      );
    }
    this.syncMusic();
    if (!this.settings.muted && this.settings.musicVolume > 0) {
      void this.startMusic();
    }
    this.publish();
  }

  setVfxVolume(volume: number) {
    this.settings.vfxVolume = Math.min(1, Math.max(0, volume));
    if (typeof window !== "undefined") {
      window.localStorage.setItem(
        "soccit-vfx-volume",
        String(this.settings.vfxVolume),
      );
    }
    this.publish();
  }

  playHover(element?: Element | null) {
    if (this.settings.muted || this.settings.vfxVolume === 0) return;
    const now =
      typeof performance !== "undefined" ? performance.now() : Date.now();
    if (now - this.lastHoverAt < HOVER_COOLDOWN_MS) return;
    const sameElement = element && this.lastHoverEl?.deref?.() === element;
    if (sameElement && now - this.lastHoverAt < HOVER_ELEMENT_MS) return;
    this.lastHoverAt = now;
    if (element) this.lastHoverEl = new WeakRef(element);
    this.play("hover", 0.22);
  }

  playClick() {
    if (this.settings.muted || this.settings.vfxVolume === 0) return;
    this.play("click", 0.45);
  }

  private play(name: SoundName, baseVolume: number) {
    const ctx = this.ctx;
    const buffer = this.buffers[name];
    if (!ctx || !buffer) return;
    if (ctx.state === "suspended") void ctx.resume();
    const gain = ctx.createGain();
    gain.gain.value = baseVolume * this.settings.vfxVolume;
    const source = ctx.createBufferSource();
    source.buffer = buffer;
    source.connect(gain).connect(ctx.destination);
    source.start();
  }
}

export const sound = new SoundManager();
