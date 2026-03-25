/* Planet Star – entities/star.js
   Star entity: create + update + draw (trail + shape)
*/
(() => {
  "use strict";
  window.PS = window.PS || {};
  window.PS.entities = window.PS.entities || {};
  const api = (window.PS.entities.star = window.PS.entities.star || {});

  api.create = function createStar(data) {
    return { ...data };
  };

  // utils: { clamp, dist, rand }
  // trail: array, constants: { life, max }
  api.update = function updateStar(star, player, b, dt, level, CFG, utils, trail, constants) {
    if (!star) return;

    // init
    if (!Number.isFinite(star.vx)) star.vx = 0;
    if (!Number.isFinite(star.vy)) star.vy = 0;
    if (!Number.isFinite(star.drx)) star.drx = (Math.random() * 2 - 1);
    if (!Number.isFinite(star.dry)) star.dry = (Math.random() * 2 - 1);
    if (!Number.isFinite(star.t)) star.t = 0;
	
	// long-term roam target (prevents local orbit)
if (!Number.isFinite(star.roamT)) star.roamT = 0;
if (!Number.isFinite(star.roamX)) star.roamX = (b.minX + b.maxX) * 0.5;
if (!Number.isFinite(star.roamY)) star.roamY = (b.minY + b.maxY) * 0.5;
	
	// behavior state (for feints)
if (!star.beh) star.beh = "CRUISE";     // CRUISE | BAIT | DASH
if (!Number.isFinite(star.behT)) star.behT = 0; // seconds remaining
if (!Number.isFinite(star.dashT)) star.dashT = 0;

    const minX = b.minX + star.r, maxX = b.maxX - star.r;
    const minY = b.minY + star.r, maxY = b.maxY - star.r;
	
	// update roam target
star.roamT = Math.max(0, star.roamT - dt);
if (star.roamT <= 0) {
  star.roamT = 0.8 + Math.random() * 1.6; // every ~0.8-2.4s
  star.roamX = utils.rand(minX, maxX);
  star.roamY = utils.rand(minY, maxY);
}

// roam direction
const rdx = star.roamX - star.x;
const rdy = star.roamY - star.y;
const rinv = 1 / Math.max(1, Math.hypot(rdx, rdy));
const roamX = rdx * rinv;
const roamY = rdy * rinv;

// always bias drift toward roam (keeps it traveling across field)
star.drx += roamX * 0.35;
star.dry += roamY * 0.35;
	
	// wall avoidance (prevents wall-cling)
const wallZone = 120; // px
let pushX = 0, pushY = 0;

if (star.x - minX < wallZone) pushX += (1 - (star.x - minX) / wallZone);
if (maxX - star.x < wallZone) pushX -= (1 - (maxX - star.x) / wallZone);
if (star.y - minY < wallZone) pushY += (1 - (star.y - minY) / wallZone);
if (maxY - star.y < wallZone) pushY -= (1 - (maxY - star.y) / wallZone);

// bias drift direction away from walls
if (pushX || pushY) {
  star.drx += pushX * 0.9;
  star.dry += pushY * 0.9;
}

    // level speed scaling (L1 slow → L10 fast)
    const tLevel = Math.min(1, (level - 1) / 9);
    const speedMul = 1.6 + 4.4 * tLevel; // L1 ~1.2 , L10 ~5.0 (deutlich schneller)
	const dashBoost = (star.beh === "DASH") ? 1.9 : 1.0;

    // distance to player
    const d = utils.dist(player.x, player.y, star.x, star.y);

    // "feint": if player is close, occasionally hard-turn away
    // --- dynamic behavior ---
const near = d < 260;
const veryNear = d < 150;

// countdown timers
star.behT = Math.max(0, star.behT - dt);
star.dashT = Math.max(0, star.dashT - dt);

// occasionally start a feint sequence when near
if (near && star.beh === "CRUISE" && Math.random() < (0.14 + 0.06 * tLevel)) {
  // 60% bait, 40% instant dash
  if (Math.random() < 0.60) {
    star.beh = "BAIT";
    star.behT = 0.28 + Math.random() * 0.28; // short bait
  } else {
    star.beh = "DASH";
    star.behT = 0.10 + Math.random() * 0.14; // short dash
    star.dashT = star.behT;
  }
}

// if very near, higher chance to dash
if (veryNear && star.beh !== "DASH" && Math.random() < 0.18) {
  star.beh = "DASH";
  star.behT = 0.18 + Math.random() * 0.26;
  star.dashT = star.behT;
}

// choose desired direction based on state
const dx = star.x - player.x;
const dy = star.y - player.y;
const inv = 1 / Math.max(1, Math.hypot(dx, dy));
const awayX = dx * inv;
const awayY = dy * inv;

// a sideways vector (for jukes)
const sideX = -awayY;
const sideY = awayX;

if (star.beh === "BAIT") {
  // BAIT: partially turn "wrong" (sideways or slightly towards) then immediately follow with dash
  const towards = (Math.random() < 0.35) ? -1 : 1; // sometimes towards (tease)
  const mix = 0.55; // strong wrong turn for a moment
  star.drx = star.drx * (1 - mix) + (sideX * towards) * mix;
  star.dry = star.dry * (1 - mix) + (sideY * towards) * mix;

  if (star.behT <= 0) {
    star.beh = "DASH";
    star.behT = 0.18 + Math.random() * 0.26;
    star.dashT = star.behT;
  }
} else if (star.beh === "DASH") {
  // DASH: hard turn away with a lateral component
  const lateral = (Math.random() < 0.5 ? -1 : 1);
  const mix = 0.78; // strong commit
  star.drx = star.drx * (1 - mix) + (awayX + sideX * 0.55 * lateral) * mix;
  star.dry = star.dry * (1 - mix) + (awayY + sideY * 0.55 * lateral) * mix;

  if (star.behT <= 0) {
    star.beh = "CRUISE";
  }
} else {
  // CRUISE: flee bias when near, otherwise wander
  if (near) {
    const closeness = 1 - Math.min(1, d / 260);
    const mix = 0.18 + 0.42 * closeness;
    star.drx = star.drx * (1 - mix) + awayX * mix;
    star.dry = star.dry * (1 - mix) + awayY * mix;
  }
}

// micro-jukes even when not near (adds unpredictability)
if (Math.random() < 0.04) {
  star.drx += utils.rand(-0.95, 0.95);
  star.dry += utils.rand(-0.95, 0.95);
}

    // always slightly wander (keeps it alive)
    star.drx += (Math.random() - 0.5) * 0.65 * dt * speedMul;
    star.dry += (Math.random() - 0.5) * 0.65 * dt * speedMul;

    // normalize drift direction
    const dl = Math.max(0.001, Math.hypot(star.drx, star.dry));
    star.drx /= dl;
    star.dry /= dl;

    // acceleration along drift direction
    const accel = 220 * speedMul * dashBoost;
    star.vx += star.drx * accel * dt;
    star.vy += star.dry * accel * dt;

    // damping
    const damp = Math.pow(0.90, dt * 60);
    star.vx *= damp;
    star.vy *= damp;
	
	// keep moving (prevents orbiting/stalling)
const vMin = 120 * speedMul;
const sp = Math.hypot(star.vx, star.vy);
if (sp < vMin) {
  star.vx += star.drx * (vMin - sp);
  star.vy += star.dry * (vMin - sp);
}

    // speed cap
    const vMax = 240 * speedMul * dashBoost;
    star.vx = Math.max(-vMax, Math.min(vMax, star.vx));
    star.vy = Math.max(-vMax, Math.min(vMax, star.vy));

    // integrate
    star.x += star.vx * dt;
    star.y += star.vy * dt;

    // bounce (no corner sticking)
    const bounce = 0.92;
    let hitX = false, hitY = false;

    if (star.x <= minX) { star.x = minX; star.vx = Math.abs(star.vx) * bounce; hitX = true; }
    if (star.x >= maxX) { star.x = maxX; star.vx = -Math.abs(star.vx) * bounce; hitX = true; }
    if (star.y <= minY) { star.y = minY; star.vy = Math.abs(star.vy) * bounce; hitY = true; }
    if (star.y >= maxY) { star.y = maxY; star.vy = -Math.abs(star.vy) * bounce; hitY = true; }
	if (hitX) star.drx *= -1;
if (hitY) star.dry *= -1;

    // reflect drift direction too
    if (hitX) star.drx *= -1;
    if (hitY) star.dry *= -1;
	
	// --- hard corner escape (prevents corner sticking) ---
const cornerX = (Math.abs(star.x - minX) < 2) || (Math.abs(star.x - maxX) < 2);
const cornerY = (Math.abs(star.y - minY) < 2) || (Math.abs(star.y - maxY) < 2);
const inCorner = cornerX && cornerY;

// track wall time
if (!Number.isFinite(star.wallT)) star.wallT = 0;
if (hitX || hitY) star.wallT += dt; else star.wallT = Math.max(0, star.wallT - dt * 2);

// if corner OR too long on wall: burst towards center-ish with randomness
if (inCorner || star.wallT > 0.35) {
  const cx = (minX + maxX) * 0.5;
  const cy = (minY + maxY) * 0.5;

  const dx = cx - star.x;
  const dy = cy - star.y;
  const inv = 1 / Math.max(1, Math.hypot(dx, dy));

  // strong escape impulse
  const burst = 520 * speedMul;

  star.vx = dx * inv * burst + utils.rand(-120, 120) * speedMul;
  star.vy = dy * inv * burst + utils.rand(-120, 120) * speedMul;

  // also push drift direction inward
  star.drx = dx * inv + utils.rand(-0.35, 0.35);
  star.dry = dy * inv + utils.rand(-0.35, 0.35);

  star.wallT = 0;
}

    // corner unstick
    if (hitX && hitY) {
      star.vx += utils.rand(-40, 40) * dt;
      star.vy += utils.rand(-40, 40) * dt;
    }

    // advance rotation for draw
    star.t += dt * (2.0 + 1.2 * speedMul);

    // particle trail (spawn a few per frame)
const spd = Math.hypot(star.vx || 0, star.vy || 0);
const n = 2 + (spd > 200 ? 1 : 0); // 2..3 particles depending on speed

for (let i = 0; i < n; i++) {
  // jitter around star
  const ox = utils.rand(-star.r * 0.25, star.r * 0.25);
  const oy = utils.rand(-star.r * 0.25, star.r * 0.25);

  // particles drift slightly opposite to movement + random
  const pvx = (-star.vx * utils.rand(0.006, 0.014)) + utils.rand(-0.45, 0.45);
  const pvy = (-star.vy * utils.rand(0.006, 0.014)) + utils.rand(-0.45, 0.45);

  trail.push({
    x: star.x + ox,
    y: star.y + oy,
    vx: pvx,
    vy: pvy,
    r: utils.rand(star.r * 0.08, star.r * 0.22),
    life: constants.life,
    seed: Math.random() * 1000
  });
}

// keep trail bounded
while (trail.length > constants.max) trail.shift();
  };

  function drawStarShape(ctx, x, y, outerR, innerR, points, color, rotation = 0) {
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(rotation);

    ctx.fillStyle = color;
    ctx.beginPath();
    let rot = -Math.PI / 2;
    const step = Math.PI / points;

    ctx.moveTo(Math.cos(rot) * outerR, Math.sin(rot) * outerR);
    for (let i = 0; i < points; i++) {
      rot += step;
      ctx.lineTo(Math.cos(rot) * innerR, Math.sin(rot) * innerR);
      rot += step;
      ctx.lineTo(Math.cos(rot) * outerR, Math.sin(rot) * outerR);
    }
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  }

  // helpers: { fillCircle, drawGlowRing }
  api.draw = function drawStar(ctx, star, nowMs, COLORS, helpers, trail, constants) {
    if (!star) return;

    // particle trail
for (let i = trail.length - 1; i >= 0; i--) {
  const p = trail[i];

  // drift
  p.x += p.vx;
  p.y += p.vy;

  // slight damping
  p.vx *= 0.985;
  p.vy *= 0.985;

  // life
  p.life -= 1;
  const t = Math.max(0, Math.min(1, p.life / constants.life)); // 1..0
  const a = t * t; // nicer fade curve

  // subtle flicker
  const flick = 0.85 + 0.15 * Math.sin((nowMs * 0.01) + p.seed);

  // core particle
  helpers.fillCircle(ctx, p.x, p.y, p.r * flick, COLORS.star, a * 0.55);

  // soft glow particle behind it
  helpers.fillCircle(ctx, p.x, p.y, p.r * 2.2, COLORS.star, a * 0.10);

  if (p.life <= 0) trail.splice(i, 1);
}

    // glow ring
    const t = nowMs * 0.002;
    const pulse = 1 + Math.sin(t * 1.1) * 0.05;
    const inner = star.r * 1.05;
    const outer = star.r * 2.7 * pulse;
    helpers.drawGlowRing(ctx, star.x, star.y, inner, outer, "255,212,74", 0.00, 0.22, 0.00);

    // star shape
    drawStarShape(ctx, star.x, star.y, star.r, star.r * 0.46, 5, COLORS.star, star.t);
  };
})();