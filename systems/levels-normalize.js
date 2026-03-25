// systems/levels-normalize.js
// NOTE: levels.js is the single source of truth for the Level curve.
// This file only provides a fallback normalizer for legacy builds.
// IMPORTANT: If levels.js already registered PS.levels.normalizeLevelSettings,
// we DO NOT overwrite it (that caused mismatches: 1 planet / wrong totals).
(() => {
  "use strict";

  window.PS = window.PS || {};
  window.PS.levels = window.PS.levels || {};

  // If levels.js already owns the normalize function, keep it.
  if (typeof window.PS.levels.normalizeLevelSettings === "function") return;

  function clamp(v, min, max) { return Math.max(min, Math.min(max, v)); }

  // Default curve: Level 1 = 5, +5 per level (matches design doc)
  function basePlanetsForLevel(level, base = 5, step = 5) {
    const L = Math.max(1, Math.floor(Number(level) || 1));
    return base + (L - 1) * step;
  }

  function normalizeLevelSettings(raw, level) {
    const r = raw && typeof raw === "object" ? raw : {};
    const L = Math.max(1, Math.floor(Number(level) || 1));

    // Accept common legacy keys
    const planetsToEatRaw =
      r.planetsToEat ??
      r.planets?.count ??
      r.planetCount ??
      r.count ??
      null;

    const planetsToEat = Number.isFinite(Number(planetsToEatRaw))
      ? clamp(Math.floor(Number(planetsToEatRaw)), 1, 9999)
      : basePlanetsForLevel(L, 5, 5);

    const hasStarChase = r.hasStarChase ?? true;

    const starSpeedMultiplier = Number.isFinite(Number(r.star?.speedMultiplier))
      ? clamp(Number(r.star.speedMultiplier), 0.1, 10)
      : Number.isFinite(Number(r.starSpeedMultiplier))
        ? clamp(Number(r.starSpeedMultiplier), 0.1, 10)
        : 1;

    const flags = {
      enemySpeedMultiplier: Number.isFinite(Number(r.flags?.enemySpeedMultiplier))
        ? Number(r.flags.enemySpeedMultiplier)
        : Number.isFinite(Number(r.enemySpeedMultiplier))
          ? Number(r.enemySpeedMultiplier)
          : 1,
      gravityStrength: Number.isFinite(Number(r.flags?.gravityStrength))
        ? Number(r.flags.gravityStrength)
        : Number.isFinite(Number(r.gravityStrength))
          ? Number(r.gravityStrength)
          : 0,
      spawnRadiusMultiplier: Number.isFinite(Number(r.flags?.spawnRadiusMultiplier))
        ? Number(r.flags.spawnRadiusMultiplier)
        : Number.isFinite(Number(r.spawnRadiusMultiplier))
          ? Number(r.spawnRadiusMultiplier)
          : 1,
    };

    // Shape compatible with spawn.js + HUD expectations
    return {
      level: L,
      planets: { count: planetsToEat },
      planetsToEat,
      hasStarChase: !!hasStarChase,
      star: { speedMultiplier: starSpeedMultiplier },
      flags,
    };
  }

  window.PS.levels.normalizeLevelSettings = normalizeLevelSettings;
})();