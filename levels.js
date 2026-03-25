// dev/levels.js (REBUILD – always provides window.getLevelSettings)
(() => {
  "use strict";

  window.PS = window.PS || {};
  window.PS.levels = window.PS.levels || {};

  const BASE_PLANETS_L1 = 5;  // ✅ Level 1 = 5
  const PLANETS_STEP = 5;     // ✅ +5 pro Level

  function clamp(v, a, b) { return Math.max(a, Math.min(b, v)); }

  function buildLevel(level) {
    const L = Math.max(1, Math.floor(Number(level) || 1));
    const planetsToEat = BASE_PLANETS_L1 + (L - 1) * PLANETS_STEP;

    // Spawn-System erwartet settings.planets.count
    return {
  level: L,

  // ✅ Spawn/HUD: neuer Key
  planets: { count: planetsToEat },

  // ✅ Core (dein Debug zeigt: er liest planetsToEat)
  planetsToEat,

  hasStarChase: true,

  // ✅ Kompatibilität zu dem Format, das du im Debug gesehen hast
  star: {
    speedMultiplier: clamp(1 + (L - 1) * 0.06, 0.5, 5),
  },
  flags: {
    enemySpeedMultiplier: 1.0,
    gravityStrength: 0.0,
    spawnRadiusMultiplier: clamp(1 + (L - 1) * 0.02, 0.5, 3),
  },

  // ✅ optional: alte Keys weiterhin behalten (schadet nicht)
  starSpeedMultiplier: clamp(1 + (L - 1) * 0.06, 0.5, 5),
  spawnRadiusMultiplier: clamp(1 + (L - 1) * 0.02, 0.5, 3),

  enemySpeedMultiplier: 1.0,
  gravityStrength: 0.0,
  theme: "default",
};
  }

  window.PS.levels.normalizeLevelSettings = function(raw, level) {
    const base = buildLevel(level);
    const r = (raw && typeof raw === "object") ? raw : {};
    const out = { ...base, ...r };

    // sanitize
    out.level = Math.max(1, Math.floor(Number(out.level) || base.level));
    out.planets = out.planets && typeof out.planets === "object" ? out.planets : { count: base.planets.count };
    out.planets.count = Math.max(1, Math.floor(Number(out.planets.count) || base.planets.count));
    return out;
  };

  // ✅ THE important global API:
  window.getLevelSettings = function(level) {
  return window.PS.levels.normalizeLevelSettings(null, level);
};
})();