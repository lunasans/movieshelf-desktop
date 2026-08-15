#!/usr/bin/env python3
"""Trägt die Release-Notizen je Sprache im eingereichten winget-Manifest nach.

Warum es das braucht: `komac update` hat keinen Schalter für die Notizen. komac
zieht sie selbst aus dem GitHub-Release-Text — der ist deutsch, weil der
`notify`-Job ihn aus CHANGELOG.md schneidet — und schreibt sie ausschließlich ins
Standard-Locale. Seit 1.0.0 ist das en-US. Ohne diesen Schritt bekaeme also die
englische Datei deutschen Text und die deutsche gar keinen.

Der Schritt läuft nach `komac update --submit` und schiebt einen weiteren Commit
in den Branch, den komac im Fork angelegt hat.

Aufruf:
    release-notes.py --version 1.1.0
    release-notes.py --version 1.1.0 --dry-run
    release-notes.py --version 1.1.0 --dry-run --lokal VERZEICHNIS

`--lokal` liest die Manifest-Dateien aus einem Verzeichnis statt von GitHub; damit
lässt sich die Ersetzung ohne Netz und ohne Token prüfen.
"""

from __future__ import annotations

import argparse
import base64
import json
import os
import re
import sys
import urllib.error
import urllib.parse
import urllib.request

FORK = "lunasans/winget-pkgs"
PAKET = "Lunasans.MovieShelf"
MANIFEST_VERZEICHNIS = "manifests/l/Lunasans/MovieShelf"
RELEASE_URL = "https://github.com/lunasans/movieshelf-desktop/releases/tag/v{version}"

# Was das winget-Schema für ReleaseNotes zulässt.
MAX_ZEICHEN = 10000

# Locale-Datei -> Changelog, aus dem ihre Notizen stammen.
QUELLEN = {
    "en-US": "CHANGELOG.en.md",
    "de-DE": "CHANGELOG.md",
}


class Abbruch(Exception):
    """Fehler, der dem Nutzer als Klartext gezeigt wird, ohne Stacktrace."""


# --------------------------------------------------------------------------
# Changelog
# --------------------------------------------------------------------------

def abschnitt_lesen(pfad: str, version: str) -> str:
    """Schneidet den Abschnitt `## [version]` heraus — wie awk in release.yml."""
    try:
        with open(pfad, encoding="utf-8") as datei:
            zeilen = datei.read().splitlines()
    except FileNotFoundError:
        raise Abbruch(f"{pfad} fehlt.")

    beginn = re.compile(r"^## \[" + re.escape(version) + r"\]")
    folgender = re.compile(r"^## \[")

    gesammelt: list[str] = []
    drin = False
    for zeile in zeilen:
        if drin and folgender.match(zeile):
            break
        if drin:
            gesammelt.append(zeile)
        elif beginn.match(zeile):
            drin = True

    if not drin:
        raise Abbruch(
            f"In {pfad} fehlt der Abschnitt '## [{version}]'.\n"
            "Feature-Releases brauchen einen englischen Changelog-Abschnitt — "
            "siehe packaging/winget/README.md. Lieber hier abbrechen, als "
            "deutschen Text als englischen einzureichen."
        )
    return "\n".join(gesammelt)


def als_klartext(markdown: str) -> str:
    """Reduziert Markdown auf das, was komac auch erzeugt.

    Also: keine Fettschrift, keine Rautenzeichen vor Überschriften, keine
    Trennlinien und keine Leerzeilen. Der Zeilenumbruch der Quelle bleibt.
    """
    ergebnis: list[str] = []
    for zeile in markdown.splitlines():
        zeile = zeile.rstrip()
        if not zeile.strip() or re.fullmatch(r"-{3,}", zeile.strip()):
            continue
        zeile = re.sub(r"^#{1,6}\s+", "", zeile)
        zeile = zeile.replace("**", "")
        # Backticks stehen im Manifest nur als Zeichen im Weg.
        zeile = zeile.replace("`", "")
        ergebnis.append(zeile)
    return "\n".join(ergebnis)


# --------------------------------------------------------------------------
# YAML — bewusst zeilenweise statt über einen Parser
# --------------------------------------------------------------------------

def notizen_ersetzen(inhalt: str, notizen: str) -> str:
    """Tauscht den ReleaseNotes-Block aus, ohne den Rest der Datei anzufassen.

    Ein YAML-Parser würde die Datei neu schreiben und dabei Kommentare,
    Feldreihenfolge und Zeichenketten-Stil verlieren — bei einem Manifest, das
    Menschen bei Microsoft prüfen, ist das den Aufwand nicht wert.
    """
    zeilen = inhalt.splitlines()
    block = ["ReleaseNotes: |-"] + [f"  {z}" for z in notizen.splitlines()]

    beginn = None
    for nummer, zeile in enumerate(zeilen):
        if zeile.startswith("ReleaseNotes:"):
            beginn = nummer
            break

    if beginn is None:
        # Noch kein Block vorhanden: vor ReleaseNotesUrl einfuegen, sonst vor
        # ManifestType — beide stehen laut Schema hinter den Notizen.
        for anker in ("ReleaseNotesUrl:", "ManifestType:"):
            treffer = [n for n, z in enumerate(zeilen) if z.startswith(anker)]
            if treffer:
                stelle = treffer[0]
                return "\n".join(zeilen[:stelle] + block + zeilen[stelle:]) + "\n"
        raise Abbruch("Manifest hat weder ReleaseNotesUrl noch ManifestType.")

    # Ende des Blockskalars: die nächste Zeile, die in Spalte 0 beginnt.
    ende = len(zeilen)
    for nummer in range(beginn + 1, len(zeilen)):
        zeile = zeilen[nummer]
        if zeile and not zeile[0].isspace():
            ende = nummer
            break

    return "\n".join(zeilen[:beginn] + block + zeilen[ende:]) + "\n"


def feld_setzen(inhalt: str, feld: str, wert: str) -> str:
    """Setzt ein einzeiliges Feld, oder legt es vor ManifestType an.

    Nötig für ReleaseNotesUrl: die winget-Validierung vergleicht jede Version
    mit der zuletzt veröffentlichten und meldet jedes Feld, das verschwindet
    ("Manifest-Metadata-Consistency"). Beim Wechsel des Standard-Locales auf
    en-US ist genau das passiert, weil die neue Datei beide Notizen-Felder nicht
    hatte.
    """
    zeilen = inhalt.splitlines()
    neu = f"{feld}: {wert}"

    for nummer, zeile in enumerate(zeilen):
        if zeile.startswith(f"{feld}:"):
            zeilen[nummer] = neu
            return "\n".join(zeilen) + "\n"

    treffer = [n for n, z in enumerate(zeilen) if z.startswith("ManifestType:")]
    if not treffer:
        raise Abbruch(f"Manifest hat kein ManifestType, {feld} nicht platzierbar.")
    stelle = treffer[0]
    return "\n".join(zeilen[:stelle] + [neu] + zeilen[stelle:]) + "\n"


# --------------------------------------------------------------------------
# GitHub
# --------------------------------------------------------------------------

def api(pfad: str, methode: str = "GET", nutzlast: dict | None = None):
    token = os.environ.get("GH_TOKEN") or os.environ.get("GITHUB_TOKEN")
    if not token:
        raise Abbruch("GH_TOKEN ist nicht gesetzt.")

    daten = json.dumps(nutzlast).encode("utf-8") if nutzlast is not None else None
    anfrage = urllib.request.Request(
        f"https://api.github.com/{pfad.lstrip('/')}",
        data=daten,
        method=methode,
        headers={
            "Authorization": f"Bearer {token}",
            "Accept": "application/vnd.github+json",
            "Content-Type": "application/json",
            "User-Agent": "movieshelf-release-notes",
        },
    )
    try:
        with urllib.request.urlopen(anfrage) as antwort:
            return json.loads(antwort.read().decode("utf-8"))
    except urllib.error.HTTPError as fehler:
        raise Abbruch(
            f"GitHub {methode} {pfad} -> {fehler.code}\n{fehler.read().decode('utf-8', 'replace')}"
        )


def branch_finden(version: str) -> str:
    """Sucht den Branch, den komac angelegt hat.

    Der Name lautet `Lunasans.MovieShelf-<version>-<UUID>`; den UUID-Teil vergibt
    komac, deshalb wird über das Präfix gesucht.
    """
    präfix = f"{PAKET}-{version}-"
    seite = 1
    treffer: list[str] = []
    while True:
        stapel = api(f"repos/{FORK}/branches?per_page=100&page={seite}")
        if not stapel:
            break
        treffer += [b["name"] for b in stapel if b["name"].startswith(präfix)]
        if len(stapel) < 100:
            break
        seite += 1

    if not treffer:
        raise Abbruch(f"Kein Branch mit Präfix '{präfix}' im Fork {FORK}.")
    if len(treffer) > 1:
        raise Abbruch("Mehrere passende Branches, uneindeutig:\n  " + "\n  ".join(treffer))
    return treffer[0]


def datei_lesen(branch: str, pfad: str) -> str:
    antwort = api(f"repos/{FORK}/contents/{urllib.parse.quote(pfad)}?ref={urllib.parse.quote(branch)}")
    return base64.b64decode(antwort["content"]).decode("utf-8")


def commit_schreiben(branch: str, dateien: dict[str, str], nachricht: str) -> str:
    """Legt alle Dateien in einem einzigen Commit ab."""
    ref = api(f"repos/{FORK}/git/ref/heads/{urllib.parse.quote(branch)}")
    kopf = ref["object"]["sha"]
    basis = api(f"repos/{FORK}/git/commits/{kopf}")["tree"]["sha"]

    baum = []
    for pfad, inhalt in dateien.items():
        blob = api(
            f"repos/{FORK}/git/blobs",
            "POST",
            {"content": base64.b64encode(inhalt.encode("utf-8")).decode("ascii"),
             "encoding": "base64"},
        )
        baum.append({"path": pfad, "mode": "100644", "type": "blob", "sha": blob["sha"]})

    neuer_baum = api(f"repos/{FORK}/git/trees", "POST", {"base_tree": basis, "tree": baum})
    commit = api(
        f"repos/{FORK}/git/commits",
        "POST",
        {"message": nachricht, "tree": neuer_baum["sha"], "parents": [kopf]},
    )
    api(f"repos/{FORK}/git/refs/heads/{urllib.parse.quote(branch)}", "PATCH",
        {"sha": commit["sha"]})
    return commit["sha"]


# --------------------------------------------------------------------------

def main() -> int:
    zerleger = argparse.ArgumentParser(description=__doc__)
    zerleger.add_argument("--version", required=True, help="Version ohne führendes v")
    zerleger.add_argument("--dry-run", action="store_true",
                          help="Ergebnis ausgeben statt pushen")
    zerleger.add_argument("--lokal", metavar="VERZEICHNIS",
                          help="Manifeste von dort lesen statt von GitHub")
    argumente = zerleger.parse_args()
    version = argumente.version

    # Zuerst die Texte — schlägt das fehl, ist noch nichts angefasst.
    notizen = {}
    for locale, quelle in QUELLEN.items():
        text = als_klartext(abschnitt_lesen(quelle, version))
        if not text.strip():
            raise Abbruch(f"Abschnitt '## [{version}]' in {quelle} ist leer.")
        if len(text) > MAX_ZEICHEN:
            raise Abbruch(
                f"Notizen für {locale} sind {len(text)} Zeichen lang, "
                f"das winget-Schema lässt {MAX_ZEICHEN} zu."
            )
        notizen[locale] = text

    branch = None if argumente.lokal else branch_finden(version)
    if branch:
        print(f"Branch: {branch}")

    ergebnisse = {}
    for locale, text in notizen.items():
        name = f"{PAKET}.locale.{locale}.yaml"
        pfad = f"{MANIFEST_VERZEICHNIS}/{version}/{name}"
        if argumente.lokal:
            with open(os.path.join(argumente.lokal, name), encoding="utf-8") as datei:
                vorher = datei.read()
        else:
            vorher = datei_lesen(branch, pfad)
        nachher = notizen_ersetzen(vorher, text)
        nachher = feld_setzen(nachher, "ReleaseNotesUrl", RELEASE_URL.format(version=version))
        ergebnisse[pfad] = nachher

    if argumente.dry_run:
        for pfad, inhalt in ergebnisse.items():
            print(f"\n===== {pfad} =====")
            sys.stdout.write(inhalt)
        return 0

    sha = commit_schreiben(
        branch, ergebnisse,
        f"Add localised release notes for {version}",
    )
    print(f"Commit {sha[:7]} auf {branch}: " + ", ".join(sorted(ergebnisse)))
    return 0


if __name__ == "__main__":
    try:
        sys.exit(main())
    except Abbruch as fehler:
        print(f"Fehler: {fehler}", file=sys.stderr)
        sys.exit(1)
