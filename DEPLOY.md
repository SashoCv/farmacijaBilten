# Deploying the Macedonian Pharmaceutical Bulletin

This guide sets up the journal website on a Linux server (the examples use
Ubuntu 24.04 LTS) and keeps it running. Follow it from top to bottom on a
clean machine and the site serves `https://bulletin.mfd.org.mk` with styles,
server-side rendering, e-mail and backups. For Hostinger shared hosting
(MySQL, no root) see section 11.

Everything the server needs is in this repository:

| File                     | Purpose                                                                    |
| ------------------------ | -------------------------------------------------------------------------- |
| `deploy/nginx.conf`      | Web server: HTTPS, static files, upload limit, compression                 |
| `deploy/php.ini`         | PHP-FPM limits (21 MB per file, 24 MB per form), OPcache, `expose_php=Off` |
| `deploy/supervisor.conf` | Keeps the SSR renderer and the e-mail queue worker running                 |
| `deploy/crontab`         | Laravel scheduler (every minute) and the nightly backup                    |
| `deploy/deploy.sh`       | Updates a running installation                                             |
| `deploy/backup.sh`       | Nightly backup of the database and the manuscripts                         |

> **Never upload `public/hot`.** It exists only while `npm run dev` is running
> on a developer's machine. If it reaches the server, every page loads its CSS
> and JavaScript from `http://[::1]:5173` and the site renders blank and
> unstyled. It is in `.gitignore`, `deploy/deploy.sh` deletes it, and
> `php artisan journal:smoke` fails while it is present. The same goes for
> `public/fonts-manifest.dev.json`.

## 1. How the site runs

```
reader ──HTTPS──> nginx ──> /build, /volumes, /downloads, /media   (static files)
                    └─────> PHP-FPM (Laravel) ──> SQLite database/database.sqlite
                                   │
                                   ├──> Node SSR process (port 13714, Supervisor)
                                   └──> jobs table ──> queue worker (Supervisor) ──> SMTP
cron ──> php artisan schedule:run (every minute)
```

- **Database**: one SQLite file, `database/database.sqlite` (about 5 MB),
  in WAL mode with a 5-second busy timeout (`config/database.php`). SQLite
  writes `database.sqlite-wal` and `-shm` files next to it, so the
  `database/` folder must be writable by the web server.
- **Journal files**: issue and article PDFs, author forms and images mirrored
  from the old site live in `storage/app/journal` (about 800 MB) and are
  served at `/volumes`, `/downloads` and `/media` through symlinks in
  `public/`.
- **Manuscripts** sent through the submission form are stored privately in
  `storage/app/private` and never served directly.
- **Server-side rendering**: a Node process renders each page's HTML so
  readers and indexers get content without JavaScript. If it stops, pages
  still work: they render in the browser after 3 seconds' wait at most.
- **E-mail** (notice to the editors, receipt to the author) is queued and
  sent by the queue worker.
- **Sessions**: anonymous readers get no session and no cookie; their pages
  are sent with `Cache-Control: public, max-age=300,
  stale-while-revalidate=600`. Only editors, sign-in pages and the
  submission form use sessions (file driver, `storage/framework/sessions`).

## 2. Server requirements

- **PHP 8.3 or newer** with PHP-FPM and these extensions: `pdo_sqlite`,
  `sqlite3`, `intl`, `mbstring`, `xml`, `curl`, `zip`, `fileinfo`, `opcache`.
- **Node.js 22 LTS** and npm (to build the assets and run the SSR process).
- **Composer 2**.
- **nginx**, **Supervisor**, **certbot**, **git**, **rsync**.
- **sqlite3** command-line tool (backups).
- **poppler-utils** (`pdftotext`, `pdftoppm`, `pdfinfo`): the import and
  cover-generation commands read the PDFs with them. `webp` (`cwebp`) is
  optional for WebP covers.

```bash
sudo apt update
sudo apt install -y nginx supervisor certbot python3-certbot-nginx git rsync unzip sqlite3 poppler-utils webp \
    php8.3-fpm php8.3-cli php8.3-sqlite3 php8.3-intl php8.3-mbstring php8.3-xml php8.3-curl php8.3-zip php8.3-opcache
# Node 22 LTS (NodeSource)
curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash -
sudo apt install -y nodejs
# Composer
curl -sS https://getcomposer.org/installer | php && sudo mv composer.phar /usr/local/bin/composer
```

- **WeasyPrint 70** (Python): makes the article PDFs in the journal layout
  ("Publish online" and "PDF (journal layout)"). Installed in its own
  virtual environment; the app finds it through `WEASYPRINT_PYTHON` in `.env`.
  Without it, publishing still works by uploading a final PDF.

```bash
sudo apt install -y python3-venv libpango-1.0-0 libpangoft2-1.0-0 libharfbuzz-subset0
sudo python3 -m venv /opt/weasyprint
sudo /opt/weasyprint/bin/pip install weasyprint==70.0
# .env
WEASYPRINT_PYTHON=/opt/weasyprint/bin/python
# check: prints 70.0
/opt/weasyprint/bin/python -c 'import weasyprint; print(weasyprint.__version__)'
```

## 3. First installation

The paths below assume the app lives in `/var/www/bulletin` and runs as
`www-data`; adjust them in `deploy/*` if yours differ.

### 3.1 Code and dependencies

```bash
sudo mkdir -p /var/www/bulletin && sudo chown $USER:www-data /var/www/bulletin
git clone <repository-url> /var/www/bulletin
cd /var/www/bulletin

composer install --no-dev --optimize-autoloader --no-interaction
cp .env.example .env          # production values; edit below
php artisan key:generate
```

Edit `.env`:

- `APP_URL=https://bulletin.mfd.org.mk` (requests for any other host name are
  rejected, so redirects can't be poisoned).
- `MAIL_*`: the SMTP account the journal sends from, and
  `JOURNAL_SUBMISSIONS_EMAIL`: the editorial mailbox that receives new
  manuscripts.
- Keep `APP_ENV=production`, `APP_DEBUG=false`, `SESSION_DRIVER=file`,
  `QUEUE_CONNECTION=database`.

### 3.2 Data: database and journal files

Copy the database and the mirrored files from the machine that holds the
current data (the import was done there). Take a consistent copy of the
database with `sqlite3 .backup` (copying the file alone can miss changes still
in the `-wal` file):

```bash
# On the source machine
sqlite3 database/database.sqlite ".backup '/tmp/bulletin.sqlite'"
rsync -avz --progress /tmp/bulletin.sqlite server:/var/www/bulletin/database/database.sqlite
rsync -avz --progress storage/app/journal/ server:/var/www/bulletin/storage/app/journal/
```

Never rsync the whole project folder: it would carry `public/hot`,
`node_modules`, `.env` and the developer's absolute symlinks.

### 3.3 Build, migrate, link

```bash
npm ci
npm run build:ssr            # public/build (browser) + bootstrap/ssr/app.js (SSR)
rm -f public/hot public/fonts-manifest.dev.json

php artisan migrate --force
php artisan storage:link     # public/storage, public/volumes, public/downloads, public/media
php artisan optimize         # caches config, events, routes and views
```

`storage:link` creates the four symlinks listed under `links` in
`config/filesystems.php`, with this server's absolute paths.

### 3.4 Permissions

```bash
sudo chown -R $USER:www-data /var/www/bulletin
sudo chmod -R ug+rwX storage bootstrap/cache database
sudo find storage bootstrap/cache database -type d -exec chmod g+s {} +
```

### 3.5 Services

```bash
# PHP
sudo cp deploy/php.ini /etc/php/8.3/fpm/conf.d/99-bulletin.ini
sudo cp deploy/php.ini /etc/php/8.3/cli/conf.d/99-bulletin.ini
sudo systemctl reload php8.3-fpm

# TLS certificate first (the site config below refers to it; DNS must
# already point at this server)
sudo certbot certonly --nginx -d bulletin.mfd.org.mk

# nginx
sudo cp deploy/nginx.conf /etc/nginx/sites-available/bulletin
sudo ln -s /etc/nginx/sites-available/bulletin /etc/nginx/sites-enabled/bulletin
sudo rm -f /etc/nginx/sites-enabled/default
sudo nginx -t && sudo systemctl reload nginx

# SSR renderer and queue worker
sudo cp deploy/supervisor.conf /etc/supervisor/conf.d/bulletin.conf
sudo supervisorctl reread && sudo supervisorctl update

# Scheduler and backups (edit BACKUP_TARGET first)
sudo crontab -u www-data deploy/crontab
```

### 3.6 Accounts

Authors create their own account at `/register`, and reviewers join by
invitation. The editorial office (the admin role) is created from the console,
which asks for a password of 12+ characters:

```bash
php artisan journal:editor editor@example.org --name="Full Name"
```

Run on an existing account, the command only adds the admin role. Everyone
lands on `/dashboard` after signing in. In production, admins must turn on
two-factor authentication or add a passkey (_Settings → Security_) before
the editorial office pages open (`JOURNAL_ADMIN_REQUIRES_2FA`).

### 3.7 Check

```bash
php artisan journal:smoke
```

It fetches an article over HTTPS and checks the status, the server-rendered
HTML, the `citation_title` tag for Google Scholar, the stylesheet from
`/build`, the absence of `public/hot`, the developer credit and the security
headers. Also check by hand:

```bash
curl -sI https://bulletin.mfd.org.mk/ | grep -Ei 'cache-control|set-cookie|x-content-type|strict-transport'
curl -s -o /dev/null -w '%{http_code}\n' https://bulletin.mfd.org.mk/nonexistent   # 404, journal-styled
curl -s -o /dev/null -w '%{http_code} %{redirect_url}\n' https://bulletin.mfd.org.mk/archive/   # 301 → /archive
```

## 4. Updates

From the app folder, as the deploy user:

```bash
deploy/deploy.sh
```

It puts the site in maintenance mode, pulls, installs Composer and npm
dependencies, builds the assets and the SSR bundle, deletes `public/hot`,
migrates, refreshes the symlinks and caches, restarts the queue worker and
the SSR process, reloads PHP-FPM (OPcache does not re-read files on its own,
`opcache.validate_timestamps=0`), brings the site back and runs
`journal:smoke`. Maintenance mode shows Laravel's plain "Service unavailable"
page for the minute it takes.

The deploy user needs password-less sudo for exactly two commands:

```
deploy ALL=(root) NOPASSWD: /usr/bin/supervisorctl restart bulletin-ssr, /usr/bin/systemctl reload php8.3-fpm
```

After changing `.env`, run `php artisan optimize` again (the configuration is
cached).

## 5. Backups

`deploy/backup.sh` runs nightly from `deploy/crontab` and keeps 14 days in
`/var/backups/bulletin`, then copies them off the server with rsync to
`BACKUP_TARGET` (an SSH destination on another machine; set it in the
crontab). Each night holds:

- `database.sqlite`: a consistent snapshot taken with `sqlite3 .backup`,
  checked with `PRAGMA integrity_check`;
- `private.tar.gz`: the manuscripts and forms sent by authors
  (`storage/app/private`);
- `env`: the `.env` file (it holds the app key and mail password; the backup
  folder is readable by its owner only).

The mirrored journal files (`storage/app/journal`, about 800 MB) change only
when an issue or article is added. Copy them off the server after each new
issue:

```bash
rsync -a /var/www/bulletin/storage/app/journal/ backup@backup.example.org:bulletin-journal/
```

**Restore**: stop PHP-FPM and the queue worker, copy `database.sqlite` back to
`database/database.sqlite` (delete any `database.sqlite-wal` and `-shm`
first), unpack `private.tar.gz` into `storage/app`, restore `.env`, then
`php artisan optimize` and start the services again.

A packaged backup tool (spatie/laravel-backup) can replace the script later;
it is not installed yet.

## 6. Security notes

- Every response carries `X-Content-Type-Options: nosniff`,
  `Referrer-Policy: strict-origin-when-cross-origin`,
  `X-Frame-Options: SAMEORIGIN`, a restrictive `Permissions-Policy` and, over
  HTTPS, `Strict-Transport-Security` (`App\Http\Middleware\SecurityHeaders`,
  settings in `config/http.php`). nginx adds the same headers to static
  files. `X-Powered-By` is removed and `expose_php=Off`.
- Requests for any host other than `APP_URL`'s are rejected in production.
- Sign-in is rate-limited (5 attempts a minute), sign-up to 5 accounts an hour
  per address (`JOURNAL_REGISTRATIONS_PER_HOUR`), and the
  submission form accepts 5 posts an hour per address.
- Never serve production with `php artisan serve` (it leaks a file handle per
  PDF request and stops at about 1,024); always nginx + PHP-FPM.
- Keep `APP_DEBUG=false`: with debug on, server errors show stack traces
  instead of the journal's error page.

## 7. Caching and performance

- Anonymous pages: `Cache-Control: public, max-age=300,
  stale-while-revalidate=600` and `Vary: Cookie` (the language cookie), so
  browsers and any proxy can reuse them for five minutes. Turn it off with
  `HTTP_PUBLIC_CACHE=false` (it is off by default in the local environment).
- `/build/*`: hashed file names, cached for a year (`immutable`).
- `/volumes`, `/downloads`, `/media`: 30 days, sent with `sendfile`.
- Fonts are self-hosted; only the Latin and Cyrillic subsets are preloaded.
- PHP OPcache keeps compiled code in memory; `deploy.sh` reloads PHP-FPM.

## 8. Operations

| Task                               | Command                                                                     |
| ---------------------------------- | --------------------------------------------------------------------------- |
| Health check (for uptime monitors) | `GET /up` returns 200                                                       |
| End-to-end check                   | `php artisan journal:smoke`                                                 |
| Failed e-mails                     | `php artisan queue:failed`, retry with `php artisan queue:retry all`        |
| Logs                               | `storage/logs/laravel-YYYY-MM-DD.log`, `ssr.log`, `queue.log`, `backup.log` |
| Scheduled tasks                    | `php artisan schedule:list`                                                 |
| Maintenance mode                   | `php artisan down` / `php artisan up`                                       |

## 9. Troubleshooting

| Symptom                                                             | Cause and fix                                                                                                        |
| ------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------- |
| Pages are blank or unstyled; the HTML loads `http://[::1]:5173/...` | `public/hot` is on the server. Delete it.                                                                            |
| Pages work but View Source shows an empty `<div id="app">`          | The SSR process is down: `sudo supervisorctl status bulletin-ssr`, see `storage/logs/ssr.log`.                       |
| Authors get no receipt, editors no notice                           | The queue worker is down (`supervisorctl status bulletin-queue`) or the SMTP settings are wrong (`queue:failed`).    |
| "File too large" on the submission form                             | The file is over 20 MB (`upload_max_filesize`/`post_max_size` in `deploy/php.ini`, `client_max_body_size` in nginx). |
| `database is locked` in the log                                     | Another process held a long write. WAL mode and the 5 s busy timeout make this rare; check for a stuck command.      |
| PDFs under `/volumes` return 404                                    | The symlinks are missing: `php artisan storage:link`, and check `disable_symlinks off` in nginx.                     |
| A change to `.env` has no effect                                    | Run `php artisan optimize` (the configuration is cached).                                                            |
| A code change has no effect after a manual `git pull`               | Reload PHP-FPM (OPcache) or use `deploy/deploy.sh`.                                                                  |

## 10. Local development

```bash
composer setup     # creates .env with local values (APP_ENV=local, debug on, mail to the log)
composer dev       # the local PHP server and Vite (Vite writes public/hot while it runs)
```

In the local environment the public page cache and `X-Frame-Options` are off
(`config/http.php`), so pages are never stale and QA can frame pages at phone
width. Tests run on an in-memory database: `php artisan test`.

## 11. Hostinger shared hosting

The site also runs on Hostinger shared (web/cloud) hosting, with MySQL instead
of SQLite and without root, Supervisor or nginx. Tested on the staging site
`orangered-emu-632765.hostingersite.com` (November 2026). What differs from
the VPS setup above:

| Feature                    | VPS (sections 1–9)            | Hostinger shared                                                       |
| -------------------------- | ----------------------------- | ---------------------------------------------------------------------- |
| Database                   | SQLite file                   | MySQL/MariaDB from hPanel (all tests pass on both)                     |
| Server-side rendering      | Node process under Supervisor | Off (`INERTIA_SSR_ENABLED=false`); pages render in the browser         |
| E-mail queue               | Worker under Supervisor       | Cron runs `queue:work --stop-when-empty` every minute                  |
| Article PDF (WeasyPrint)   | `/opt/weasyprint` venv        | micromamba environment in the home folder (11.4)                       |
| Covers from PDFs (poppler) | `journal:generate-covers`     | Not available: generate locally and upload `storage/app/journal/media` |

Paths below use the staging account; replace `u638118030` and the domain
folder with the real ones (`pwd` in the site folder prints it).

### 11.1 PHP and Node versions

The default `php`, `node` and `python3` are too old. Newer versions live in
`/opt/alt`. Put them first in the `PATH` (once, in `~/.bashrc`):

```bash
echo 'export PATH=/opt/alt/alt-nodejs22/root/usr/bin:/opt/alt/php83/usr/bin:$PATH' >> ~/.bashrc
echo 'export RAYON_NUM_THREADS=1 UV_THREADPOOL_SIZE=2' >> ~/.bashrc
source ~/.bashrc
node -v    # 22.18 or newer
php -v     # 8.3
```

`RAYON_NUM_THREADS` matters: shared hosting limits the number of threads per
user, and Rolldown/Tailwind (Rust) otherwise start one per CPU core and the
build stops with `The global thread pool has not been initialized ...
Resource temporarily unavailable`.

### 11.2 Code, database and build

The domain's document root is `public_html`; point it at Laravel's `public`
folder with a symlink (move Hostinger's default `public_html` folder away
first if it exists):

```bash
cd ~/domains/DOMAIN
git clone https://github.com/SashoCv/farmacijaBilten.git .
ln -s public public_html
composer install --no-dev --optimize-autoloader
cp .env.example .env && php artisan key:generate
```

In `.env`, besides `APP_URL`, mail and Crossref:

```
APP_ENV=production
APP_DEBUG=false
DB_CONNECTION=mysql
DB_HOST=localhost
DB_PORT=3306
DB_DATABASE=u638118030_...      # from hPanel → Databases → Management
DB_USERNAME=u638118030_...
DB_PASSWORD="..."
QUEUE_CONNECTION=database
INERTIA_SSR_ENABLED=false
HTTP_PUBLIC_CACHE=false          # see 11.6
WEASYPRINT_PYTHON=/home/u638118030/wp/bin/python
```

Import the data in hPanel → phpMyAdmin (a `.sql.gz` dump of the current
database), then:

```bash
npm ci && npm run build
rm -f public/hot public/fonts-manifest.dev.json
php artisan migrate --force      # adds the MySQL triggers; only warns if not allowed
php artisan storage:link
php artisan optimize
php artisan journal:editor editor@example.org --name="Full Name"
```

The dump is made from the SQLite database by migrating an empty MySQL/MariaDB
database and copying the rows table by table (sessions, cache and jobs are
left out). Make it with MariaDB (for example the `mariadb:10.11` Docker image)
so it imports into both MariaDB and MySQL 8. Before handing it over, remove
any saved Crossref login and change or lock the demo accounts.

### 11.3 Journal files

The PDFs, images and covers are not in git (`storage/app/journal`, about
800 MB). Most come from the old site:

```bash
php artisan journal:import --only-files --concurrency=2
```

Covers and article thumbnails (`media/covers`, `media/thumbs`) need poppler,
which shared hosting lacks: zip them on a machine that has them, upload with
`scp -P 65002 file.zip u638118030@SERVER_IP:~/domains/DOMAIN/` (one line) and
`unzip -o` in the site folder. The same for `storage/app/reports` (DOI
reports) and `storage/app/private` (manuscript files).

### 11.4 Article PDFs: WeasyPrint with micromamba

The system Pango is 1.42; WeasyPrint needs 1.44 or newer and fails with
`undefined symbol: pango_context_set_round_glyph_positions`. A pip install is
therefore not enough. Install Python, WeasyPrint and a current Pango from
conda-forge into the home folder instead:

```bash
cd ~
curl -Ls https://micro.mamba.pm/api/micromamba/linux-64/latest | tar -xvj bin/micromamba
~/bin/micromamba create -y -p ~/wp -c conda-forge python=3.11 weasyprint pango
# check, in the site folder:
echo '<html lang="mk"><body><h1>Тест</h1></body></html>' > /tmp/t.html
~/wp/bin/python resources/pdf/render.py /tmp/t.html /tmp/t.pdf     # prints pages=1
```

Then set `WEASYPRINT_PYTHON=/home/u638118030/wp/bin/python` and run
`php artisan optimize`. If `micromamba create` fails with "Resource
temporarily unavailable", repeat it with `MAMBA_EXTRACT_THREADS=1` in front.

### 11.5 Cron

hPanel → Advanced → Cron Jobs, both every minute (use the full PHP path):

```
/opt/alt/php83/usr/bin/php /home/u638118030/domains/DOMAIN/artisan schedule:run
/opt/alt/php83/usr/bin/php /home/u638118030/domains/DOMAIN/artisan queue:work --stop-when-empty --max-time=50
```

The second line sends the queued e-mails and Crossref deposits (there is no
Supervisor to keep a worker running).

### 11.6 Hostinger CDN

Hostinger puts its CDN (`server: hcdn`) in front of the site. It does not
honour `Vary: X-Inertia`, so with the public page cache on it can answer an
Inertia link click with a cached HTML page, and Inertia shows it in an empty
dialog (clicking the logo opened a blank popup). Hence
`HTTP_PUBLIC_CACHE=false`. After changing it, flush the CDN in hPanel →
Performance → CDN.

The CDN also caches 404 answers for images for 30 days, and browsers keep them
too. Upload the journal files **before** anyone opens the site; if a page was
opened earlier, flush the CDN and clear that browser's site data.

### 11.7 Updates

```bash
cd ~/domains/DOMAIN
git pull
composer install --no-dev --optimize-autoloader
npm ci && npm run build && rm -f public/hot
php artisan migrate --force
php artisan optimize
```
