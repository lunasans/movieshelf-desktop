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

## Logo / Icon im Manifest

Ein Paket-Icon geht nur ueber das Feld `Icons` im **defaultLocale-Manifest**
(`Lunasans.MovieShelf.locale.en-US.yaml`), verfuegbar ab Schema **1.6.0**. Die
Installer- und Version-Manifeste haben kein Bildfeld.

Fertiger Block: [`icons-block.yaml`](icons-block.yaml) — im winget-pkgs-PR in das
Locale-Manifest einfuegen und `<TAG>` durch das Release-Tag ersetzen, das
`packaging/winget/icon-256.png` enthaelt. `ManifestVersion` dort auf `1.6.0`
(oder hoeher) anheben.

- `icon-256.png` ist die auf 256x256 skalierte Variante von `public/icon.png`
  (`IconResolution` kennt nur feste Groessen wie `256x256`, das Original mit
  1254x1254 passt in keine davon).
- Wird das Icon neu erzeugt, muss der `IconSha256` in `icons-block.yaml`
  mitgezogen werden: `(Get-FileHash packaging/winget/icon-256.png -Algorithm SHA256).Hash`
- `winget-releaser` schreibt pro Release nur Version und Installer-Block neu, das
  Locale-Manifest wird fortgeschrieben — der Block muss also **einmalig** rein.
- Die winget-CLI selbst rendert kein Logo; genutzt wird es von GUI-Frontends und
  Katalogseiten.

## Hinweis zu Updates

Die App aktualisiert sich weiterhin **selbst** über electron-updater (GitHub-Releases).
winget ist nur ein zusätzlicher, sauberer **Installationsweg**; `winget upgrade` ist
dadurch nur ergänzend.
