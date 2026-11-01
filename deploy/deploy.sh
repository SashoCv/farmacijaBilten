#!/usr/bin/env bash
# Update a running installation to the latest code (see DEPLOY.md, "Updates").
# Run as the deploy user from the app directory: deploy/deploy.sh
set -euo pipefail

APP_DIR="$(cd "$(dirname "$0")/.." && pwd)"
cd "$APP_DIR"

PHP_FPM_SERVICE="${PHP_FPM_SERVICE:-php8.3-fpm}"

php artisan down --retry=30 --render="errors::503" || true
trap 'php artisan up' EXIT

git pull --ff-only

composer install --no-dev --optimize-autoloader --no-interaction --prefer-dist

npm ci --no-audit --no-fund
npm run build:ssr

# Development leftovers must never reach production: with public/hot present
# every page loads its CSS and JS from a Vite dev server and renders unstyled.
rm -f public/hot public/fonts-manifest.dev.json

php artisan migrate --force
php artisan storage:link --force
php artisan optimize          # config, events, routes and views caches

php artisan queue:restart
sudo supervisorctl restart bulletin-ssr
sudo systemctl reload "$PHP_FPM_SERVICE"   # opcache.validate_timestamps = 0

php artisan up
trap - EXIT

php artisan journal:smoke
