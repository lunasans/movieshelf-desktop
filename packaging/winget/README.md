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

## Hinweis zu Updates

Die App aktualisiert sich weiterhin **selbst** über electron-updater (GitHub-Releases).
winget ist nur ein zusätzlicher, sauberer **Installationsweg**; `winget upgrade` ist
dadurch nur ergänzend.
