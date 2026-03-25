// --- CORE PROBE (temporary) ---
(() => {
  const qp = new URLSearchParams(location.search);
  const on = qp.get("diag") === "1" || qp.get("debug") === "1";
  if (!on) return;

  const badge = document.createElement("div");
  badge.id = "psCoreProbe";
  badge.textContent = "CORE: LOADING…";
  badge.style.cssText = `
    position: fixed; left: 12px; bottom: 12px; z-index: 999999;
    padding: 10px 12px; border-radius: 12px;
    background: rgba(0,0,0,0.55); color: #fff;
    font: 12px/1.2 -apple-system, system-ui, sans-serif;
    backdrop-filter: blur(10px);
  `;
  document.addEventListener("DOMContentLoaded", () => document.body.appendChild(badge));
  window.__PS_CORE_PROBE = badge;
})();
window.__PS_CORE_LOADED = true;
// dev/game-core.js (REBUILD – stable baseline)
// Exposes: window.Game = { start(level), pause(), resume(), stopToMenu(), restartLevel(), getSave(), getLevel() }
// Emits:
// - PS.events.emit(EVT.STATE / EVT.HUD / EVT.PAYWALL / EVT.LEVEL_COMPLETE / EVT.GAME_START / EVT.GAME_PAUSE / EVT.GAME_RESUME)
// - DOM events: planetstar:state, planetstar:hud, planetstar:paywall, planetstar:levelComplete, planetstar:gameWin
(() => {
  "use strict";

  // --- Globals / deps ---
  const CFG = window.GAME_CONFIG || {};

  const PS = (window.PS = window.PS || {});
  PS.systems = PS.systems || {};
  PS.entities = PS.entities || {};

  const EVT = PS.EVT || {};
  const bus = PS.events;

  const inputSys = PS.systems.input;
  const spawnSys = PS.systems.spawn;
  const collSys  = PS.systems.collisions;
  const saveSys  = PS.systems.save;
  const audioSys = PS.systems.audio;

  const PlanetEnt = PS.entities.planet;
  const StarEnt   = PS.entities.star;

  // levels.js should provide window.getLevelSettings(level) – but core must not crash if missing
const getLevelSettings =
  (typeof window.getLevelSettings === "function")
    ? window.getLevelSettings
    : (level) => {
        const L = Math.max(1, Math.floor(Number(level) || 1));
        // default curve: Level 1 = 5 Orbs, +5 per level
        const count = 5 + (L - 1) * 5;
        return { level: L, planets: { count } };
      };

  // --- Canvas ---
  const canvas = document.getElementById("game");
  if (!canvas) throw new Error("Canvas #game fehlt in index.html");
  const ctx = canvas.getContext("2d", { alpha: true });

  // --- Helpers ---
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const dist  = (ax, ay, bx, by) => Math.hypot(ax - bx, ay - by);

  // --- Render helpers (core calls use ctx implicitly; entities get adapters) ---
  function fillCircle(x, y, r, color, alpha = 1) {
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  function drawGlowRing(x, y, innerR, outerR, rgb, innerA = 0, midA = 0.18, outerA = 0) {
    const g = ctx.createRadialGradient(x, y, innerR, x, y, outerR);
    g.addColorStop(0.0, `rgba(${rgb}, ${innerA})`);
    g.addColorStop(0.6, `rgba(${rgb}, ${midA})`);
    g.addColorStop(1.0, `rgba(${rgb}, ${outerA})`);
    ctx.save();
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(x, y, outerR, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  const renderHelpers = {
    fillCircle: (_ctx, x, y, r, color, alpha = 1) => {
      _ctx.save();
      _ctx.globalAlpha = alpha;
      _ctx.fillStyle = color;
      _ctx.beginPath();
      _ctx.arc(x, y, r, 0, Math.PI * 2);
      _ctx.fill();
      _ctx.restore();
    },
    drawGlowRing: (_ctx, x, y, innerR, outerR, rgb, innerA = 0, midA = 0.18, outerA = 0) => {
      const g = _ctx.createRadialGradient(x, y, innerR, x, y, outerR);
      g.addColorStop(0.0, `rgba(${rgb}, ${innerA})`);
      g.addColorStop(0.6, `rgba(${rgb}, ${midA})`);
      g.addColorStop(1.0, `rgba(${rgb}, ${outerA})`);
      _ctx.save();
      _ctx.fillStyle = g;
      _ctx.beginPath();
      _ctx.arc(x, y, outerR, 0, Math.PI * 2);
      _ctx.fill();
      _ctx.restore();
    },
  };

  // --- DPR resize ---
  let W = 0, H = 0, DPR = 1;
  function resize() {
    const vv = window.visualViewport;
    W = Math.round(vv ? vv.width : window.innerWidth);
    H = Math.round(vv ? vv.height : window.innerHeight);
    DPR = Math.max(1, Math.min(2, window.devicePixelRatio || 1));

    canvas.width = Math.floor(W * DPR);
    canvas.height = Math.floor(H * DPR);
    canvas.style.width = W + "px";
    canvas.style.height = H + "px";
    ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
  }
  window.addEventListener("resize", resize, { passive: true });
  window.addEventListener("orientationchange", resize, { passive: true });
  if (window.visualViewport) window.visualViewport.addEventListener("resize", resize, { passive: true });
  resize();

  // --- Safe-area bounds (uses your CSS vars) ---
  const SAFE_PAD = { top: 10, bottom: 22, left: 10, right: 10 };
  const hudEl = document.getElementById("hud");

  function getSafeInsets() {
    const cs = getComputedStyle(document.documentElement);
    const px = (v) => parseFloat(v) || 0;
    return {
      top: px(cs.getPropertyValue("--safe-top")),
      bottom: px(cs.getPropertyValue("--safe-bottom")),
      left: px(cs.getPropertyValue("--safe-left")),
      right: px(cs.getPropertyValue("--safe-right")),
    };
  }

  function getPlayBounds() {
    const s = getSafeInsets();
    let minY = s.top + SAFE_PAD.top;

    if (hudEl && !hudEl.classList.contains("hidden")) {
      const r = hudEl.getBoundingClientRect();
      minY = Math.max(minY, r.bottom + 8);
    }

    return {
      minX: s.left + SAFE_PAD.left,
      maxX: W - (s.right + SAFE_PAD.right),
      minY,
      maxY: H - (s.bottom + SAFE_PAD.bottom),
    };
  }

  // --- Colors (fallbacks) ---
  const COLORS = {
    playerCore: CFG.player?.color || "#7CFF5A",
    planetCore: (CFG.planet?.colors?.normalL1to10) || "#C9A6FF",
    star: CFG.star?.color || "#FFD44A",
  };

  // --- State ---
  const STATE = { STOPPED:"STOPPED", PLAYING:"PLAYING", PAUSED:"PAUSED", WIN:"WIN", PAYWALL:"PAYWALL" };
  let state = STATE.STOPPED;

  const game = { level: 1, eaten: 0, total: 0, starActive: false };

  function emit(name, detail) {
    // PS event bus
    bus?.emit?.(name, detail);
    // DOM mirror
    window.dispatchEvent(new CustomEvent(`planetstar:${String(name).toLowerCase()}`, { detail }));
  }

  function emitState() {
    if (EVT.STATE) bus?.emit?.(EVT.STATE, { state, level: game.level });
    window.dispatchEvent(new CustomEvent("planetstar:state", { detail: { state, level: game.level } }));
  }

  function emitHud() {
  const payload = {
    level: game.level,
    eaten: game.eaten,
    total: game.total,

    // ✅ Legacy/compat keys (falls UI so heißt)
    planetsEaten: game.eaten,
    planetsTotal: game.total,
  };

  if (EVT.HUD) bus?.emit?.(EVT.HUD, payload);
  window.dispatchEvent(new CustomEvent("planetstar:hud", { detail: payload }));
}
  
    // --- Save / Freemium gate ---
  const save = saveSys.loadSave();
  const FREE_LEVEL_MAX = 15;
  const CONTENT_MAX_LEVEL = CFG.CONTENT_MAX_LEVEL ?? 10;

  PS.entitlements = PS.entitlements || {};
  try {
    PS.entitlements.premium = localStorage.getItem("planetstar_premium_v1") === "1" || !!PS.entitlements.premium;
  } catch {
    PS.entitlements.premium = !!PS.entitlements.premium;
  }

  // --- Entities ---
  const player = {
  x: W * 0.5, y: H * 0.6,
  tx: W * 0.5, ty: H * 0.6,
  vx: 0, vy: 0,
  r: CFG.player?.baseRadius ?? 12,
};

  let planets = [];
let star = null;

// --- Star trail (required by entities/star.js) ---
let starTrail = [];
const STAR_TRAIL = {
  life: 26,
  max: 90,
};

  // --- Input wiring ---
  inputSys?.init?.({
    canvas,
    isActive: () => state === STATE.PLAYING,
    getBounds: () => getPlayBounds(),
    getPlayerRadius: () => player?.r ?? 0,
    setTarget: (x, y) => { player.tx = x; player.ty = y; },
  });

  // --- Spawn helpers ---
  function spawnPlanetsForLevel(level) {
  const settings = getLevelSettings(level) || {};
  const expectedCount =
    settings?.planets?.count ??
    settings?.planetsToEat ??
    settings?.count ??
    (5 + (Math.max(1, level) - 1) * 5);

  const res = spawnSys.spawnPlanetsForLevel(level, {
    CFG,
    getLevelSettings,
    getPlayBounds,
    rand: (a, b) => a + Math.random() * (b - a),
  });

  // Accept multiple possible shapes from spawn.js
planets = res?.planets || res || [];

// If spawn gave us nothing usable, force empty array
if (!Array.isArray(planets)) planets = [];

// --- HARD FALLBACK: if spawn yields 0 planets, create simple ones here ---
if (planets.length === 0) {
  const b = getPlayBounds();
  const r0 = (CFG?.planet?.baseRadius) ?? 7;
  const count = expectedCount;

  for (let i = 0; i < count; i++) {
    const r = (r0 - 1.5) + Math.random() * (5.5 + 1.5);
    const x = (b.minX + r) + Math.random() * Math.max(1, (b.maxX - r) - (b.minX + r));
    const y = (b.minY + r) + Math.random() * Math.max(1, (b.maxY - r) - (b.minY + r));
    planets.push({ x, y, r, vx: 0, vy: 0, phase: Math.random() * Math.PI * 2 });
  }
}

game.eaten = 0;
game.total = expectedCount;

// If spawn created a different number, trust actual array length
if (planets.length > 0) game.total = planets.length;

emitHud();
}

  function spawnStar() {
  const res = spawnSys.spawnStar({
    CFG,
    getPlayBounds,
    rand: (a, b) => a + Math.random() * (b - a),
  });

  star = res?.star || null;
  game.starActive = !!star;

  // reset trail each time a star appears
  starTrail = [];
}
  
  function emitCoreDebug(tag = "snapshot") {
  try {
    const settings =
      (typeof window.getLevelSettings === "function")
        ? window.getLevelSettings(game.level)
        : null;

    const b = getPlayBounds();

    window.dispatchEvent(new CustomEvent("planetstar:core-debug", {
      detail: {
        tag,
        state,
        level: game.level,
        settings,
        bounds: b,
        planetsLen: Array.isArray(planets) ? planets.length : null,
        firstPlanet: Array.isArray(planets) && planets[0] ? planets[0] : null,
        gameTotal: game.total,
        gameEaten: game.eaten
      }
    }));
  } catch (err) {
    window.dispatchEvent(new CustomEvent("planetstar:core-debug", {
      detail: { tag, error: String(err) }
    }));
  }
}

  function startLevel(level) {
    game.level = Math.max(1, Math.floor(level || 1));
    game.starActive = false;
    star = null;

    const b = getPlayBounds();
    player.r = CFG.player?.baseRadius ?? 12;
    player.x = (b.minX + b.maxX) * 0.5;
    player.y = (b.minY + b.maxY) * 0.62;
    player.tx = player.x;
    player.ty = player.y;
	player.vx = 0;
player.vy = 0;

    inputSys?.reset?.();

    spawnPlanetsForLevel(game.level);
	emitCoreDebug("after-startLevel");
    emitHud();
  }

  // --- Update ---
  function update(dt, now) {
    if (state !== STATE.PLAYING) return;

    const b = getPlayBounds();

    // --- Player motion: Mass + Damping (schwebend, träge) ---
const M = (CFG.player && CFG.player.motion) ? CFG.player.motion : {};

// etwas schneller/weicher (du hattest das schon mal so ähnlich getuned)
const pullStrength = M.pullStrength ?? 14.0;   // höher = schneller am Finger
const maxAccel     = M.maxAccel     ?? 1800;   // px/s²
const maxSpeed     = M.maxSpeed     ?? 600;    // px/s
const dampingPerSec= M.dampingPerSec?? 5.6;    // höher = mehr Bremse
const deadzone     = M.deadzone     ?? 8;      // px
const stopSpeed    = M.stopSpeed    ?? 6;      // px/s

const dx = (player.tx - player.x);
const dy = (player.ty - player.y);
const d  = Math.hypot(dx, dy);

let ax = 0, ay = 0;

if (d > deadzone) {
  const accel = Math.min(maxAccel, d * pullStrength);
  ax = (dx / d) * accel;
  ay = (dy / d) * accel;
}

player.vx += ax * dt;
player.vy += ay * dt;

const sp = Math.hypot(player.vx, player.vy);
if (sp > maxSpeed) {
  const s = maxSpeed / sp;
  player.vx *= s;
  player.vy *= s;
}

// dt-korrigierte Dämpfung
const damp = Math.exp(-dampingPerSec * dt);
player.vx *= damp;
player.vy *= damp;

// kein Micro-Drift nahe Target
if (d <= deadzone && Math.hypot(player.vx, player.vy) < stopSpeed) {
  player.vx = 0;
  player.vy = 0;
}

player.x += player.vx * dt;
player.y += player.vy * dt;

    // clamp
    player.x = clamp(player.x, b.minX + player.r, b.maxX - player.r);
    player.y = clamp(player.y, b.minY + player.r, b.maxY - player.r);

    // entities update
    for (const p of planets) {
  PlanetEnt?.update?.(p, player, b, dt, game.level, CFG, { dist, clamp });
}

// --- PLANET-PLANET COLLISION (true 2D ball bounce, no sticking) ---
{
  const motion = CFG?.planet?.motion || {};
  const restitution = motion.planetBounce ?? 0.98;  // bouncier
const friction    = motion.planetFriction ?? 0.02; // less rail-sliding
  const sepFactor    = motion.separationFactor ?? 1.08; // a bit larger: impulse triggers earlier

  // position correction tuning (prevents jitter + "glue")
  const percent = motion.collisionPosPercent ?? 1.35;
const slop    = motion.collisionPosSlop ?? 0.04;

  for (let i = 0; i < planets.length; i++) {
    const a = planets[i];
    if (!a) continue;

    for (let j = i + 1; j < planets.length; j++) {
      const c = planets[j];
      if (!c) continue;

      const dx = c.x - a.x;
      const dy = c.y - a.y;
      const d = Math.hypot(dx, dy);
      const minD = (a.r + c.r) * sepFactor;

      if (d > 0.0001 && d < minD) {
        const nx = dx / d;
        const ny = dy / d;

        // --- 1) Position correction (stable separation) ---
        const overlap = (minD - d);
        const corrMag = Math.max(0, overlap - slop) * percent;
        if (corrMag > 0) {
          const corrX = nx * (corrMag * 0.5);
          const corrY = ny * (corrMag * 0.5);
          a.x -= corrX; a.y -= corrY;
          c.x += corrX; c.y += corrY;
        }

        // --- 2) Relative velocity ---
        const rvx = c.vx - a.vx;
        const rvy = c.vy - a.vy;

        // Split into normal/tangent components
        const relN = rvx * nx + rvy * ny;      // along normal
        const tx = -ny;
        const ty =  nx;
        const relT = rvx * tx + rvy * ty;      // along tangent

        // If separating already, still add a small separation kick.
// Without this, overlaps become "pushing" / clumping due to drift+damping.
if (relN >= 0) {
  const kick = Math.min(140, overlap * 18);   // px/s impulse-like kick
  a.vx -= nx * kick * 0.5;
  a.vy -= ny * kick * 0.5;
  c.vx += nx * kick * (0.5);
  c.vy += ny * kick * (0.5);
  continue;
}

        // --- 3) Normal impulse (equal mass) ---
        // j = -(1+e) * relN / (1/m1 + 1/m2) ; with m1=m2=1 => /2
        const jN = -(1 + restitution) * relN * 0.5;
        const impNX = jN * nx;
        const impNY = jN * ny;

        a.vx -= impNX; a.vy -= impNY;
        c.vx += impNX; c.vy += impNY;

        // --- 4) Tangential "surface" friction to avoid glue/rail behavior ---
        // Apply a small impulse opposing tangential relative motion
        const jT = -relT * friction * 0.5;
        const impTX = jT * tx;
        const impTY = jT * ty;

        a.vx -= impTX; a.vy -= impTY;
        c.vx += impTX; c.vy += impTY;
      }
    }
  }
}

// --- POST-COLLISION BOUNDS CLAMP (prevents planets pushed out by planet-planet impulses) ---
{
  const bounce = 0.9;
  const minX = b.minX, maxX = b.maxX;
  const minY = b.minY, maxY = b.maxY;

  for (const p of planets) {
    if (!p) continue;

    const r = p.r || 0;

    if (p.x <= minX + r) { p.x = minX + r; p.vx =  Math.abs(p.vx || 0) * bounce; }
    if (p.x >= maxX - r) { p.x = maxX - r; p.vx = -Math.abs(p.vx || 0) * bounce; }
    if (p.y <= minY + r) { p.y = minY + r; p.vy =  Math.abs(p.vy || 0) * bounce; }
    if (p.y >= maxY - r) { p.y = maxY - r; p.vy = -Math.abs(p.vy || 0) * bounce; }
  }
}

    if (game.starActive && star) {
      StarEnt?.update?.(
  star,
  player,
  b,
  dt,
  game.level,
  CFG,
  { dist, clamp, rand: (a, b) => a + Math.random() * (b - a) },
  starTrail,
  STAR_TRAIL
);
    }

    // eat planets
    collSys.eatPlanets({
      player,
      planets,
      cfg: CFG,
      dist,
      onEat: (p) => {
        audioSys?.playSfx?.("audio/sfx/eat.mp3");

        game.eaten++;

        // growth (cap after 10 planets per level)
const MAX_GROWTH_PLANETS = CFG.growth?.maxPlanetsForGrowth ?? 10;

if (game.eaten <= MAX_GROWTH_PLANETS) {
  const maxR = CFG.growth?.maxRadius ?? 999; // optional hard-cap (keep high, since we cap by count)
  const g = Math.max(0.22, (p?.r || 1) * (CFG.growth?.baseFromPlanetRadius ?? 0.10));
  player.r = Math.min(maxR, player.r + g);
}

        emitHud();

        if (game.eaten >= game.total) {
          spawnStar();
        }
      },
    });

    // catch star -> complete level
    if (game.starActive && star) {
      collSys.catchStar({
        player,
        star,
        dist,
        onCatch: () => {
          const finished = game.level;

          audioSys?.playSfx?.("audio/sfx/win.mp3");

          saveSys.markLevelCompleted?.(save, finished);
          saveSys.writeSave(save);

          window.dispatchEvent(new CustomEvent("planetstar:levelComplete", { detail: { level: finished } }));
          bus?.emit?.(EVT.LEVEL_COMPLETE, { level: finished });

          if (finished >= CONTENT_MAX_LEVEL) {
            state = STATE.WIN;
            emitState();
            window.dispatchEvent(new CustomEvent("planetstar:gameWin", { detail: { level: finished } }));
            return;
          }

          startPlay(finished + 1);
        },
      });
    }
  }

  const __PS_DEBUG_ON = (() => {
  const qp = new URLSearchParams(location.search);
  return qp.get("diag") === "1" || qp.get("debug") === "1";
})();
  
  // --- Draw ---
  function draw(now) {
    ctx.clearRect(0, 0, W, H);
	
	// --- DEBUG PROBE: only in debug/diag mode ---
if (__PS_DEBUG_ON) {
  ctx.save();
  ctx.fillStyle = "#ff0044";
  ctx.fillRect(12, 12, 14, 14); // tiny red square top-left
  ctx.restore();
}

    // planets
for (const p of planets) {
  if (PlanetEnt?.draw) {
    PlanetEnt.draw(ctx, p, now, COLORS, renderHelpers);
  } else {
    // Fallback draw: simple planet look
    renderHelpers.fillCircle(ctx, p.x, p.y, p.r * 2.1, COLORS.planetCore, 0.12);
    renderHelpers.fillCircle(ctx, p.x, p.y, p.r,       COLORS.planetCore, 0.96);
  }
}

    // star
    if (game.starActive && star) {
      StarEnt?.draw?.(ctx, star, now, COLORS, renderHelpers, starTrail, STAR_TRAIL);
    }

    // player (fixed halo + pulsing core)
const t = now * 0.002;
const pulse = 1 + Math.sin(t) * 0.06;

// 1) fixed transparent halo (no pulse)
fillCircle(player.x, player.y, player.r * 2.2, COLORS.playerCore, 0.14);

// 2) pulsing core
fillCircle(player.x, player.y, player.r * pulse, COLORS.playerCore, 0.98);
  }

  // --- Loop ---
  let last = performance.now();
  function tick(now) {
    const dt = Math.min(0.05, (now - last) / 1000);
    last = now;

    update(dt, now);
    draw(now);

    requestAnimationFrame(tick);
  }
  requestAnimationFrame(tick);
  
    // --- Public API ---
  function startPlay(level = 1) {
    level = Math.max(1, Math.floor(level || 1));

    // freemium gate
    if (level > FREE_LEVEL_MAX && !PS.entitlements?.premium) {
      state = STATE.PAYWALL;
      emitState();
      inputSys?.reset?.();

      bus?.emit?.(EVT.PAYWALL, { level });
      window.dispatchEvent(new CustomEvent("planetstar:paywall", { detail: { level } }));
      return false;
    }

    state = STATE.PLAYING;
    emitState();
    bus?.emit?.(EVT.GAME_START, { level });
    startLevel(level);

    // optional music (safe)
    audioSys?.playMusic?.("audio/music/space-loop.mp3");
    return true;
  }

  function pause() {
    if (state !== STATE.PLAYING) return;
    state = STATE.PAUSED;
    emitState();
    bus?.emit?.(EVT.GAME_PAUSE, { level: game.level });
    inputSys?.reset?.();
    audioSys?.pauseAll?.();
  }

  function resume() {
    if (state !== STATE.PAUSED) return;
    state = STATE.PLAYING;
    emitState();
    bus?.emit?.(EVT.GAME_RESUME, { level: game.level });
    inputSys?.reset?.();
    audioSys?.resumeAll?.();
  }

  function stopToMenu() {
    state = STATE.STOPPED;
    emitState();
    inputSys?.reset?.();

    planets = [];
    star = null;
    game.starActive = false;
    game.eaten = 0;
    game.total = 0;
    emitHud();

    audioSys?.pauseAll?.();
  }

  window.Game = {
    start: (level = 1) => startPlay(level),
    restartLevel: () => startPlay(game.level || 1),
    pause,
    resume,
    stopToMenu,
    getSave: () => ({ ...save }),
    getLevel: () => game.level || 1,
  };
  
  window.dispatchEvent(new CustomEvent("planetstar:core-ready"));
  
  window.PS = window.PS || {};
window.PS.Game = window.Game;
window.PS.game = window.Game;
  
  if (window.__PS_CORE_PROBE) {
  window.__PS_CORE_PROBE.textContent =
    "CORE: OK | window.Game=" + (window.Game ? "YES" : "NO");
}

  // initial signals
  emitState();
  emitHud();
  
  window.addEventListener("planetstar:diag:request", () => {
  emitCoreDebug("diag-request");
});

// --- DIAG quick jump handler (debug only) ---
(() => {
  const qp = new URLSearchParams(location.search);
  const debugOn = qp.get("diag") === "1" || qp.get("debug") === "1";
  if (!debugOn) return;

  window.addEventListener("planetstar:diag:jump", (e) => {
    try {
      const d = e?.detail || {};
      const lvl = Math.max(1, Math.floor(Number(d.level || 1)));
      const mode = String(d.mode || "planets");

      // Start level normally
      window.Game?.start?.(lvl);

      // If requested: force star immediately
      if (mode === "star") {
  // remove planets so nothing can be eaten anymore
  planets = [];
  game.total = 0;
  game.eaten = 0;

  // go directly to star phase
  spawnStar();
  emitHud();
}

      emitCoreDebug("diag-jump");
    } catch (err) {
      window.dispatchEvent(new CustomEvent("planetstar:core-debug", {
        detail: { tag: "diag-jump-error", error: String(err) }
      }));
    }
  });
})();
  
})();