# winget-Veröffentlichung

MovieShelf Desktop kann über den Windows-Paketmanager installiert werden:

```powershell
winget install movieshelf            # via Moniker
winget install Lunasans.MovieShelf   # via volle ID
```

**Paket-ID:** `Lunasans.MovieShelf` (dauerhaft, nicht ändern) · **Moniker:** `movieshelf`.

## Automatik (CI)

[`.github/workflows/winget.yml`](../../.github/workflows/winget.yml) reicht bei jedem
veröffentlichten Release automatisch ein aktualisiertes Manifest bei
`microsoft/winget-pkgs` ein (per `komac`/winget-releaser).

Dafür nötig: Repo-Secret **`WINGET_TOKEN`** = klassischer GitHub-PAT mit Scope
`public_repo` (forkt winget-pkgs und öffnet den PR).

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

## Logo / Icon im Manifest — derzeit nicht moeglich

**Nicht erneut versuchen, solange `Lunasans` kein verifizierter Publisher ist.**

Der Versuch beim Release 0.24.0 (winget-pkgs PR #411233) ist an der
Manifest-Validierung gescheitert:

```
[Error] FieldRequireVerifiedPublisher: Field usage requires verified publishers. (Icons)
```

Das Feld `Icons` ist verifizierten Publishern vorbehalten. Am Block selbst lag
es nicht: IconUrl lieferte HTTP 200 als `image/png`, exakt 256x256 (RGBA), und
der `IconSha256` stimmte mit der ausgelieferten Datei ueberein — geprueft. Ein
korrekter Block wird trotzdem abgelehnt.

Der vorbereitete Block liegt weiter unter [`icons-block.yaml`](icons-block.yaml),
falls sich das durch eine Publisher-Verifizierung einmal aendert. Dann gilt:

- Ziel ist das **defaultLocale-Manifest**, hier `Lunasans.MovieShelf.locale.de-DE.yaml`
  (de-DE, nicht en-US). Installer- und Version-Manifest haben kein Bildfeld.
- `ManifestVersion` nicht anfassen, komac schreibt bereits 1.12.0 (`Icons` gibt
  es ab Schema 1.6.0).
- `winget-releaser` schreibt pro Release nur Version und Installer-Block neu,
  das Locale-Manifest wird fortgeschrieben — der Block muss also einmalig rein.
- `icon-256.png` ist die auf 256x256 skalierte Variante von `public/icon.png`
  (`IconResolution` kennt nur feste Groessen, das Original mit 1254x1254 passt
  in keine davon).
- Wird das Icon neu erzeugt, muessen Tag in der IconUrl und `IconSha256`
  gemeinsam nachgezogen werden:
  `(Get-FileHash packaging/winget/icon-256.png -Algorithm SHA256).Hash`
- Die winget-CLI selbst rendert ohnehin kein Logo; genutzt wird es von
  GUI-Frontends und Katalogseiten.

## Hinweis zu Updates

Die App aktualisiert sich weiterhin **selbst** über electron-updater (GitHub-Releases).
winget ist nur ein zusätzlicher, sauberer **Installationsweg**; `winget upgrade` ist
dadurch nur ergänzend.
