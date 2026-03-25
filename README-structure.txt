Planet Star – neue Struktur (Scaffold)

Ziel: Code sauber trennen, ohne dass du beim Entwickeln ständig Spielstart/Buttons zerstörst.

Aktueller Stand (dieses Paket):
- Spiel läuft wie vorher, aber Dateien sind bereits so angeordnet, dass wir jetzt Schritt für Schritt
  Logik aus game-core.js in die Module ziehen können.

Nächste Schritte (in Reihenfolge):
1) systems/spawn.js: spawnPlanetsForLevel + spawnStar aus game-core.js auslagern
2) systems/collisions.js: eatCheck + star catch check auslagern
3) entities/*.js: createPlayer/Planet/Star erweitern und render/update dorthin ziehen
4) ui/hud.js & ui/pause.js: UI-Logik vom Core trennen
5) audio/: Musik + SFX sauber integrieren (iOS Resume Thema später)

Wichtig: Die Haupt-API bleibt window.Game, damit ui/menu.js stabil bleibt.
