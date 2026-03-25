/* Planet Star – menu.js (nur Menüs / Navigation)
   Needs: window.Game from game-core.js
*/
(() => {
  "use strict";
  
  window.__MENU_BUILD = "0.10.0-dev-0003";
  
  const SETTINGS_KEY = "planetstar_settings_v1";

  const overlay = document.getElementById("overlay");

  const menuMain = document.getElementById("menuMain");
  const menuSettings = document.getElementById("menuSettings");
  const menuAbout = document.getElementById("menuAbout");
  const menuHowTo = document.getElementById("menuHowTo");
  const menuPause = document.getElementById("menuPause");
  const menuWin = document.getElementById("menuWin");

  const btnStart = document.getElementById("btnStart");
  const btnGalaxy = document.getElementById("btnGalaxy");
  const btnSettings = document.getElementById("btnSettings");
  const btnAbout = document.getElementById("btnAbout");
  const btnHowToPlay = document.getElementById("btnHowToPlay");
    const versionHint = document.getElementById("versionHint");
  const linkBugReport = document.getElementById("linkBugReport");
  const btnResetProgress = document.getElementById("btnResetProgress");
    // ----- Settings: Musik / Sound / Vibration (persisted) -----
  const toggleMusic = document.getElementById("toggleMusic");
  const toggleSfx = document.getElementById("toggleSfx");
  const toggleVibe = document.getElementById("toggleVibe");

  function loadSettings() {
    try {
      const raw = localStorage.getItem(SETTINGS_KEY);
      if (!raw) return { vibrationEnabled: true };
      const o = JSON.parse(raw);
      return {
        vibrationEnabled: typeof o.vibrationEnabled === "boolean" ? o.vibrationEnabled : true,
      };
    } catch {
      return { vibrationEnabled: true };
    }
  }

  function saveSettings(s) {
    try { localStorage.setItem(SETTINGS_KEY, JSON.stringify(s)); } catch {}
  }

  function initSettingsUI() {
    const audioSys = window.PS?.systems?.audioController;

    // UI initial aus gespeicherten Audio-Prefs setzen
    if (audioSys?.getPrefs) {
      const p = audioSys.getPrefs();
      if (toggleMusic) toggleMusic.checked = !!p.musicEnabled;
      if (toggleSfx) toggleSfx.checked = !!p.sfxEnabled;
    } else {
      // Fallback Defaults (falls Audio-System mal nicht geladen ist)
      if (toggleMusic) toggleMusic.checked = true;
      if (toggleSfx) toggleSfx.checked = true;
    }

    // Vibration aus eigener Settings-Quelle
    const s = loadSettings();
    if (toggleVibe) toggleVibe.checked = !!s.vibrationEnabled;

    // Listener: Musik
    toggleMusic?.addEventListener("change", () => {
      const on = !!toggleMusic.checked;
      audioSys?.setMusicEnabled?.(on);

      // optional: direkt reagieren
      if (!on) audioSys?.pauseMusic?.();
      if (on) audioSys?.playMusic?.("audio/music/space-loop.mp3");
    });

    // Listener: Sound
    toggleSfx?.addEventListener("change", () => {
      const on = !!toggleSfx.checked;
      audioSys?.setSfxEnabled?.(on);
    });

    // Listener: Vibration
    toggleVibe?.addEventListener("change", () => {
      const s2 = loadSettings();
      s2.vibrationEnabled = !!toggleVibe.checked;
      saveSettings(s2);
    });
  }

  // direkt initialisieren (scripts sind defer, DOM ist da)
  initSettingsUI();
  
	  btnResetProgress?.addEventListener("click", () => {
    const ok = confirm(
      "Bist du sicher, dass du alle Level zurücksetzen möchtest?\n\n" +
      "Dies bedeutet, dass dein gesamter Spielfortschritt gelöscht wird."
    );
    if (!ok) return;

    // Progress löschen (systems/save.js nutzt localStorage Key planetstar_save_v1)
    const saveSys = window.PS?.systems?.save;
    if (saveSys?.resetSave) saveSys.resetSave();

    // UI sauber neu aufbauen
    refreshStartButton();
    goMenu();
  });

  const btnSettingsBack = document.getElementById("btnSettingsBack");
  const btnAboutBack = document.getElementById("btnAboutBack");
  const btnHowToBack = document.getElementById("btnHowToBack");
    linkBugReport?.addEventListener("click", (e) => {
  e.preventDefault();

  const v = window.__PS_BUILD || "unknown";

  const ua = navigator.userAgent;
  const platform = navigator.platform;
  const touchPoints = navigator.maxTouchPoints || 0;

  function detectDevice() {
    if (/iPhone/.test(ua)) return "iPhone";
    if (/iPad/.test(ua)) return "iPad";
    if (/Android/.test(ua)) return "Android";
    if (/Windows/.test(ua)) return "Windows";
    if (/Mac/.test(ua) && touchPoints === 0) return "macOS";
    if (/Mac/.test(ua) && touchPoints > 1) return "iPad (Desktop Mode)";
    if (/Linux/.test(ua)) return "Linux";
    return platform || "Unknown";
  }

  function detectBrowser() {
    if (/CriOS/.test(ua)) return "Chrome (iOS)";
    if (/FxiOS/.test(ua)) return "Firefox (iOS)";
    if (/Safari/.test(ua) && !/Chrome/.test(ua)) return "Safari";
    if (/Chrome/.test(ua)) return "Chrome";
    return "Unknown Browser";
  }

  const body =
    "Planet Star – Fehler melden\n\n" +
    "=== Geräteinfos ===\n" +
    "Version: " + v + "\n" +
    "Gerät: " + detectDevice() + "\n" +
    "Browser: " + detectBrowser() + "\n" +
    "Sprache: " + navigator.language + "\n" +
    "Viewport: " + window.innerWidth + "x" + window.innerHeight + "\n" +
    "TouchPoints: " + touchPoints + "\n\n" +
    "=== Beschreibung ===\n" +
    "Was ist passiert?\n- \n\n" +
    "Was hast du erwartet?\n- \n";

  location.href =
    "mailto:?subject=" +
    encodeURIComponent("Planet Star Bug Report (" + v + ")") +
    "&body=" +
    encodeURIComponent(body);
});

  const pauseBtn = document.getElementById("pauseBtn");
  const btnResume = document.getElementById("btnResume");
  const btnPauseSettings = document.getElementById("btnPauseSettings");
  const btnRestart = document.getElementById("btnRestart");
  const btnQuit = document.getElementById("btnQuit");
  const btnWinQuit = document.getElementById("btnWinQuit");

  const hud = document.getElementById("hud");

  const PANELS = [menuMain, menuSettings, menuAbout, menuHowTo, menuPause, menuWin].filter(Boolean);
  
  // ----- Start Choice Panel (Continue vs New) -----
const menuStartChoice = document.createElement("div");
menuStartChoice.id = "menuStartChoice";
menuStartChoice.className = "panel hidden";
menuStartChoice.innerHTML = `
  <div class="title small">Spiel starten</div>
  <div class="text" id="startChoiceText" style="margin-bottom: 14px;"></div>
  <button id="btnContinue" class="bigBtn">Weiter</button>
  <button id="btnStartNew" class="bigBtn ghost">Neu anfangen (Level 1)</button>
  <button id="btnStartChoiceBack" class="bigBtn ghost">Zurück</button>
`;
overlay?.appendChild(menuStartChoice);

const startChoiceText = menuStartChoice.querySelector("#startChoiceText");
const btnContinue = menuStartChoice.querySelector("#btnContinue");
const btnStartNew = menuStartChoice.querySelector("#btnStartNew");
const btnStartChoiceBack = menuStartChoice.querySelector("#btnStartChoiceBack");

// wichtig: Panel-Liste erweitern
PANELS.push(menuStartChoice);
// ----- Paywall Panel (Level 16+) -----
const menuPaywall = document.createElement("div");
menuPaywall.id = "menuPaywall";
menuPaywall.className = "panel hidden";
menuPaywall.innerHTML = `
  <div class="title small">Premium</div>

  <div class="text" style="margin: 10px 0 14px;">
    Ab Level 16 ist Planet Star ein kleines Premium-Upgrade.
  </div>

  <button id="btnPaywallLater" class="bigBtn">Später</button>
  <button id="btnPaywallUnlock" class="bigBtn ghost">Freischalten (kommt später)</button>
`;
overlay?.appendChild(menuPaywall);
PANELS.push(menuPaywall);

const btnPaywallLater = menuPaywall.querySelector("#btnPaywallLater");
const btnPaywallUnlock = menuPaywall.querySelector("#btnPaywallUnlock");

btnPaywallLater?.addEventListener("click", () => goMenu());

btnPaywallUnlock?.addEventListener("click", () => {
  alert("Kauf-Flow kommt später 🙂");
});

  function showOnly(panel) {
    PANELS.forEach(p => p.classList.toggle("hidden", p !== panel));
  }
  document.body.classList.remove("inGame");
  function setOverlay(on) {
    overlay?.classList.toggle("hidden", !on);
  }
  function setHud(on) {
    hud?.classList.toggle("hidden", !on);
    pauseBtn?.classList.toggle("hidden", !on);
  }

  // ----- Continue / Save helpers -----
  function readSave() {
    // Preferred: systems/save.js
    const saveSys = window.PS?.systems?.save;
    if (saveSys?.loadSave) return saveSys.loadSave();

    // Fallback: game-core might expose getSave (if present)
    if (window.Game?.getSave) return window.Game.getSave();

    return { maxLevel: 1, lastLevel: 1 };
  }

  function clampLevel(n) {
    n = Math.floor(Number(n) || 1);
    if (n < 1) n = 1;
    if (n > 999) n = 999;
    return n;
  }

  function getContinueLevel() {
    const s = readSave();
    const last = clampLevel(s?.lastLevel ?? 1);
    const max = clampLevel(s?.maxLevel ?? 1);

    // lastLevel should be maxLevel+1 at most; keep it sane even if old data exists
    const safeLast = Math.min(last, max + 1);
    return safeLast;
  }

  function hasProgress() {
    const s = readSave();
    const last = clampLevel(s?.lastLevel ?? 1);
    return last > 1;
  }

  function refreshStartButton() {
  if (!btnStart) return;

  // Button bleibt neutral – Auswahl kommt nach Klick
  btnStart.textContent = "Spiel starten";
  btnStart.dataset.mode = hasProgress() ? "choice" : "new";
}

  function goMenu() {
    document.body.classList.remove("inGame");
    window.Game?.stopToMenu?.();
    setOverlay(true);
    setHud(false);
    showOnly(menuMain);
    refreshStartButton();
  }

  function goPlay(level = 1) {
  document.body.classList.add("inGame");
  setOverlay(false);
  setHud(true);

  const ok = window.Game?.start?.(clampLevel(level));

  // Wenn Game.start() false zurückgibt, hat es z.B. Paywall geblockt.
  if (ok === false) {
    document.body.classList.remove("inGame");
    setOverlay(true);
    setHud(false);
    showOnly(menuPaywall);
  }
}

  function goPause() {
  if (!window.Game?.pause) return;

  window.Game.pause();
  setOverlay(true);
  setHud(false);
  showOnly(menuPause);
}

  function resume() {
    setOverlay(false);
    setHud(true);
    window.Game?.resume?.();
  }

  function goSettings(fromPause = false) {
    if (menuSettings) menuSettings.dataset.fromPause = fromPause ? "1" : "0";
    setOverlay(true);
    setHud(false);
    showOnly(menuSettings);
  }

  // Buttons
  btnStart?.addEventListener("click", () => {
  if (!hasProgress()) {
    goPlay(1);
    return;
  }

  const lvl = getContinueLevel();
  if (startChoiceText) startChoiceText.textContent = `Du kannst bei Level ${lvl} weiterspielen oder neu anfangen.`;

  // Buttons setzen
  btnContinue?.addEventListener("click", onContinueOnce, { once: true });
  btnStartNew?.addEventListener("click", onNewOnce, { once: true });
  btnStartChoiceBack?.addEventListener("click", onBackOnce, { once: true });

  setOverlay(true);
  setHud(false);
  showOnly(menuStartChoice);

  function onContinueOnce() {
    goPlay(lvl);
  }
  function onNewOnce() {
    goPlay(1);
  }
  function onBackOnce() {
    showOnly(menuMain);
  }
});

  btnGalaxy?.addEventListener("click", () => { window.location.href = "galaxies.html"; });
  btnSettings?.addEventListener("click", () => goSettings(false));
  btnAbout?.addEventListener("click", () => { setOverlay(true); setHud(false); showOnly(menuAbout); });
  btnHowToPlay?.addEventListener("click", () => { setOverlay(true); setHud(false); showOnly(menuHowTo); });

  btnSettingsBack?.addEventListener("click", () => {
    const fromPause = menuSettings?.dataset?.fromPause === "1";
    if (fromPause) showOnly(menuPause);
    else goMenu();
  });

  btnAboutBack?.addEventListener("click", () => goMenu());
  btnHowToBack?.addEventListener("click", () => goSettings(false));

  pauseBtn?.addEventListener("click", () => {
  console.log("[UI] pauseBtn click");
  goPause();
});
  btnResume?.addEventListener("click", () => resume());
  btnPauseSettings?.addEventListener("click", () => goSettings(true));

  // Restart always starts at 1 (explicit "Neu starten")
  btnRestart?.addEventListener("click", () => {
  // Restart current level (not level 1)
  setOverlay(false);
  setHud(true);
  window.Game?.restartLevel?.();
});

  btnQuit?.addEventListener("click", () => goMenu());
  btnWinQuit?.addEventListener("click", () => goMenu());

  // Win event from game-core
  window.addEventListener("planetstar:gameWin", () => {
    setOverlay(true);
    setHud(false);
    showOnly(menuWin);
  });
  
  window.addEventListener("planetstar:paywall", () => {
  document.body.classList.remove("inGame");
  setOverlay(true);
  setHud(false);
  showOnly(menuPaywall);
});

// Dev helper: /dev/index.html?testlevel=16
const qp = new URLSearchParams(location.search);
const testLevel = Number(qp.get("testlevel"));
if (testLevel && Number.isFinite(testLevel)) {
  setTimeout(() => goPlay(testLevel), 50);
}

  // Boot
    if (window.__PS_BUILD) {
  const raw = window.__PS_BUILD;

  // Beispiel: 0.10.0-dev-0033
  const parts = raw.split("-");
  let pretty = raw;

  if (parts.length >= 3) {
    pretty = "Version " + parts[0] + " (" + parts[1] + " " + parts[2] + ")";
  } else {
    pretty = "Version " + raw;
  }

  versionHint.textContent = pretty;
}

  goMenu();
})();