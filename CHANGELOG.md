# Changelog – MovieShelf Desktop

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
