#!/bin/bash
# Einmalige Einrichtung der Paketquelle apt.movieshelf.info.
#
# Läuft vollständig im Home-Verzeichnis des CloudPanel-Site-Benutzers:
# kein root, kein /etc, kein systemd, keine Paketinstallation. aptly ist ein
# einzelnes statisches Programm und wird nach ~/bin gelegt; den Webserver und
# das Zertifikat stellt die Static-HTML-Site von CloudPanel.
#
# Aufruf als Site-Benutzer:
#
#   bash setup.sh /home/<site-user>/htdocs/apt.movieshelf.info
#
set -euo pipefail

HTDOCS="${1:-}"
if [ -z "$HTDOCS" ] || [ ! -d "$HTDOCS" ]; then
  echo "Aufruf: bash setup.sh <Wurzelverzeichnis der Website>" >&2
  exit 1
fi

APTLY_VERSION="1.6.2"
BIN="$HOME/bin"
ROOT="$HOME/apt"
KEY_MAIL="app@movieshelf.info"
KEY_NAME="MovieShelf Paketquelle"

mkdir -p "$BIN" "$ROOT" "$ROOT/incoming"

echo "── aptly holen"
if [ ! -x "$BIN/aptly" ]; then
  tmp=$(mktemp -d)
  curl -fsSL -o "$tmp/aptly.tar.gz" \
    "https://github.com/aptly-dev/aptly/releases/download/v${APTLY_VERSION}/aptly_${APTLY_VERSION}_linux_amd64.tar.gz"
  tar -xzf "$tmp/aptly.tar.gz" -C "$tmp"
  install -m 755 "$tmp"/aptly_*/aptly "$BIN/aptly"
  rm -rf "$tmp"
fi
"$BIN/aptly" version

echo "── aptly einrichten"
cat > "$HOME/.aptly.conf" <<EOF
{
  "rootDir": "$ROOT/aptly",
  "architectures": ["amd64"],
  "gpgProvider": "gpg"
}
EOF

echo "── Signaturschlüssel"
# Ohne Passphrase: signiert wird unbeaufsichtigt aus dem Cron-Job heraus.
# Der Schutz liegt darin, dass der Schlüssel den Server nie verlässt und nur
# diesem Benutzer gehört.
if ! gpg --list-secret-keys "$KEY_MAIL" > /dev/null 2>&1; then
  gpg --batch --gen-key <<EOF
Key-Type: RSA
Key-Length: 4096
Name-Real: $KEY_NAME
Name-Email: $KEY_MAIL
Expire-Date: 0
%no-protection
%commit
EOF
fi

echo "── Öffentlichen Schlüssel für Nutzer bereitlegen"
gpg --export "$KEY_MAIL" > "$HTDOCS/movieshelf.gpg"
chmod 644 "$HTDOCS/movieshelf.gpg"

echo "── Skript einrichten"
install -m 755 "$(dirname "$0")/apt-sync" "$BIN/apt-sync"

# Das Wurzelverzeichnis der Website merken, damit apt-sync die Verweise nach
# der ersten Veröffentlichung selbst setzen kann.
echo "$HTDOCS" > "$HOME/.movieshelf-htdocs"

cat <<EOF

Fertig. Noch zu tun:

1. In CloudPanel unter der Site → Cron Jobs eintragen (viertelstündlich):

   */15 * * * * $BIN/apt-sync >> $ROOT/apt-sync.log 2>&1

2. Ersten Durchlauf von Hand anstoßen:

   $BIN/apt-sync

3. Fingerabdruck des Signaturschlüssels für die Dokumentation:
EOF
gpg --fingerprint "$KEY_MAIL"
