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

## Zweisprachig ab 1.0.0 — vorbereitet, noch nicht eingereicht

Das Paket hat bis 0.25.5 **nur ein deutsches** Locale-Manifest, und `DefaultLocale`
steht auf `de-DE`. Wer eine andere Sprache fährt, bekommt in `winget show`
deutschen Text — auch Englisch, Französisch, Polnisch.

Bei der nächsten Einreichung (1.0.0) soll das umgestellt werden:

- **`en-US` wird das Standard-Locale**, `de-DE` kommt als zusätzliches Manifest
  daneben. Damit landen alle Sprachen ohne eigenes Manifest bei Englisch statt
  bei Deutsch, was der Konvention in `winget-pkgs` entspricht.
- Betroffen sind drei Dateien: `Lunasans.MovieShelf.yaml` (`DefaultLocale: en-US`),
  ein neues `Lunasans.MovieShelf.locale.en-US.yaml` mit `ManifestType: defaultLocale`
  und das bestehende `…locale.de-DE.yaml`, das auf `ManifestType: locale` wechselt.
- **komac erzeugt das nicht von selbst.** Es schreibt nur das vorhandene
  Standard-Locale fort. Die zweite Datei muss einmalig von Hand in den Branch,
  den komac im Fork `lunasans/winget-pkgs` anlegt, bevor der PR gemergt wird.
  Danach trägt komac beide Dateien weiter — dieselbe Mechanik wie beim
  Icons-Block oben. Fertig dafür liegt [`locale-en-US.yaml`](locale-en-US.yaml)
  daneben; nur `PackageVersion` prüfen und die Datei als
  `Lunasans.MovieShelf.locale.en-US.yaml` ablegen.
- **Herausgeber wird `MovieShelf`.** Das veröffentlichte Manifest trägt bei
  `Publisher`, `Author` und `Copyright` noch den Klarnamen. Das ist im selben
  PR auch in `…locale.de-DE.yaml` nachzuziehen, sonst weisen die beiden Locales
  verschiedene Herausgeber aus.

Beschreibungstexte, abgestimmt mit der Landingpage. Neu ist jeweils der letzte
Satz: Ohne den Hinweis auf den TMDb-Schlüssel liest sich der Eintrag so, als
käme man ohne weitere Voraussetzung an die Metadaten.

```yaml
# en-US
ShortDescription: Manage your film collection locally and sync it with your MovieShelf.
Description: MovieShelf Desktop manages your film and series collection locally, enriches it with metadata, shows it as posters, a list or a table, and syncs it with your MovieShelf account. The film search needs your own free TMDb key - created in a minute at themoviedb.org.

# de-DE
ShortDescription: Filmsammlung lokal verwalten und mit deiner MovieShelf synchronisieren.
Description: MovieShelf Desktop verwaltet deine Film- und Seriensammlung lokal, reichert sie mit Metadaten an, zeigt sie in Poster-, Listen- und Tabellenansicht und synchronisiert sie mit deinem MovieShelf-Konto. Für die Filmsuche brauchst du einen eigenen, kostenlosen TMDb-Schlüssel - in einer Minute auf themoviedb.org angelegt.
```

## Nur Feature-Releases landen bei winget

Eingereicht wird ausschliesslich bei Tags, die auf `.0` enden — der Job in
`release.yml` prüft das per `endsWith(github.ref_name, '.0')`, damit die
winget-pkgs-Reviewer nicht mit Bugfix-Versionen geflutet werden.

Dass dort also `0.25.0` steht, während 0.25.1 bis 0.25.5 veröffentlicht sind,
ist **kein Rückstand, sondern die Absicht**. winget braucht ohnehin nur die
jeweils neueste Version; wer zwischendurch installiert, holt sich die Updates
über den eingebauten Updater.

Die nächste Einreichung ist damit 1.0.0 — und genau der Zeitpunkt für die
Umstellung oben.

## Hinweis zu Updates

Die App aktualisiert sich weiterhin **selbst** über electron-updater (GitHub-Releases).
winget ist nur ein zusätzlicher, sauberer **Installationsweg**; `winget upgrade` ist
dadurch nur ergänzend.
