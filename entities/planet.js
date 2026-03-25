/* Planet Star – entities/planet.js
   Planet entity: create + update + draw
*/
(() => {
  "use strict";
  window.PS = window.PS || {};
  window.PS.entities = window.PS.entities || {};
  const api = (window.PS.entities.planet = window.PS.entities.planet || {});

  api.create = function createPlanet(data) {
    return { ...data };
  };

  // utils: { clamp, dist }
  // --- movement speed multiplier by level (10-level patterns) ---
function getMoveMult(level) {
  const L = Math.max(1, Math.floor(level || 1));

  // Level 1..10: 1x -> 3x
  if (L <= 10) {
    const t = (L - 1) / 9; // 0..1
    return 1 + 2 * t;      // 1..3
  }

  // "Level 5 factor" from the 1..10 curve:
  // L5 => 1 + 2*((5-1)/9) = 1 + 8/9 = 1.888...
  const start = 1 + 2 * (4 / 9); // ~1.8889
  const end = 4;                 // L20 target

  // Repeat 11..20 pattern every 10 levels: 11-20, 21-30, ...
  const i = (L - 11) % 10;     // 0..9
  const t = i / 9;             // 0..1
  return start + (end - start) * t;
}
  api.update = function updatePlanet(p, player, b, dt, level, CFG, utils) {
  const shyCfg = CFG?.levels?.shy;
  const motion = CFG?.planet?.motion || {};
  const mult = getMoveMult(level);

  // safety init
  if (!Number.isFinite(p.phase)) p.phase = Math.random() * Math.PI * 2;
  if (!Number.isFinite(p.vx)) p.vx = 0;
  if (!Number.isFinite(p.vy)) p.vy = 0;
  
  if (!Number.isFinite(p.noiseSeed)) p.noiseSeed = Math.random() * 1000;
  
  // persistent drift direction
if (!Number.isFinite(p.drx)) p.drx = (Math.random() * 2 - 1);
if (!Number.isFinite(p.dry)) p.dry = (Math.random() * 2 - 1);

  const minX = b.minX + p.r, maxX = b.maxX - p.r;
  const minY = b.minY + p.r, maxY = b.maxY - p.r;
  const cx = (minX + maxX) * 0.5;
  const cy = (minY + maxY) * 0.5;

  // --- FLOATY MOVEMENT ---
  p.phase += dt * 0.8 * mult;

  // slowly turn the drift direction (floaty, not circular)
p.drx += (Math.random() - 0.5) * 0.45 * dt * mult;
p.dry += (Math.random() - 0.5) * 0.45 * dt * mult;

// normalize drift direction
const dl = Math.max(0.001, Math.hypot(p.drx, p.dry));
p.drx /= dl; 
p.dry /= dl;

// acceleration: drift + curved "current" (more dynamic, less straight)
const n1 = Math.sin(p.phase * 1.35 + p.noiseSeed) * 12;
const n2 = Math.cos(p.phase * 1.10 + p.noiseSeed * 0.7) * 12;

// perpendicular component makes paths curve instead of staying straight
const ax = (p.drx * 24 + (-p.dry) * n1 + (Math.random() - 0.5) * 3) * mult;
const ay = (p.dry * 24 + ( p.drx) * n2 + (Math.random() - 0.5) * 3) * mult;

  const centerPull = 0 * mult;

  p.vx += (ax + (cx - p.x) * centerPull) * dt;
  p.vy += (ay + (cy - p.y) * centerPull) * dt;

  // damping
  const damp = Math.pow(0.90, dt * 60);
  p.vx *= damp;
  p.vy *= damp;
  
  // keep a minimum drift speed so they don't stall
// BUT: near the player we reduce it so planets don't "force-drift" into the player
const bubbleForVMin = (motion.bubble ?? 320);
const dToPlayer = Math.hypot(p.x - player.x, p.y - player.y);

// far away: normal vMin, near player: fade to 0
const vMinBase = 10 * mult;
const vMin = (dToPlayer < bubbleForVMin)
  ? vMinBase * Math.max(0, (dToPlayer / bubbleForVMin) - 0.15) // ~0 near player
  : vMinBase;

const sp = Math.hypot(p.vx, p.vy);
if (vMin > 0 && sp < vMin) {
  p.vx += p.drx * (vMin - sp);
  p.vy += p.dry * (vMin - sp);
}

  // cap total speed (vector), not per-axis (needed for real bounces)
const vMax = 90 * mult; // higher so collisions can actually transfer energy
const sp2 = p.vx * p.vx + p.vy * p.vy;
const vMax2 = vMax * vMax;
if (sp2 > vMax2) {
  const s = vMax / Math.sqrt(sp2);
  p.vx *= s;
  p.vy *= s;
}
  
// --- PLAYER COLLISION (only if planet is NOT edible) ---
// If planet is larger/equal than player, it should not pass through the player.
// If planet is smaller, let it overlap so collisions.eatPlanets can consume it.
if (false) {
  const dx = p.x - player.x;
  const dy = p.y - player.y;
  const d2 = dx * dx + dy * dy;

  // edible check (simple & robust)
  const edible = (p.r < player.r);

  if (!edible) {
    const minD = player.r + p.r; // hard contact distance
    const minD2 = minD * minD;

    if (d2 < minD2 && d2 > 0.000001) {
      const d = Math.sqrt(d2);
      const nx = dx / d;
      const ny = dy / d;

      // push planet out of player
      const overlap = (minD - d);
      p.x += nx * overlap;
      p.y += ny * overlap;

      // bounce off player a bit (soft)
      const vn = (p.vx * nx + p.vy * ny);
      if (vn < 0) {
        const restitution = 0.55;
        p.vx -= (1 + restitution) * vn * nx;
        p.vy -= (1 + restitution) * vn * ny;
      }
    }
  }
}
  
  // integrate position
p.x += p.vx * dt;
p.y += p.vy * dt;

// safety: never end up inside player after integration
const minSafe = player.r + p.r + (motion.contactPad ?? 0);
const dd = Math.hypot(p.x - player.x, p.y - player.y);
if (false && dd > 0.0001 && dd < minSafe) {
  const inv = 1 / dd;
  p.x = player.x + (p.x - player.x) * inv * minSafe;
  p.y = player.y + (p.y - player.y) * inv * minSafe;
}

  // --- BOUNCE ---
  const bounce = 0.9;

  let hitX = false;
let hitY = false;

if (p.x <= minX) { p.x = minX; p.vx = Math.abs(p.vx) * bounce; hitX = true; }
if (p.x >= maxX) { p.x = maxX; p.vx = -Math.abs(p.vx) * bounce; hitX = true; }
if (p.y <= minY) { p.y = minY; p.vy = Math.abs(p.vy) * bounce; hitY = true; }
if (p.y >= maxY) { p.y = maxY; p.vy = -Math.abs(p.vy) * bounce; hitY = true; }

// rotate drift direction on wall hit
if (hitX) p.drx *= -1;
if (hitY) p.dry *= -1;

// corner unsticking
const nearCorner =
  (Math.abs(p.x - minX) < 2 || Math.abs(p.x - maxX) < 2) &&
  (Math.abs(p.y - minY) < 2 || Math.abs(p.y - maxY) < 2);

if (nearCorner) {
  p.vx += (Math.random() - 0.5) * 20;
  p.vy += (Math.random() - 0.5) * 20;
}

  // --- SHY ---
  if (p.shy && shyCfg) {
    const zone =
      (shyCfg.zoneBRadiusBase ?? 150) +
      (shyCfg.zoneBRadiusPerLvl ?? 12) * (level - 1);

    const d = utils.dist(player.x, player.y, p.x, p.y);
    if (d < zone) {
      const dx = p.x - player.x;
      const dy = p.y - player.y;
      const inv = 1 / Math.max(1, Math.hypot(dx, dy));

      const flee =
        ((shyCfg.fleeBase ?? 190) +
          (shyCfg.fleePerLvl ?? 220) * ((level - 1) / 9)) *
        (shyCfg.fleeStrength ?? 1.0);

      p.x += dx * inv * flee * dt * 0.02;
      p.y += dy * inv * flee * dt * 0.02;
    }
  }
  }; // <-- updatePlanet ENDE (muss nach BOUNCE + SHY kommen!)
  // helpers: { fillCircle }
  api.draw = function drawPlanet(ctx, p, nowMs, COLORS, helpers) {
    const t = nowMs * 0.002;
    const pulse = 1 + Math.sin(t + p.phase) * 0.04;

    // halo behind core (no ring)
    const haloR = p.r * 2.1;
    helpers.fillCircle(ctx, p.x, p.y, haloR, COLORS.planetCore, 0.12);

    // pulsing core
    const coreR = p.r * pulse;
    helpers.fillCircle(ctx, p.x, p.y, coreR, COLORS.planetCore, 0.96);
  };
})();