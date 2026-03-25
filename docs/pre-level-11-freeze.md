# Planet Star – Pre-Level-11 Freeze Checkpoint (v0.10.0)

Ziel dieses Checkpoints:
- Fundament ist stabil, wartbar, skalierbar
- Neue Level können später rein über Daten/Mechanic-Flags wachsen
- Core bleibt UI-agnostisch (Event-driven)
- Keine neuen Mechanics (Level 11–20 bleibt unberührt)

---

## A) Architektur / Trennung

### A1 — Core vs UI
- [ ] game-core kennt keine UI-Details (keine DOM-Overlays steuern)
- [ ] UI reagiert ausschließlich auf Events (keine State-Abfragen)
- [ ] Canonical Events existieren: GAME_START, GAME_PAUSE, GAME_RESUME, LEVEL_COMPLETE, GAME_OVER, PAYWALL
- [ ] Legacy Events (falls noch vorhanden) sind dokumentiert / klar als Übergang markiert

### A2 — Systems / Entities
- [ ] Input ist ausgelagert (systems/input.js), Core nutzt nur API
- [ ] Spawn ist ausgelagert (systems/spawn.js)
- [ ] Star & Planet sind Entities (entities/star.js / entities/planet.js)
- [ ] Save ist ausgelagert (systems/save.js)
- [ ] Audio ist zentral (systems/audio-controller.js oder kompatible API)

---

## B) Game States (Contract)

- [ ] docs/game-states.md existiert und ist aktuell
- [ ] Jeder State hat definierte:
  - erlaubte Inputs
  - erlaubte Transitions
  - blockierte Aktionen
  - Rendering-Regeln
- [ ] State-Wechsel emittieren Events (STATE optional, aber empfohlen)

---

## C) Levelsystem / Datengetrieben

- [ ] getLevelSettings(level) liefert normalisierte Settings (ohne Sonderfälle im Core)
- [ ] Unbekannte Level haben saubere Defaults (kein Crash)
- [ ] Mechanic Flags sind vorbereitet (noch nicht aktiv genutzt):
  - hasStarChase
  - enemySpeedMultiplier
  - gravityStrength
  - spawnRadiusMultiplier

---

## D) Difficulty / Kurven

- [ ] Zentral: systems/difficulty.js existiert
- [ ] Stern-Speed nutzt difficulty.getStarSpeedMultiplier(level)
- [ ] Spawn nutzt difficulty.getSpawnRadiusMultiplier(level) (oder ist vorbereitet)
- [ ] Planet-Anzahl folgt Regel (+5/Level) oder settings.planetsToEat als Truth

---

## E) Audio (ohne Assets, aber korrektes Verhalten)

- [ ] Audio API ist sauber: playMusic, playSfx, pauseAll, resumeAll
- [ ] Pause stoppt Musik & SFX (resume korrekt)
- [ ] visibilitychange pausiert/resumed (best-effort)
- [ ] iOS Unlock-Contract vorhanden (unlockFromGesture bei erstem Tap)

---

## F) Debug / Dev Mode

- [ ] Debug-Modus via ?debug=1 existiert
- [ ] Debug Overlay zeigt mindestens:
  - State
  - Level
  - Difficulty factor
  - eaten/total planets

---

## G) Release / Freeze

- [ ] Version festgelegt: v0.10.0 (Pre-Level-11 Base)
- [ ] Release Notes / Changelog aktualisiert
- [ ] „Freeze“-Commit/Release Ordner markiert (stable)
- [ ] Dev kann weitergehen, Stable bleibt unangetastet

---

## Ergebnis
Wenn alle Checkboxen erfüllt sind:
✅ Fundament ist „Pre-Level-11 ready“  
➡️ Nächster Arbeitsschritt: Level 11–20 designen (separat, datengetrieben, ohne Core-Umbau)