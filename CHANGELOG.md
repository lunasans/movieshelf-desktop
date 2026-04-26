# Changelog – MovieShelf Desktop

## [0.4.0] – 2026-04-26

### Hinzugefügt
- **Serien-Tab**: Eigener Reiter „Serien" in der Sidebar filtert nach `collection_type = Serie`; Wechsel zwischen Filme und Serien stellt Scroll-Position und geladene Seiten wieder her
- **Staffeln & Folgen**: Serien-Detailansicht zeigt Staffeln als ausklappbare Akkordeons mit Folgenliste (Nummer, Titel, Beschreibung); erste Staffel ist standardmäßig geöffnet
- **Backup-Funktion**: Lokale Sammlung als `.ms`-Datei exportieren und wiederherstellen (Einstellungen → Backup); Format ist kompatibel mit dem SaaS-Backup

### Behoben
- **Filmanzahl falsch**: Boxset-Parents werden aus Liste und Zähler ausgeschlossen; Boxset-Children werden korrekt gezählt
- **Nur 30 Filme nach Tab-Wechsel**: Beim Wechsel zwischen Filme/Serien werden alle zuvor geladenen Seiten wiederhergestellt statt neu von Seite 1 zu laden
- **Gelöschte Einträge im Sync**: Beim vollständigen Sync werden Filme, die auf dem Shelf gelöscht wurden, jetzt lokal entfernt und korrekt im Ergebnis gezählt
- **Push 404 nach Löschung**: Wenn der Shelf einen Film als gelöscht meldet, wird er lokal sofort hard-deleted und erscheint nicht mehr im Push-Queue; 404-Antworten beim Push von Löschungen werden als Erfolg gewertet
- **Staffeln nicht angezeigt**: API-Response-Parsing korrigiert (`data`-Wrapper); Online-Fallback lädt Staffeln direkt von der API wenn lokal keine vorhanden sind und speichert sie für Offline-Nutzung

### Sync-Verbesserungen
- Delta-Sync zeigt gelöschte Einträge korrekt in der Vorschau an
- Full-Sync erkennt lokale Filme ohne SaaS-Gegenstück und entfernt sie
- Staffeln und Folgen werden beim Sync für Serien automatisch mitgeladen

---

## [0.3.5] – 2026-04-25

### Behoben
- **Windows: Update-Installation**: Installer wird jetzt per `spawn` gestartet statt `shell.openPath` – der NSIS-Setup-Dialog erscheint zuverlässig
- **Update-URL leer**: Fehlermeldung statt lautlosem Abbruch wenn keine Download-URL verfügbar
- **Release-Pipeline**: SHA256-Hashes werden berechnet und mit dem Webhook übertragen; nur noch NSIS-Installer (kein Portable) wird gebaut und verlinkt

---

## [0.3.4] – 2026-04-25

### Behoben
- **Filmanzahl Dashboard / Synchronisation**: Beide Ansichten zählen jetzt identisch – Boxset-Children werden gezählt (sind Filme), Boxset-Parents nicht (sind nur Behälter)
- **Linux: Update-Installation**: `pkexec dpkg -i` öffnet nativen GUI-Passwort-Dialog; Fallback auf `xdg-open` (GDebi), danach Anleitung-Dialog mit Terminal-Befehl
- **Linux: weißes Update-Fenster**: Hauptfenster wird erst nach vollständigem Rendern angezeigt (`ready-to-show`)


---

## [0.3.3] – 2026-04-25

### Behoben
- **Fenster verschieben**: Hauptfenster lässt sich wieder per Titelleiste verschieben (Drag-Region war auf Windows/Linux nicht korrekt gesetzt)
- **Scroll-Position**: Nach dem Bearbeiten eines Films kehrt die Filmliste zur vorherigen Scroll-Position zurück, statt nach oben zu springen
- **Boxsets in der Filmliste**: Box-Set-Teile (Children) erscheinen nicht mehr separat in der Hauptliste; stattdessen zeigt das Box-Set-Parent ein „Box-Set"-Badge und die enthaltenen Filme werden in der Detailansicht unter „Enthaltene Filme" aufgelistet
- **Linux: weißes Login-Fenster**: OAuth-Fenster blieb auf Linux weiß; wird jetzt erst nach vollständigem Rendern angezeigt (`ready-to-show`)
- **Linux: App-Icon fehlt nach Installation**: Icon-Quelle auf `icon.png` (1024×1024) umgestellt; `category: AudioVideo` für korrekte Launcher-Integration ergänzt

### Build
- `build-linux.sh` erstellt jetzt ausschließlich das `.deb`-Paket
- Icon-Konfiguration für alle Plattformen vereinheitlicht (`icon.png`)

---

## [0.3.2] – 2026-04-14

### Hinzugefügt
- Play-Button durch Cover-Bild ersetzt für einheitlicheres Erscheinungsbild
- Anpassung der Play-Overlay-Deckkraft für bessere Sichtbarkeit auf Film-Karten
- `AdminMovieController` für Film-CRUD, Bild-Uploads und Datenexporte
- Movie-Model mit dynamischer Bildauflösung

### Behoben
- Code-Struktur für bessere Lesbarkeit und Wartbarkeit refaktoriert
