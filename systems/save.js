// systems/save.js
// Single source of truth for progress

(() => {
  const SAVE_KEY = "planetstar_save_v1";

  function loadSave() {
    try {
      const raw = localStorage.getItem(SAVE_KEY);
      if (!raw) return { maxLevel: 1, lastLevel: 1 };
      const s = JSON.parse(raw);
      return {
        maxLevel: (typeof s.maxLevel === "number" && s.maxLevel >= 1) ? Math.floor(s.maxLevel) : 1,
        lastLevel: (typeof s.lastLevel === "number" && s.lastLevel >= 1) ? Math.floor(s.lastLevel) : 1,
      };
    } catch {
      return { maxLevel: 1, lastLevel: 1 };
    }
  }

  function writeSave(save) {
    try { localStorage.setItem(SAVE_KEY, JSON.stringify(save)); } catch {}
  }

  function markLevelCompleted(save, finishedLevel) {
    save.maxLevel = Math.max(save.maxLevel || 1, finishedLevel);
    save.lastLevel = Math.max(1, finishedLevel + 1);
  }

  function shouldAutosave(level) {
    return level % 10 === 0;
  }

  function resetSave() {
    try { localStorage.removeItem(SAVE_KEY); } catch {}
  }

  // expose (global)
  window.PS = window.PS || {};
  window.PS.systems = window.PS.systems || {};
  window.PS.systems.save = {
    loadSave,
    writeSave,
    markLevelCompleted,
    shouldAutosave,
    resetSave
  };
})();