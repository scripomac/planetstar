/* Planet Star – systems/input.js
   Touch/Pointer input handling (follow finger) – smoothed/laggy follow

   API:
     PS.systems.input.init({
       canvas,
       isActive: () => boolean,
       getBounds: () => ({minX,maxX,minY,maxY}),
       getPlayerRadius: () => number,
       setTarget: (x,y) => void
     })
     PS.systems.input.reset()
     PS.systems.input.destroy()
*/
(() => {
  "use strict";

  window.PS = window.PS || {};
  window.PS.systems = window.PS.systems || {};
  const api = (window.PS.systems.input = window.PS.systems.input || {});

  let _canvas = null;
  let _opts = null;
  let _dragging = false;

  // smoothed follow state
  let _tx = null, _ty = null;
  let _rawX = null, _rawY = null;
  let _lastT = 0;
  let _rafId = 0;

  function clamp(v, a, b) { return Math.max(a, Math.min(b, v)); }

  function setTargetFromEvent(e) {
    if (!_opts || !_canvas) return;
    const b = _opts.getBounds?.();
    if (!b) return;

    const r = (_opts.getPlayerRadius?.() ?? 0) || 0;

    // pointer -> canvas local coords
    const rect = _canvas.getBoundingClientRect();
    const lx = (e.clientX - rect.left);
    const ly = (e.clientY - rect.top);

    // IMPORTANT: game coords are CSS pixels (ctx.setTransform(DPR,...))
// so we do NOT scale by canvas.width/rect.width here.
const x = clamp(lx, b.minX + r, b.maxX - r);
const y = clamp(ly, b.minY + r, b.maxY - r);

    _rawX = x; _rawY = y;

    // snap once on first touch
    if (_tx === null || _ty === null) { _tx = x; _ty = y; }
  }

  function onDown(e) {
    if (!_opts?.isActive?.()) return;
    _dragging = true;
    _canvas?.setPointerCapture?.(e.pointerId);
    setTargetFromEvent(e);
  }

  function onMove(e) {
    if (!_opts?.isActive?.()) return;
    if (!_dragging) return;
    setTargetFromEvent(e);
  }

  function endDrag() {
    _dragging = false;
    _rawX = _rawY = null;
    _tx = _ty = null;
    _lastT = 0;
  }

  function tickFollow() {
    if (!_opts?.isActive?.()) return;
    if (!_dragging) return;
    if (_rawX === null || _rawY === null) return;
    if (_tx === null || _ty === null) { _tx = _rawX; _ty = _rawY; }

    const now = performance.now();
    const dt = _lastT ? Math.min(0.05, (now - _lastT) / 1000) : 0.016;
    _lastT = now;

    // MAIN KNOB: smaller = more lag (more "schleifen")
    const follow = 22; // try: 8 (more lag) .. 16 (less lag)

    const a = 1 - Math.exp(-follow * dt);
    _tx += (_rawX - _tx) * a;
    _ty += (_rawY - _ty) * a;

    _opts.setTarget?.(_tx, _ty);
  }

  api.init = function initInput(opts) {
    _opts = opts || null;
    _canvas = opts?.canvas || null;
    if (!_canvas || !_opts) return false;

    _canvas.addEventListener("pointerdown", onDown, { passive: true });
    _canvas.addEventListener("pointermove", onMove, { passive: true });
    _canvas.addEventListener("pointerup", endDrag, { passive: true });
    _canvas.addEventListener("pointercancel", endDrag, { passive: true });
    _canvas.addEventListener("pointerleave", endDrag, { passive: true });

    // single RAF loop
    const loop = () => {
      tickFollow();
      _rafId = requestAnimationFrame(loop);
    };
    _rafId = requestAnimationFrame(loop);

    return true;
  };

  api.reset = function resetInput() {
    endDrag();
  };

  api.destroy = function destroyInput() {
    if (!_canvas) return;
    _canvas.removeEventListener("pointerdown", onDown);
    _canvas.removeEventListener("pointermove", onMove);
    _canvas.removeEventListener("pointerup", endDrag);
    _canvas.removeEventListener("pointercancel", endDrag);
    _canvas.removeEventListener("pointerleave", endDrag);

    if (_rafId) cancelAnimationFrame(_rafId);
    _rafId = 0;

    endDrag();
    _canvas = null;
    _opts = null;
  };
})();