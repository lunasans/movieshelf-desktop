# winget-Veröffentlichung

MovieShelf Desktop kann über den Windows-Paketmanager installiert werden:

```powershell
winget install movieshelf            # via Moniker
winget install Lunasans.MovieShelf   # via volle ID
```

**Paket-ID:** `Lunasans.MovieShelf` (dauerhaft, nicht ändern) · **Moniker:** `movieshelf`.

## Automatik (CI)

Die reguläre Einreichung läuft als Job `winget` in
[`.github/workflows/release.yml`](../../.github/workflows/release.yml), und zwar nur
bei Feature-Releases (siehe unten). [`winget.yml`](../../.github/workflows/winget.yml)
ist der manuelle Nachreiche-Weg per `workflow_dispatch`.

Dafür nötig: Repo-Secret **`WINGET_TOKEN`** = klassischer GitHub-PAT mit den Scopes
`public_repo` **und** `workflow`.

### Wenn `komac sync-fork` scheitert

Die Meldung ist nichtssagend — „Something went wrong while executing your query"
samt GitHub-Fehlerkennung, Exit 1. Die Ursache ist in aller Regel weder Token noch
Manifest, sondern der **Rückstand des Forks**: bei 1.0.0 lag `lunasans/winget-pkgs`
3570 Commits zurück, und GitHubs Sync gibt bei einem Repo dieser Größe einfach auf.

Stand prüfen und ohne Klon nachziehen:

```bash
gh api repos/lunasans/winget-pkgs/compare/microsoft:master...lunasans:master \
  --jq '{ahead: .ahead_by, behind: .behind_by}'
gh api repos/lunasans/winget-pkgs/merge-upstream -f branch=master
gh run rerun <run-id> --failed
```

Solange `ahead` bei 0 steht, ist das ein reiner Fast-Forward ohne eigene Commits.

## Einmalige Erst-Einreichung (Bootstrap)

Die Automatik aktualisiert nur ein **bestehendes** Paket. Die allererste Version muss
einmal manuell eingereicht werden — am einfachsten mit **komac**:

```powershell
winget install komac
$env:GITHUB_TOKEN = "ghp_DEIN_TOKEN"
komac new Lunasans.MovieShelf `
  --urls https://github.com/lunasans/movieshelf-desktop/releases/download/v0.15.0/MovieShelf-Setup-0.15.0.exe `
  --version 0.15.0
```

Beim Moniker-Feld `movieshelf` eingeben. komac lädt den Installer, berechnet den
SHA256, erzeugt die drei Manifest-Dateien (version / installer / locale) und öffnet
den Pull Request. Nach der Freigabe durch
einen winget-Moderator übernimmt die CI alle weiteren Versionen automatisch.

## Logo / Icon im Manifest — derzeit nicht möglich

**Nicht erneut versuchen, solange `Lunasans` kein verifizierter Publisher ist.**

Der Versuch beim Release 0.24.0 (winget-pkgs PR #411233) ist an der
Manifest-Validierung gescheitert:

```
[Error] FieldRequireVerifiedPublisher: Field usage requires verified publishers. (Icons)
```

Das Feld `Icons` ist verifizierten Publishern vorbehalten. Am Block selbst lag
es nicht: IconUrl lieferte HTTP 200 als `image/png`, exakt 256x256 (RGBA), und
der `IconSha256` stimmte mit der ausgelieferten Datei überein — geprüft. Ein
korrekter Block wird trotzdem abgelehnt.

Der vorbereitete Block liegt weiter unter [`icons-block.yaml`](icons-block.yaml),
falls sich das durch eine Publisher-Verifizierung einmal ändert. Dann gilt:

- Ziel ist das **defaultLocale-Manifest**, hier `Lunasans.MovieShelf.locale.de-DE.yaml`
  (de-DE, nicht en-US). Installer- und Version-Manifest haben kein Bildfeld.
- `ManifestVersion` nicht anfassen, komac schreibt bereits 1.12.0 (`Icons` gibt
  es ab Schema 1.6.0).
- `winget-releaser` schreibt pro Release nur Version und Installer-Block neu,
  das Locale-Manifest wird fortgeschrieben — der Block muss also einmalig rein.
- `icon-256.png` ist die auf 256x256 skalierte Variante von `public/icon.png`
  (`IconResolution` kennt nur feste Größen, das Original mit 1254x1254 passt
  in keine davon).
- Wird das Icon neu erzeugt, müssen Tag in der IconUrl und `IconSha256`
  gemeinsam nachgezogen werden:
  `(Get-FileHash packaging/winget/icon-256.png -Algorithm SHA256).Hash`
- Die winget-CLI selbst rendert ohnehin kein Logo; genutzt wird es von
  GUI-Frontends und Katalogseiten.

## Zweisprachig seit 1.0.0 — erledigt

Bis 0.25.5 hatte das Paket **nur ein deutsches** Locale-Manifest mit
`DefaultLocale: de-DE`; wer eine andere Sprache fuhr, bekam in `winget show`
deutschen Text. Mit der Einreichung von 1.0.0 (winget-pkgs PR #417758) ist das
umgestellt:

- **`en-US` ist das Standard-Locale**, `de-DE` liegt als zusätzliches Manifest
  daneben. Sprachen ohne eigenes Manifest landen damit bei Englisch, wie es der
  Konvention in `winget-pkgs` entspricht.
- **Herausgeber ist `MovieShelf`** statt des Klarnamens — in beiden Locales.
- komac schreibt beide Dateien ab jetzt von selbst fort. Der Handgriff war
  einmalig; [`locale-en-US.yaml`](locale-en-US.yaml) bleibt als Vorlage liegen.

Beschreibungstexte, abgestimmt mit der Landingpage. Der jeweils letzte Satz ist
bewusst gesetzt: Ohne den Hinweis auf den TMDb-Schlüssel liest sich der Eintrag so,
als käme man ohne weitere Voraussetzung an die Metadaten.

```yaml
# en-US
ShortDescription: Manage your film collection locally and sync it with your MovieShelf.
Description: MovieShelf Desktop manages your film and series collection locally, enriches it with metadata, shows it as posters, a list or a table, and syncs it with your MovieShelf account. The film search needs your own free TMDb key - created in a minute at themoviedb.org.

# de-DE
ShortDescription: Filmsammlung lokal verwalten und mit deiner MovieShelf synchronisieren.
Description: MovieShelf Desktop verwaltet deine Film- und Seriensammlung lokal, reichert sie mit Metadaten an, zeigt sie in Poster-, Listen- und Tabellenansicht und synchronisiert sie mit deinem MovieShelf-Konto. Für die Filmsuche brauchst du einen eigenen, kostenlosen TMDb-Schlüssel - in einer Minute auf themoviedb.org angelegt.
```

## Release-Notizen je Sprache

**Ein Feature-Release braucht einen englischen Changelog-Abschnitt in
`CHANGELOG.en.md`.** Fehlt er, bricht der winget-Job ab.

Der Grund ist eine Eigenheit von komac: Für die Notizen gibt es **keinen Schalter**.
komac zieht sie selbst aus dem GitHub-Release-Text — und den schneidet der
`notify`-Job aus dem **deutschen** `CHANGELOG.md` — und schreibt sie
ausschließlich ins **Standard-Locale**. Seit der Umstellung auf `en-US` würde
also deutscher Text in der englischen Datei landen und die deutsche leer bleiben.

Deshalb läuft nach `komac update --submit` ein weiterer Schritt:
[`release-notes.py`](release-notes.py) schneidet beide Abschnitte, reduziert das
Markdown auf das, was komac auch erzeugt, und setzt `ReleaseNotes` **und**
`ReleaseNotesUrl` in `…locale.en-US.yaml` und `…locale.de-DE.yaml` — in einem
Commit auf den Branch, den komac im Fork angelegt hat.

Dass auch die URL gesetzt wird, ist kein Beiwerk: die winget-Validierung vergleicht
jede Einreichung mit der zuletzt veröffentlichten Version und meldet jedes Feld,
das verschwindet. Bei 1.0.0 ist genau das passiert, weil das frisch angelegte
en-US-Manifest beide Felder nicht hatte:

```
Inconsistencies detected in package Lunasans.MovieShelf version 1.0.0
based on published version 0.25.0
- Missing property ReleaseNotes
- Missing property ReleaseNotesUrl
```

Label dazu: `Manifest-Metadata-Consistency`.

Die Ersetzung arbeitet zeilenweise statt über einen YAML-Parser: ein Parser würde
die Datei neu schreiben und dabei Kommentare, Feldreihenfolge und Zeichenketten-Stil
verlieren, was bei einem Manifest, das Menschen bei Microsoft prüfen, den Aufwand
nicht wert ist.

Ohne Netz und ohne Token prüfen — Manifest-Dateien in ein Verzeichnis legen und:

```bash
python3 packaging/winget/release-notes.py --version 1.1.0 --dry-run --lokal ./verzeichnis
```

`CHANGELOG.en.md` führt **nur Feature-Releases**; Bugfix-Versionen gehen nie zu
winget und stehen allein in `CHANGELOG.md`.

## Nur Feature-Releases landen bei winget

Eingereicht wird ausschließlich bei Tags, die auf `.0` enden — der Job in
`release.yml` prüft das per `endsWith(github.ref_name, '.0')`, damit die
winget-pkgs-Reviewer nicht mit Bugfix-Versionen geflutet werden.

Dass bei winget also eine ältere Versionsnummer steht als die zuletzt
veröffentlichte, ist **kein Rückstand, sondern die Absicht** — so wie `0.25.0`
dort stand, während 0.25.1 bis 0.25.5 draußen waren. winget braucht ohnehin nur
die jeweils neueste Version; wer zwischendurch installiert, holt sich die Updates
über den eingebauten Updater.

## Hinweis zu Updates

Die App aktualisiert sich weiterhin **selbst** über electron-updater (GitHub-Releases).
winget ist nur ein zusätzlicher, sauberer **Installationsweg**; `winget upgrade` ist
dadurch nur ergänzend.
