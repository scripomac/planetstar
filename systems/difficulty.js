// systems/difficulty.js
(() => {
  "use strict";

  window.PS = window.PS || {};
  window.PS.systems = window.PS.systems || {};

  // Smoothstep for gentle ramps
  function smoothstep(t) {
    t = Math.max(0, Math.min(1, t));
    return t * t * (3 - 2 * t);
  }

  /**
   * getDifficultyFactor(level)
   * - returns a calm, slowly increasing factor >= 1
   * - no spikes, no harsh jumps
   *
   * Philosophy:
   * - Levels 1–10: very gentle ramp (meditative)
   * - Beyond: continues slowly but never explodes
   */
  function getDifficultyFactor(level) {
    const L = Math.max(1, Number(level) || 1);

    // Segment A: 1..10 ramps from 1.00 to ~1.35
    if (L <= 10) {
      const t = (L - 1) / 9; // 0..1
      return 1.0 + 0.35 * smoothstep(t);
    }

    // Segment B: 11..30 ramps from ~1.35 to ~1.70
    if (L <= 30) {
      const t = (L - 10) / 20; // 0..1
      return 1.35 + 0.35 * smoothstep(t);
    }

    // Segment C: 31+ very slow log-like growth, capped
    // prevents impossible speeds while still feeling like progress
    const extra = Math.log2(1 + (L - 30) / 10); // slow growth
    return Math.min(2.2, 1.70 + 0.20 * extra);
  }

  /**
   * Derivative helpers (optional convenience)
   * Use these so systems don't invent their own multipliers.
   */
  function getStarSpeedMultiplier(level) {
    // Star should feel slightly more "alive" with higher levels, but still catchable.
    // Keep within a safe range.
    const f = getDifficultyFactor(level);
    return Math.max(0.9, Math.min(1.8, 0.9 + (f - 1.0) * 1.4));
  }

  function getSpawnRadiusMultiplier(level) {
    // Larger radius can increase wandering/space feeling but stay subtle.
    const f = getDifficultyFactor(level);
    return Math.max(1.0, Math.min(1.25, 1.0 + (f - 1.0) * 0.7));
  }

  function getPlanetCountBase(level) {
    // Keep your known rule: +5 planets per level
    const L = Math.max(1, Number(level) || 1);
    return 10 + (L - 1) * 5;
  }

  window.PS.systems.difficulty = {
    getDifficultyFactor,
    getStarSpeedMultiplier,
    getSpawnRadiusMultiplier,
    getPlanetCountBase,
  };
})();