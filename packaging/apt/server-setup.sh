#!/bin/bash
# Einmalige Einrichtung der Paketquelle apt.movieshelf.info.
# Als root auf dem Server ausführen. Mehrfaches Ausführen ist unschädlich.
#
#   sudo bash server-setup.sh
#
# Mit CloudPanel: dort zuerst eine "Static HTML Site" für apt.movieshelf.info
# anlegen (übernimmt vhost, TLS und Erneuerung), dann deren Wurzelverzeichnis
# übergeben und den eigenen nginx-Teil überspringen:
#
#   sudo PUBLIC_DIR=/home/apt-movieshelf/htdocs/apt.movieshelf.info \
#        SETUP_NGINX=0 bash server-setup.sh
#
# Danach ist noch von Hand zu erledigen (siehe README.md):
#   - öffentlichen Deploy-Schlüssel in /home/apt/.ssh/authorized_keys eintragen
#   - DNS-Eintrag apt.movieshelf.info
set -euo pipefail

APT_USER="apt"
APT_HOME="/home/$APT_USER"
PUBLIC_DIR="${PUBLIC_DIR:-/srv/apt/public}"
SETUP_NGINX="${SETUP_NGINX:-1}"
KEY_NAME="MovieShelf Paketquelle"
KEY_MAIL="app@movieshelf.info"

echo "── Pakete installieren"
apt-get update -qq
if [ "$SETUP_NGINX" = "1" ]; then
  apt-get install -y aptly gnupg nginx
else
  # CloudPanel bringt seinen eigenen nginx mit – hier nichts anfassen.
  apt-get install -y aptly gnupg
fi

echo "── Benutzer $APT_USER anlegen"
id -u "$APT_USER" > /dev/null 2>&1 || useradd -m -s /bin/bash "$APT_USER"
install -d -o "$APT_USER" -g "$APT_USER" -m 700 "$APT_HOME/.ssh"
install -d -o "$APT_USER" -g "$APT_USER" /srv/apt /srv/apt/incoming
# Bei CloudPanel gehört das Wurzelverzeichnis dem Site-Benutzer; nur den Besitz
# setzen, wenn wir es selbst angelegt haben.
[ -d "$PUBLIC_DIR" ] || install -d -o "$APT_USER" -g "$APT_USER" "$PUBLIC_DIR"
touch /var/log/apt-publish.log
chown "$APT_USER" /var/log/apt-publish.log

echo "── aptly einrichten"
cat > "$APT_HOME/.aptly.conf" <<EOF
{
  "rootDir": "/srv/apt/aptly",
  "architectures": ["amd64"],
  "gpgProvider": "gpg"
}
EOF
chown "$APT_USER" "$APT_HOME/.aptly.conf"
install -d -o "$APT_USER" -g "$APT_USER" /srv/apt/aptly

echo "── Signaturschlüssel"
# Ohne Passphrase: der Schlüssel wird unbeaufsichtigt beim Veröffentlichen
# gebraucht. Der Schutz liegt darin, dass er den Server nie verlässt und nur
# der Benutzer apt ihn lesen kann.
if ! sudo -u "$APT_USER" gpg --list-secret-keys "$KEY_MAIL" > /dev/null 2>&1; then
  sudo -u "$APT_USER" gpg --batch --gen-key <<EOF
Key-Type: RSA
Key-Length: 4096
Name-Real: $KEY_NAME
Name-Email: $KEY_MAIL
Expire-Date: 0
%no-protection
%commit
EOF
fi

echo "── Öffentlichen Schlüssel bereitstellen"
sudo -u "$APT_USER" gpg --export "$KEY_MAIL" > "$PUBLIC_DIR/movieshelf.gpg"
chmod 644 "$PUBLIC_DIR/movieshelf.gpg"

echo "── Veröffentlichungsskript"
install -m 755 "$(dirname "$0")/apt-publish" /usr/local/bin/apt-publish

if [ "$SETUP_NGINX" = "1" ]; then
  echo "── nginx"
  install -m 644 "$(dirname "$0")/nginx-apt.conf" /etc/nginx/sites-available/apt.movieshelf.info
  ln -sf /etc/nginx/sites-available/apt.movieshelf.info /etc/nginx/sites-enabled/
  nginx -t && systemctl reload nginx
else
  echo "── nginx übersprungen (CloudPanel verwaltet den vhost)"
fi

# aptly veröffentlicht nach <rootDir>/public. Der Inhalt davon muss unter dem
# Wurzelverzeichnis der Website liegen – als Verweise, damit aptly weiter in
# sein eigenes Verzeichnis schreiben kann.
ln -sfn /srv/apt/aptly/public/dists "$PUBLIC_DIR/dists"
ln -sfn /srv/apt/aptly/public/pool  "$PUBLIC_DIR/pool"
# Der Site-Benutzer (CloudPanel) muss die Dateien lesen dürfen.
chmod o+rx /srv/apt /srv/apt/aptly /srv/apt/aptly/public

cat <<EOF

Fertig. Noch zu tun:

1. Deploy-Schlüssel eintragen (öffentlichen Teil aus dem GitHub-Secret-Paar):

   command="/usr/local/bin/apt-publish",no-port-forwarding,no-agent-forwarding,no-pty ssh-ed25519 AAAA... github-actions

   in $APT_HOME/.ssh/authorized_keys, Rechte 600, Eigentümer $APT_USER.

2. DNS: apt.movieshelf.info auf diesen Server, dann
   certbot --nginx -d apt.movieshelf.info

3. Fingerabdruck des Signaturschlüssels für die Dokumentation:
EOF
sudo -u "$APT_USER" gpg --fingerprint "$KEY_MAIL"
