// systems/events.js
(() => {
  "use strict";

  window.PS = window.PS || {};

  // Central event bus. Also mirrors events as DOM CustomEvents: "planetstar:<NAME>"
  const listeners = new Map();

  function on(name, fn) {
    if (!listeners.has(name)) listeners.set(name, new Set());
    listeners.get(name).add(fn);
    return () => off(name, fn);
  }

  function off(name, fn) {
    const set = listeners.get(name);
    if (!set) return;
    set.delete(fn);
    if (set.size === 0) listeners.delete(name);
  }

  function emit(name, detail = {}) {
    // Internal listeners
    const set = listeners.get(name);
    if (set) {
      for (const fn of Array.from(set)) {
        try { fn(detail); } catch (e) { console.error("[events] handler error:", name, e); }
      }
    }

    // DOM event mirror (so existing code can still use addEventListener)
    try {
      window.dispatchEvent(new CustomEvent(`planetstar:${name}`, { detail }));
    } catch (e) {
      console.error("[events] DOM emit error:", name, e);
    }
  }

  window.PS.events = { on, off, emit };
})();