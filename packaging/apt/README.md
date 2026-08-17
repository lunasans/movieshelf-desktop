# Paketquelle apt.movieshelf.info

Variante 1 aus [tasks/todo.md](../../tasks/todo.md): aptly läuft auf dem Server,
GitHub Actions liefert nur das fertige `.deb` an. **Der private Signaturschlüssel
verlässt den Server nie** — GitHub kennt nur einen SSH-Schlüssel, der genau ein
Kommando ausführen darf.

```
GitHub Actions                      Hetzner 162.55.214.77
──────────────                      ─────────────────────
build-linux → .deb
      │  ssh apt@server < paket.deb
      ▼
              /usr/local/bin/apt-publish   (erzwungenes Kommando)
                    ├─ dpkg-deb prüft die Datei
                    ├─ aptly repo add
                    └─ aptly publish update   ← signiert hier
                              │
                              ▼  nginx + Cloudflare
                        apt.movieshelf.info
```

## Einrichtung (einmalig)

### 1. Server

```bash
scp -r packaging/apt root@162.55.214.77:/tmp/
ssh root@162.55.214.77 'bash /tmp/apt/server-setup.sh'
```

Das Skript installiert aptly und nginx, legt den Benutzer `apt` an, erzeugt den
Signaturschlüssel, richtet das Veröffentlichungsskript ein und gibt am Ende den
Fingerabdruck aus. Mehrfaches Ausführen ist unschädlich.

### 2. Deploy-Schlüssel

Lokal erzeugen, **ohne Passphrase** (Actions kann keine eingeben):

```bash
ssh-keygen -t ed25519 -f apt-deploy -C "github-actions" -N ""
```

- privaten Teil (`apt-deploy`) als GitHub-Secret `APT_DEPLOY_KEY` hinterlegen
- öffentlichen Teil in `/home/apt/.ssh/authorized_keys` eintragen, mit
  erzwungenem Kommando:

```
command="/usr/local/bin/apt-publish",no-port-forwarding,no-agent-forwarding,no-pty ssh-ed25519 AAAA... github-actions
```

Damit kann dieser Schlüssel nichts anderes als Veröffentlichen — kein Login,
keine Weiterleitung, kein anderes Kommando. Was der Aufrufer sonst schickt,
landet in `SSH_ORIGINAL_COMMAND` und wird ignoriert.

Zusätzlich als Secret `APT_HOST_KEY` den Fingerabdruck des Servers hinterlegen:

```bash
ssh-keyscan -t ed25519 162.55.214.77
```

Ohne den müsste der Workflow jeden Schlüssel blind annehmen.

### 3. DNS und TLS

`apt.movieshelf.info` in Cloudflare auf den Server zeigen lassen, dann auf dem
Server `certbot --nginx -d apt.movieshelf.info`. Proxy in Cloudflare kann an
bleiben — es sind statische Dateien, das Caching ist erwünscht.

### 4. Repository-Variable

Der Workflow-Job läuft erst, wenn in den Repository-Variablen
`APT_PUBLISH = true` gesetzt ist. Bis dahin bleibt er stumm — damit kann
dieser Stand gefahrlos vor der fertigen Servereinrichtung im Hauptzweig liegen.

## Für Nutzer

```bash
curl -fsSL https://apt.movieshelf.info/movieshelf.gpg | sudo tee /etc/apt/keyrings/movieshelf.gpg > /dev/null
echo "deb [signed-by=/etc/apt/keyrings/movieshelf.gpg] https://apt.movieshelf.info stable main" | sudo tee /etc/apt/sources.list.d/movieshelf.list
sudo apt update && sudo apt install movieshelf-desktop
```

## Bewusste Festlegungen

- **Nur `amd64`.** Der Release-Workflow baut nichts anderes.
- **Vorabversionen werden abgelehnt.** `apt-publish` weist alles mit Bindestrich
  in der Version ab (`1.1.1-linux`); Testpakete gehören nicht in die stabile
  Quelle. Ein eigener Kanal `testing` wäre später ein zweites Repository.
- **Alte Versionen bleiben liegen.** Wer gezielt zurück will, kann
  `apt install movieshelf-desktop=1.1.2`. Aufräumen ginge mit
  `aptly repo remove` — bis die Quelle spürbar wächst, lohnt es nicht.

## Prüfen

```bash
ssh apt@162.55.214.77 < release/movieshelf-desktop_1.1.4_amd64.deb   # von Hand veröffentlichen
tail /var/log/apt-publish.log                                         # was passiert ist
curl -s https://apt.movieshelf.info/dists/stable/InRelease | head     # Metadaten da?
```
