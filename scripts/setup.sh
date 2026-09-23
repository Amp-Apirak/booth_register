#!/usr/bin/env bash
# First-time setup for a development / event machine.
#   ./scripts/setup.sh
# Safe to re-run: existing .env files are never overwritten.
set -euo pipefail
cd "$(dirname "$0")/.."

say() { printf '\n\033[1;36m==> %s\033[0m\n' "$1"; }
need() { command -v "$1" >/dev/null 2>&1 || { echo "Missing $1 — $2"; exit 1; }; }

need node "install Node.js 20+ (https://nodejs.org)"
need npm "comes with Node.js"
need docker "install Docker Desktop and start it"
need openssl "needed to generate secrets"
docker info >/dev/null 2>&1 || { echo "Docker is installed but not running — start Docker Desktop first"; exit 1; }

say "Environment files"
if [ ! -f .env ]; then
  DB_PASSWORD="$(openssl rand -hex 16)"
  sed "s/^DB_PASSWORD=.*/DB_PASSWORD=${DB_PASSWORD}/" .env.example > .env
  echo "created .env (random DB password)"
else
  echo ".env exists — kept"
fi
DB_USER="$(grep '^DB_USER=' .env | cut -d= -f2-)"
DB_PASSWORD="$(grep '^DB_PASSWORD=' .env | cut -d= -f2-)"

if [ ! -f server/.env ]; then
  sed -e "s/^DB_USER=.*/DB_USER=${DB_USER}/" \
      -e "s/^DB_PASSWORD=.*/DB_PASSWORD=${DB_PASSWORD}/" \
      -e "s/^JWT_SECRET=.*/JWT_SECRET=$(openssl rand -hex 32)/" \
      server/.env.example > server/.env
  echo "created server/.env (DB credentials from .env, random JWT_SECRET)"
else
  echo "server/.env exists — kept (make sure DB_USER/DB_PASSWORD match .env)"
fi

if [ ! -f client/.env.local ]; then
  cp client/.env.example client/.env.local
  echo "created client/.env.local"
else
  echo "client/.env.local exists — kept"
fi

say "Database (PostgreSQL + Redis via Docker)"
docker compose up -d
printf 'waiting for PostgreSQL'
for _ in $(seq 1 60); do
  if docker exec event_postgres_db pg_isready -q -U "$DB_USER" 2>/dev/null; then echo ' ready'; break; fi
  printf '.'; sleep 1
done

say "Dependencies"
(cd server && npm ci)
(cd client && npm ci)

say "Done"
cat <<'MSG'
Next steps:
  1. Create a staff login (seeded demo users have no usable password):
       cd server && node scripts/create-admin.js admin '<strong-password>' Admin "System Admin"
  2. Start the API:     cd server && npm run dev      # http://localhost:3005
  3. Start the web app: cd client && npm run dev      # http://localhost:3000
  4. Log in at http://localhost:3000/login, then fill ตั้งค่าระบบ → ข้อมูลทั่วไป

Full guide: docs/runbook.md
MSG
