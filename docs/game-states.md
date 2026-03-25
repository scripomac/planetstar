# Planet Star – Game States

Diese Datei beschreibt alle gültigen Game-States von Planet Star,
inklusive erlaubter Eingaben, Transitions und Rendering-Regeln.

Ziel:
- Klare Trennung von Core / UI
- Keine State-Abfragen in UI-Komponenten
- State-Wechsel ausschließlich über Events

---

## Übersicht

| State     | Beschreibung |
|----------|--------------|
| STOPPED  | Spiel ist im Menü, kein aktives Gameplay |
| PLAYING  | Aktives Gameplay |
| PAUSED   | Spiel pausiert (Overlay sichtbar) |
| WIN      | Level / Spiel abgeschlossen |
| PAYWALL  | Zugriff gesperrt (Freemium-Gate) |

---

## STATE: STOPPED

### Bedeutung
- Kein aktives Level
- Startscreen / Menü sichtbar
- Kein Rendering von Gameplay-Elementen erforderlich

### Erlaubte Eingaben
- Menü-Buttons (Start / Continue / Restart)
- UI-Navigation

### Blockierte Eingaben
- Touch / Movement
- Gameplay-Input

### Erlaubte Transitions
- `STOPPED → PLAYING` (GAME_START)

### Events
- Erwartet: `GAME_START`
- Optional: `STATE`

### Rendering
- Hintergrund / Menü
- Kein Player, keine Planeten, kein Stern

---

## STATE: PLAYING

### Bedeutung
- Aktives Gameplay
- Player, Planeten, Stern sichtbar
- Timer / Progress aktiv

### Erlaubte Eingaben
- Touch / Movement
- Gameplay-Interaktionen
- Pause-Button

### Blockierte Eingaben
- Menü-Navigation
- Restart ohne Pause

### Erlaubte Transitions
- `PLAYING → PAUSED` (GAME_PAUSE)
- `PLAYING → WIN` (LEVEL_COMPLETE / GAME_OVER)
- `PLAYING → PAYWALL` (PAYWALL)

### Events
- Emittiert: `GAME_START`
- Emittiert: `LEVEL_COMPLETE`
- Emittiert: `GAME_PAUSE`
- Emittiert: `PAYWALL`

### Rendering
- Player
- Planeten
- Stern (wenn aktiv)
- Partikel / Effekte

---

## STATE: PAUSED

### Bedeutung
- Gameplay eingefroren
- Overlay sichtbar

### Erlaubte Eingaben
- Resume
- Restart
- Zurück zum Menü

### Blockierte Eingaben
- Movement
- Gameplay-Aktionen

### Erlaubte Transitions
- `PAUSED → PLAYING` (GAME_RESUME)
- `PAUSED → STOPPED` (STOP_TO_MENU)

### Events
- Emittiert: `GAME_PAUSE`
- Erwartet: `GAME_RESUME`

### Rendering
- Letzter Gameplay-Frame eingefroren
- Pause-Overlay sichtbar
- Audio pausiert

---

## STATE: WIN

### Bedeutung
- Level oder Spiel erfolgreich abgeschlossen
- Kein aktives Gameplay mehr

### Erlaubte Eingaben
- Next Level
- Restart
- Zurück zum Menü

### Blockierte Eingaben
- Gameplay-Input
- Pause

### Erlaubte Transitions
- `WIN → PLAYING` (Next Level)
- `WIN → STOPPED` (Menu)

### Events
- Emittiert: `LEVEL_COMPLETE`
- Emittiert: `GAME_OVER { reason: "WIN" }`

### Rendering
- Win-Screen / Overlay
- Gameplay im Hintergrund optional eingefroren

---

## STATE: PAYWALL

### Bedeutung
- Zugriff auf Inhalte gesperrt
- Monetarisierungs- oder Info-Screen

### Erlaubte Eingaben
- Upgrade / Kaufen
- Zurück zum Menü

### Blockierte Eingaben
- Gameplay
- Resume

### Erlaubte Transitions
- `PAYWALL → STOPPED`
- `PAYWALL → PLAYING` (nach Freischaltung)

### Events
- Emittiert: `PAYWALL`
- Emittiert: `GAME_OVER { reason: "PAYWALL" }`

### Rendering
- Paywall-Overlay
- Kein aktives Gameplay

---

## Grundregeln (wichtig)

- UI fragt **niemals** aktiv den State ab
- UI reagiert **nur** auf Events
- Core ist die einzige Stelle, die States ändert
- Jeder State-Wechsel muss ein Event auslösen
- Kein Gameplay-Code in UI-Dateien

---

## Offene Erweiterungen (später)

- STATE: TUTORIAL
- STATE: LOADING
- STATE: BACKGROUND (Idle / Demo Mode)

Diese States werden **erst nach Level 11+** betrachtet.