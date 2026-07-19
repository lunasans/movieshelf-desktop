# Security Policy

## Unterstützte Versionen

Sicherheitsupdates erhält ausschließlich die jeweils aktuelle Release-Version der Desktop-App (Auto-Update bzw. [Releases](https://github.com/lunasans/movieshelf-desktop/releases)).

| Version | Unterstützt |
| ------- | ----------- |
| 0.20.x (aktuell) | Ja |
| Ältere Versionen | Nein |

## Sicherheitslücke melden

Bitte melde Sicherheitslücken **nicht** über öffentliche GitHub-Issues.

- **E-Mail:** support@movieshelf.info (Betreff: "Security")
- Alternativ über GitHubs private Schwachstellen-Meldung: *Security → Report a vulnerability* in diesem Repository

Relevante Angriffsflächen sind insbesondere der IPC-Bridge (`window.electron`), der Umgang mit heruntergeladenen Medien/Installern (SHA256-verifizierte Updates) und die Synchronisation mit einer Shelf-Instanz. Bitte beschreibe Schritte zur Reproduktion und die mögliche Auswirkung.

## Was du erwarten kannst

- **Eingangsbestätigung** innerhalb von 72 Stunden
- **Ersteinschätzung** (angenommen/abgelehnt, Schweregrad) innerhalb von 7 Tagen
- Bestätigte Lücken werden priorisiert behoben und als Patch-Release über den Auto-Updater verteilt
- Koordinierte Offenlegung: Bitte gib uns bis zu 90 Tage Zeit, bevor Details veröffentlicht werden

MovieShelf ist ein privates Open-Source-Projekt; ein Bug-Bounty-Programm gibt es nicht. Verantwortungsvoll gemeldete Lücken werden auf Wunsch im Release vermerkt (Credits).
