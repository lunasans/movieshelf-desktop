# Sicherheit

## Unterstützte Versionen

Sicherheitskorrekturen fließen ausschließlich in die jeweils neueste Version ein. Ältere Versionen werden nicht rückwirkend gepflegt – bitte halte MovieShelf aktuell. Die App prüft selbst auf Updates und weist auf neue Versionen hin.

## Eine Schwachstelle melden

Bitte melde Sicherheitslücken **nicht über öffentliche Issues**.

Nutze stattdessen einen dieser Wege:

- [Private Meldung über GitHub](https://github.com/lunasans/movieshelf-desktop/security/advisories/new) (bevorzugt)
- E-Mail an **app@movieshelf.info**

Hilfreich für die Einordnung sind:

- betroffene Version und Betriebssystem
- ob der Standalone- oder der Online-Modus betroffen ist
- Schritte zum Nachvollziehen
- die Auswirkung, die du siehst

Ich melde mich innerhalb weniger Tage zurück. MovieShelf ist ein Freizeitprojekt einer einzelnen Person – es gibt kein Bug-Bounty-Programm und keine zugesicherten Reaktionszeiten. Ich bitte um etwas Geduld und darum, mit einer Veröffentlichung zu warten, bis eine Korrektur bereitsteht.

## Was besonders relevant ist

Einige Bereiche wiegen schwerer als andere:

- **Auto-Updater** – Bezug und Prüfung von Installationsdateien
- **IPC-Brücke** zwischen Renderer und Hauptprozess (`electron/preload.ts`)
- **Zugangsdaten** – TMDb-Schlüssel sowie URL und Token der MovieShelf-Instanz
- **Medien-Downloads** und das Protokoll `movie-resource://`
- **Backup-Import** (`.ms`-Archive) – Verarbeitung nicht vertrauenswürdiger Archive

## Abhängigkeiten

Abhängigkeiten werden über Dependabot beobachtet, ergänzt um CodeQL-Analysen auf jedem Pull Request. Findest du eine verwundbare Abhängigkeit, für die noch kein Alert existiert, ist ein Hinweis trotzdem willkommen.
