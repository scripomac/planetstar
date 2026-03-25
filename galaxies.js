(() => {
  const track = document.getElementById("galaxyTrack");
  const startBtn = document.getElementById("galaxyStartBtn");
  const scrollEl = document.getElementById("galaxyScroll");

  const MAX_LEVELS = 100;
  const AVAILABLE_NOW = 10;

  // Layout
  // Genug Scroll-Luft, damit Level 1/2 auch in die Bildschirmmitte können
  const SPACING_Y = 74;
  const GAP_AFTER_10 = 90;
  let PAD_TOP = 70;
let PAD_BOTTOM = 120;

  const AMP_X = 110;
  const FREQ = 0.55;

  // Placeholder (später Savegame)
  const placeholder = {
    savedLevel: 10,
    highestUnlocked: 10,
    planetsCleared: new Set([1,2,3,4,5,6,7,8,9,10]),
    starCaught: new Set([1,2,3,4,5,6,7,8,9,10]),
  };

  // State
  let totalH = 0;
  let pickedLevel = null;     // Tap
  let centeredLevel = null;   // Screen-Mitte
  let scrollRAF = null;

  // Fast lookup
  const orbByLevel = new Map();
  let lastScaled = [];

  function clamp(n, a, b) {
    return Math.max(a, Math.min(b, n));
  }

  function yForLevel(lvl) {
    let y = totalH - PAD_BOTTOM - (lvl - 1) * SPACING_Y;
    if (lvl >= 11) y -= GAP_AFTER_10;
    return y;
  }

  function setPickedLevel(level) {
    pickedLevel = level;

    track.querySelectorAll(".galaxyOrb.selected").forEach(el => el.classList.remove("selected"));
    const el = orbByLevel.get(level);
    if (el) el.classList.add("selected");

    startBtn.disabled = (level > AVAILABLE_NOW);
  }

  function applyLocalScales(focusLevel) {
    const steps = [1.6, 1.32, 1.12, 1.0, 0.9, 0.84];

    for (const lvl of lastScaled) {
      const el = orbByLevel.get(lvl);
      if (el) el.style.setProperty("--orb-scale", "1");
    }
    lastScaled = [];

    for (let d = 0; d <= 5; d++) {
      const s = steps[d];

      const a = focusLevel - d;
      const b = focusLevel + d;

      if (a >= 1 && a <= MAX_LEVELS) {
        const elA = orbByLevel.get(a);
        if (elA) elA.style.setProperty("--orb-scale", String(s));
        lastScaled.push(a);
      }
      if (d !== 0 && b >= 1 && b <= MAX_LEVELS) {
        const elB = orbByLevel.get(b);
        if (elB) elB.style.setProperty("--orb-scale", String(s));
        lastScaled.push(b);
      }
    }
  }

  function showInfoAtOrb(level) {
    track.querySelectorAll(".galaxyOrbInfo").forEach(el => (el.style.display = "none"));

    const orb = orbByLevel.get(level);
    if (!orb) return;

    const info = orb.querySelector(".galaxyOrbInfo");
    if (!info) return;

    const x = parseFloat(orb.style.left || "0");
    const trackW = track.clientWidth || 320;

    const side = x > trackW * 0.5 ? "left" : "right";
    info.classList.remove("left", "right");
    info.classList.add(side);

    const orbW = orb.offsetWidth || 24;
    const gap = 15;
    const edgePad = 12;

    let avail;
    if (side === "right") avail = trackW - (x + orbW * 0.5 + gap + edgePad);
    else avail = x - (orbW * 0.5 + gap + edgePad);

    avail = Math.max(120, Math.floor(avail));
    info.style.maxWidth = `${avail}px`;

    const L = `<span class="lvl nb">Level&nbsp;${level}</span>`;
const B = `<span class="sub nb">Bestzeit:&nbsp;—</span>`;
const V = `<span class="sub nb">Versuche:&nbsp;—</span>`;

if (level > AVAILABLE_NOW) {
  info.innerHTML = `${L}<br><span class="sub nb">kommt&nbsp;bald</span><br>${V}`;
} else {
  info.innerHTML = `${L}<br>${B}<br>${V}`;
}

    info.style.display = "block";
  }

  // kontinuierliche Levelposition (für Deadzone)
  function estimateCenteredLevelContinuous() {
    const centerY = scrollEl.scrollTop + scrollEl.clientHeight * 0.5;
    const base = totalH - PAD_BOTTOM;

    let t = ((base - centerY) / SPACING_Y) + 1;
    if (t >= 11) t = (((base - GAP_AFTER_10) - centerY) / SPACING_Y) + 1;

    return t;
  }

  function updateCenteredFromScroll() {
    scrollRAF = null;

    const t = estimateCenteredLevelContinuous();
    let next = clamp(Math.round(t), 1, MAX_LEVELS);

    if (centeredLevel != null) {
      const diff = t - centeredLevel;
      if (Math.abs(diff) < 0.55) next = centeredLevel;
    }

    if (next === centeredLevel) return;

    track.querySelectorAll(".galaxyOrb.centered").forEach(el => el.classList.remove("centered"));
    const el = orbByLevel.get(next);
    if (el) el.classList.add("centered");

    centeredLevel = next;

    applyLocalScales(centeredLevel);
    showInfoAtOrb(centeredLevel);
  }

  function makeOrb(level, x, y) {
    const orb = document.createElement("div");
    orb.className = "galaxyOrb";

    if (level <= AVAILABLE_NOW) orb.classList.add("l1to10");
    if (level > AVAILABLE_NOW) orb.classList.add("locked");

    if (placeholder.planetsCleared.has(level)) orb.classList.add("planetsCleared");
    if (placeholder.starCaught.has(level)) orb.classList.add("starCaught");

    orb.style.left = `${x}px`;
    orb.style.top = `${y}px`;
    orb.dataset.level = String(level);

    const ringClear = document.createElement("div");
    ringClear.className = "orbRingClear";
    orb.appendChild(ringClear);

    const ringHighest = document.createElement("div");
    ringHighest.className = "orbRingHighest";
    orb.appendChild(ringHighest);

    const tinyStar = document.createElement("div");
    tinyStar.className = "orbTinyStar";
    tinyStar.textContent = "★";
    orb.appendChild(tinyStar);

    const info = document.createElement("div");
    info.className = "galaxyOrbInfo right";
    info.style.display = "none";
    orb.appendChild(info);

    const num = document.createElement("div");
    num.className = "galaxyNum";
    num.textContent = `Level ${level}`;
    orb.appendChild(num);

    orb.addEventListener("click", () => setPickedLevel(level));

    return orb;
  }

  function layout() {
	  // Genug Scroll-Luft, damit Level 1/2 in die Screen-Mitte können
const slack = Math.ceil(scrollEl.clientHeight * 0.5);
PAD_TOP = 70 + slack;
PAD_BOTTOM = 120 + slack;
    totalH = PAD_TOP + PAD_BOTTOM + (MAX_LEVELS - 1) * SPACING_Y + GAP_AFTER_10;
    track.style.height = `${totalH}px`;

    track.innerHTML = "";
    orbByLevel.clear();
    lastScaled = [];

    const w = track.clientWidth || 320;
    const centerX = w * 0.5;

    const soonY = (yForLevel(10) + yForLevel(11)) * 0.5;
    const soon = document.createElement("div");
    soon.className = "galaxySoon";
    soon.style.top = `${soonY}px`;
    soon.textContent = "Level 11 wird bald veröffentlicht";
    track.appendChild(soon);

    for (let lvl = 1; lvl <= MAX_LEVELS; lvl++) {
      const y = yForLevel(lvl);
      const x = centerX + Math.sin((lvl - 1) * FREQ) * AMP_X;

      const orb = makeOrb(lvl, x, y);
      orbByLevel.set(lvl, orb);
      track.appendChild(orb);
    }

    const startLevel = clamp(placeholder.savedLevel || placeholder.highestUnlocked || 1, 1, MAX_LEVELS);
    const startEl = orbByLevel.get(startLevel);

    if (startEl) {
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          const y = startEl.offsetTop + startEl.offsetHeight * 0.5;
          scrollEl.scrollTop = Math.max(0, y - scrollEl.clientHeight * 0.5);
          updateCenteredFromScroll();
        });
      });
    } else {
      updateCenteredFromScroll();
    }

    setPickedLevel(Math.min(startLevel, AVAILABLE_NOW));
  }

  scrollEl.addEventListener("scroll", () => {
    if (scrollRAF) return;
    scrollRAF = requestAnimationFrame(updateCenteredFromScroll);
  }, { passive: true });

  startBtn.addEventListener("click", () => {
    const lvl = pickedLevel ?? centeredLevel;
    if (!lvl) return;
    if (lvl > AVAILABLE_NOW) return;
    console.log("Start Level", lvl);
  });

  layout();
  window.addEventListener("resize", layout);
})();