// systems/audio-controller.js
(() => {
  "use strict";

  window.PS = window.PS || {};
  window.PS.systems = window.PS.systems || {};

  const state = {
    enabled: true,
    unlocked: false,
    musicEl: null,
    sfxEls: new Set(),
    lastMusicSrc: null,
    wasPlayingMusic: false,
  };

  function log(...args) {
    // toggle if needed:
    // console.log("[audio]", ...args);
  }

  function ensureMusicEl() {
    if (state.musicEl) return state.musicEl;
    const el = new Audio();
    el.loop = true;
    el.preload = "auto";
    el.playsInline = true; // iOS hint
    state.musicEl = el;
    return el;
  }

  function trackSfx(el) {
    state.sfxEls.add(el);
    el.addEventListener("ended", () => state.sfxEls.delete(el), { once: true });
    el.addEventListener("error", () => state.sfxEls.delete(el), { once: true });
  }

  async function tryPlay(el) {
    try {
      await el.play();
      return true;
    } catch (e) {
      return false;
    }
  }

  /**
   * Must be called from a user gesture (tap/click) once on iOS/Safari.
   * We keep it safe: if it fails, we just mark unlocked=false.
   */
  async function unlockFromGesture() {
    if (state.unlocked) return true;
    if (!state.enabled) return false;

    const el = ensureMusicEl();
    const prevVol = el.volume;
    const prevMuted = el.muted;

    el.muted = true;
    el.volume = 0;
    // tiny silent play attempt
    const ok = await tryPlay(el);
    if (ok) {
      el.pause();
      el.currentTime = 0;
      state.unlocked = true;
      log("unlocked");
    } else {
      state.unlocked = false;
      log("unlock failed");
    }

    el.muted = prevMuted;
    el.volume = prevVol;
    return state.unlocked;
  }

  function setEnabled(v) {
    state.enabled = !!v;
    if (!state.enabled) {
      pauseAll();
      return;
    }
    // if re-enabled and we had music before, we can resume on next gesture
  }

  async function playMusic(src, { volume = 0.35 } = {}) {
    if (!state.enabled) return false;

    const el = ensureMusicEl();
    if (src && src !== state.lastMusicSrc) {
      el.src = src;
      state.lastMusicSrc = src;
    }
    el.loop = true;
    el.volume = volume;

    // iOS might require unlockFromGesture first
    const ok = await tryPlay(el);
    state.wasPlayingMusic = ok;
    return ok;
  }

  function pauseMusic() {
    const el = state.musicEl;
    if (!el) return;
    state.wasPlayingMusic = !el.paused;
    try { el.pause(); } catch {}
  }

  async function resumeMusic() {
    if (!state.enabled) return false;
    const el = state.musicEl;
    if (!el) return false;
    if (!state.lastMusicSrc) return false;

    // only resume if it was playing before pause
    if (!state.wasPlayingMusic) return false;

    const ok = await tryPlay(el);
    state.wasPlayingMusic = ok;
    return ok;
  }

  async function playSfx(src, { volume = 0.7 } = {}) {
    if (!state.enabled) return false;
    if (!src) return false;

    const el = new Audio(src);
    el.preload = "auto";
    el.volume = volume;
    el.playsInline = true;
    trackSfx(el);

    const ok = await tryPlay(el);
    return ok;
  }

  function pauseAll() {
    pauseMusic();
    // pause active sfx
    for (const el of Array.from(state.sfxEls)) {
      try { el.pause(); } catch {}
    }
  }

  async function resumeAll() {
    // We only auto-resume music (SFX are short; resuming them is weird)
    return resumeMusic();
  }

  // Visibility handling: Pause on hidden; resume when visible (if was playing)
  function bindVisibilityHandling() {
    document.addEventListener("visibilitychange", () => {
      if (document.hidden) {
        pauseAll();
      } else {
        // do not force-unlock; resumeMusic will just fail if not allowed
        resumeAll();
      }
    });
  }

  // Optional: integrate with PS.events if present (Pause/Resume events)
  function bindGameEvents() {
    const events = window.PS?.events;
    const EVT = window.PS?.EVT;
    if (!events?.on || !EVT) return;

    events.on(EVT.GAME_PAUSE, () => pauseAll());
    events.on(EVT.GAME_RESUME, () => resumeAll());
  }

  // Boot
  bindVisibilityHandling();
  bindGameEvents();

  window.PS.systems.audioController = {
    // state
    setEnabled,
    // iOS unlock
    unlockFromGesture,
    // music
    playMusic,
    pauseMusic,
    resumeMusic,
    // sfx
    playSfx,
    // global
    pauseAll,
    resumeAll,
  };
})();