# Security - English 

## Supported Versions

Security fixes are included exclusively in the latest version. Older versions are not retroactively maintained—please keep MovieShelf up to date. The app checks for updates on its own and notifies you when new versions are available.

## Reporting a Vulnerability

Please **do not** report security vulnerabilities via public issues.
Instead, use one of these methods:

- [Private message via GitHub](https://github.com/lunasans/movieshelf-desktop/security/advisories/new) (preferred)
- Email **app@movieshelf.info**

The following information will help me troubleshoot the issue:

- The affected version and operating system
- Whether standalone or online mode is affected
- Steps to reproduce the issue
- The issue you're experiencing

I'll get back to you within a few days. MovieShelf is a one-person side project—there is no bug bounty program and no guaranteed response times. Please be patient and wait to publish the issue until a fix is available.

## What Is Particularly Relevant

Some areas carry more weight than others:

- **Auto-Updater** – Retrieving and verifying installation files
- **IPC bridge** between the renderer and the main process (`electron/preload.ts`)
- **Credentials** – TMDb key, as well as the URL and token for the MovieShelf instance
- **Media downloads** and the `movie-resource://` protocol
- **Backup Import** (`.ms` archives) – processing untrusted archives

## Dependencies

Dependencies are monitored via Dependabot, supplemented by CodeQL analyses on every pull request. If you find a vulnerable dependency for which no alert yet exists, please let us know.

# Sicherheit - Deutsch

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
