# Paketquelle apt.movieshelf.info

Ziel: `sudo apt install movieshelf-desktop`, danach kommen Updates über
`apt upgrade`. Der In-App-Updater hält sich bei solchen Installationen heraus
(siehe `electron/handlers/linuxPackage.ts`).

## Bauform: der Server holt, niemand stellt zu

```
GitHub Release (stabil)
        │
        │  alle 15 min, ausgehendes HTTPS
        ▼
   apt-sync  (Cron-Job des Site-Benutzers)
        ├─ Prüfsumme gegen die Release-Angabe
        ├─ aptly repo add
        └─ aptly publish update   ← signiert hier
                  │
                  ▼  Static HTML Site (CloudPanel)
            apt.movieshelf.info
```

Zwei Randbedingungen der Umgebung bestimmen diese Form:

- **SSH nur über VPN.** GitHub Actions käme nicht an den Server. Also holt der
  Server selbst, statt sich beliefern zu lassen — nach außen genügt ausgehendes
  HTTPS zu GitHub, kein offener Port, kein Deploy-Schlüssel bei GitHub.
- **Site-Benutzer ohne sudo.** Kein `/etc`, kein systemd, keine Paketinstallation.
  Deshalb liegt alles unter `$HOME`: aptly als einzelnes statisches Programm in
  `~/bin`, der Signaturschlüssel im Schlüsselbund des Benutzers, der Zeitgeber
  als CloudPanel-Cron-Job. Webserver und Zertifikat stellt die Static-HTML-Site.

Der private Signaturschlüssel verlässt den Server nie — er wird dort erzeugt und
nur dort benutzt.

## Einrichtung (einmalig)

### 1. Site anlegen

In CloudPanel eine **Static HTML Site** für `apt.movieshelf.info` anlegen und
das Let's-Encrypt-Zertifikat ausstellen lassen. DNS vorher auf den Server
zeigen lassen; bei Cloudflare für die Ausstellung kurz ungeproxyt.

### 2. Einrichtung ausführen

Als Site-Benutzer (über die VPN-Verbindung):

```bash
scp -r packaging/apt <site-user>@<server>:~/
ssh <site-user>@<server>
bash ~/apt/setup.sh /home/<site-user>/htdocs/apt.movieshelf.info
```

Das Skript holt aptly nach `~/bin`, legt die aptly-Konfiguration an, erzeugt den
Signaturschlüssel, exportiert den öffentlichen Teil ins Wurzelverzeichnis der
Website und richtet `apt-sync` ein. Mehrfaches Ausführen ist unschädlich.

### 3. Cron-Job in CloudPanel

Unter der Site → *Cron Jobs*:

```
*/15 * * * * /home/<site-user>/bin/apt-sync >> /home/<site-user>/apt/apt-sync.log 2>&1
```

Viertelstündlich reicht — ein Release muss nicht auf die Minute genau ankommen.

### 4. Ersten Lauf anstoßen

```bash
~/bin/apt-sync
tail ~/apt/apt-sync.log
curl -s https://apt.movieshelf.info/dists/stable/InRelease | head
```

## Für Nutzer

```bash
curl -fsSL https://apt.movieshelf.info/movieshelf.gpg | sudo tee /etc/apt/keyrings/movieshelf.gpg > /dev/null
echo "deb [signed-by=/etc/apt/keyrings/movieshelf.gpg] https://apt.movieshelf.info stable main" | sudo tee /etc/apt/sources.list.d/movieshelf.list
sudo apt update && sudo apt install movieshelf-desktop
```

## Bewusste Festlegungen

- **Nur `amd64`.** Der Release-Workflow baut nichts anderes.
- **Keine Vorabversionen.** `apt-sync` fragt `/releases/latest` ab, und das
  überspringt Vorabversionen — die Testpakete (`v1.1.1-linux`) landen also gar
  nicht erst in der stabilen Quelle.
- **Alte Versionen bleiben liegen.** Wer zurück will, kann
  `apt install movieshelf-desktop=1.1.2`. Aufräumen ginge mit
  `aptly repo remove`; bis die Quelle spürbar wächst, lohnt es nicht.
- **Verzögerung von bis zu 15 Minuten** zwischen Release und Verfügbarkeit in
  der Quelle. Der Preis dafür, dass kein Dienst von außen erreichbar sein muss.

## Cloudflare

Der Proxy kann an bleiben, es sind statische Dateien. Eine Cache-Regel für
`/dists/*` mit kurzer Gültigkeit (5 Minuten) einrichten, sonst sieht
`apt update` nach einer Veröffentlichung noch den alten Stand. Die `.deb`-Dateien
darunter ändern sich unter einem Namen nie und dürfen lange gecacht werden.

## Wenn etwas klemmt

```bash
tail -50 ~/apt/apt-sync.log        # was der letzte Lauf gemacht hat
~/bin/aptly repo show -with-packages movieshelf   # was im Repo liegt
~/bin/aptly publish list                          # was veröffentlicht ist
```
