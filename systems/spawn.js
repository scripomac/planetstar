/* Planet Star – systems/spawn.js
   Spawn helpers (planets, star).
*/
(() => {
  "use strict";

  window.PS = window.PS || {};
  window.PS.systems = window.PS.systems || {};
  const api = (window.PS.systems.spawn = window.PS.systems.spawn || {});

  function toInt(v, fallback) {
    const n = Math.floor(Number(v));
    return Number.isFinite(n) ? n : fallback;
  }

  function isFiniteBounds(b) {
    return b && [b.minX, b.minY, b.maxX, b.maxY].every(Number.isFinite);
  }

  // ctx: { CFG, getLevelSettings, getPlayBounds, rand }
  api.spawnPlanetsForLevel = function spawnPlanetsForLevel(level, ctx) {
    if (!ctx) throw new Error("spawnPlanetsForLevel: ctx missing");
    const { CFG, getLevelSettings, getPlayBounds, rand } = ctx;

    const settings = (typeof getLevelSettings === "function") ? (getLevelSettings(level) || {}) : {};
    let b = getPlayBounds();

// Fallback, falls Bounds kaputt sind (z.B. max<=min wegen SafeArea/HUD)
if (!isFiniteBounds(b) || b.maxX <= b.minX + 20 || b.maxY <= b.minY + 20) {
  console.warn("[spawn] invalid play bounds, using fallback", b);

  // weicher Fallback: nutzbarer Bereich vom Viewport
  const pad = 24;
  b = {
    minX: pad,
    minY: pad,
    maxX: (window.visualViewport?.width || window.innerWidth) - pad,
    maxY: (window.visualViewport?.height || window.innerHeight) - pad,
  };
}

    // Level 1 = 5, dann +5 pro Level
    const fallbackCount = 5 + (Math.max(1, toInt(level, 1)) - 1) * 5;

    // bevorzugt: settings.planets.count oder settings.planetsToEat
    const count =
      Math.max(1, toInt(settings?.planets?.count, NaN)) ||
      Math.max(1, toInt(settings?.planetsToEat, NaN)) ||
      fallbackCount;

    const planetEntity = window.PS?.entities?.planet;
    if (!planetEntity?.create) throw new Error("planet entity missing (PS.entities.planet.create)");

    const planets = [];
    const r0 = (CFG?.planet?.baseRadius) ?? 7;

    for (let i = 0; i < count; i++) {
      const r = rand(r0 - 1.5, r0 + 5.5);

      let x = 0, y = 0;
      let tries = 0;

      while (tries++ < 25) {
        x = rand(b.minX + r, b.maxX - r);
        y = rand(b.minY + r, b.maxY - r);

        // simple Abstand, damit sie nicht übereinander liegen
        let ok = true;
        for (const p of planets) {
          const dx = p.x - x;
          const dy = p.y - y;
          const minD = (p.r + r) * 1.6;
          if (dx * dx + dy * dy < minD * minD) { ok = false; break; }
        }
        if (ok) break;
      }

      planets.push(planetEntity.create({
        x, y, r,
        vx: 0, vy: 0
      }));
    }

    return { planets, total: planets.length, eaten: 0 };
  };

  api.spawnStar = function spawnStar(ctx) {
    if (!ctx) throw new Error("spawnStar: ctx missing");
    const { getPlayBounds, rand } = ctx;

    const b = getPlayBounds();
    if (!isFiniteBounds(b)) {
      console.warn("[spawn] invalid play bounds (star)", b);
      return { star: null };
    }

    const starEntity = window.PS?.entities?.star;
    if (!starEntity?.create) throw new Error("star entity missing (PS.entities.star.create)");

    const r = 10;
    const x = rand(b.minX + r, b.maxX - r);
    const y = rand(b.minY + r, b.maxY - r);

    const star = starEntity.create({ x, y, r, vx: 0, vy: 0 });
    return { star };
  };

})();