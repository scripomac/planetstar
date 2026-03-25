// systems/audio.js
(() => {
  // --- settings ---
  const DEFAULTS = {
    musicEnabled: true,
    sfxEnabled: true,
    musicVolume: 0.35,
    sfxVolume: 0.65,
  };

  // --- internal state ---
  let unlocked = false;
  let musicEl = null;
  let currentMusicSrc = null;

  // simple pool for SFX to avoid "cut off" on rapid eats
  const sfxPool = new Map(); // src -> [Audio,...]
  const POOL_SIZE = 4;

  function clamp(v, a, b) { return Math.max(a, Math.min(b, v)); }

  // read persisted audio prefs (optional, safe)
  function loadPrefs() {
    try {
      const raw = localStorage.getItem("planetstar_audio_v1");
      if (!raw) return { ...DEFAULTS };
      const o = JSON.parse(raw);
      return {
        musicEnabled: typeof o.musicEnabled === "boolean" ? o.musicEnabled : DEFAULTS.musicEnabled,
        sfxEnabled: typeof o.sfxEnabled === "boolean" ? o.sfxEnabled : DEFAULTS.sfxEnabled,
        musicVolume: typeof o.musicVolume === "number" ? clamp(o.musicVolume, 0, 1) : DEFAULTS.musicVolume,
        sfxVolume: typeof o.sfxVolume === "number" ? clamp(o.sfxVolume, 0, 1) : DEFAULTS.sfxVolume,
      };
    } catch {
      return { ...DEFAULTS };
    }
  }

  function savePrefs() {
    try { localStorage.setItem("planetstar_audio_v1", JSON.stringify(prefs)); } catch {}
  }

  let prefs = loadPrefs();

  // --- unlock for iOS: needs user gesture before audio plays ---
  function unlock() {
    if (unlocked) return true;
    unlocked = true;

    // create music element lazily later; here we just try to "prime" audio context
    // by playing a tiny silent sound (works for many browsers)
    try {
      const a = new Audio();
      a.muted = true;
      a.play?.().catch(() => {});
      a.pause?.();
    } catch {}
    return true;
  }

  function bindAutoUnlock() {
    const handler = () => {
      unlock();
      window.removeEventListener("pointerdown", handler, true);
      window.removeEventListener("touchstart", handler, true);
      window.removeEventListener("mousedown", handler, true);
      // if music was requested before unlock, try start again
      if (prefs.musicEnabled && currentMusicSrc) playMusic(currentMusicSrc);
    };

    window.addEventListener("pointerdown", handler, true);
    window.addEventListener("touchstart", handler, { capture: true, passive: true });
    window.addEventListener("mousedown", handler, true);
  }

  // --- music ---
  function ensureMusicEl() {
    if (musicEl) return musicEl;
    musicEl = new Audio();
    musicEl.loop = true;
    musicEl.preload = "auto";
    musicEl.volume = prefs.musicVolume;
    return musicEl;
  }

  function playMusic(src) {
    currentMusicSrc = src;

    if (!prefs.musicEnabled) return false;

    // if not unlocked yet, remember intent and wait for gesture
    if (!unlocked) return false;

    const el = ensureMusicEl();
    if (el.src !== new URL(src, window.location.href).href) {
      el.src = src;
    }
    el.volume = prefs.musicVolume;

    el.play().catch(() => {
      // iOS sometimes rejects if not in direct gesture; keep intent
    });
    return true;
  }

  function pauseMusic() {
  if (!musicEl) return;
  musicEl.pause();
}

function pauseMusic() {
  if (!musicEl) return;
  musicEl.pause();
}

function stopMusic() {
  if (!musicEl) return;
  musicEl.pause();
  try { musicEl.currentTime = 0; } catch {}
}

  function setMusicEnabled(on) {
    prefs.musicEnabled = !!on;
    savePrefs();
    if (!prefs.musicEnabled) stopMusic();
    else if (currentMusicSrc) playMusic(currentMusicSrc);
  }

  function setMusicVolume(v) {
    prefs.musicVolume = clamp(v, 0, 1);
    savePrefs();
    if (musicEl) musicEl.volume = prefs.musicVolume;
  }

  // --- sfx ---
  function getFromPool(src) {
    let pool = sfxPool.get(src);
    if (!pool) {
      pool = [];
      for (let i = 0; i < POOL_SIZE; i++) {
        const a = new Audio(src);
        a.preload = "auto";
        a.volume = prefs.sfxVolume;
        pool.push(a);
      }
      sfxPool.set(src, pool);
    }
    // find first not playing
    for (const a of pool) {
      if (a.paused || a.ended) return a;
    }
    // fallback: reuse first
    return pool[0];
  }

  function playSfx(src) {
    if (!prefs.sfxEnabled) return false;
    if (!unlocked) return false;

    const a = getFromPool(src);
    a.volume = prefs.sfxVolume;
    try { a.currentTime = 0; } catch {}
    a.play().catch(() => {});
    return true;
  }

  function setSfxEnabled(on) {
    prefs.sfxEnabled = !!on;
    savePrefs();
  }

  function setSfxVolume(v) {
    prefs.sfxVolume = clamp(v, 0, 1);
    savePrefs();
  }

  function getPrefs() {
    return { ...prefs, unlocked };
  }

  // expose
  window.PS = window.PS || {};
  window.PS.systems = window.PS.systems || {};
  window.PS.systems.audio = {
  bindAutoUnlock,
  unlock,
  playMusic,
  pauseMusic,
  stopMusic,
  playSfx,
  setMusicEnabled,
  setSfxEnabled,
  setMusicVolume,
  setSfxVolume,
  getPrefs,
};
})();