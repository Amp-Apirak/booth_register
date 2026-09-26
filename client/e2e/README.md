# End-to-end tests (Playwright)

Real browser tests of the running system: LED live updates (windowed, full screen, phone-style,
from another device on the network), camera QR scanning, dashboard, sign-up and ticket lookup,
logins and roles, lucky draw, settings, backup and reset, and phone/tablet layouts.

## One-time setup (per machine)

1. Google Chrome installed (the tests use it; no browser download).
2. Two local test accounts:
   ```bash
   cd server
   node scripts/create-admin.js e2e_admin '<password>' Admin "E2E Admin"
   node scripts/create-admin.js e2e_staff '<password>' Staff "E2E Staff"
   ```
3. `client/.env.e2e.local` (git-ignored):
   ```
   E2E_BASE_URL=http://localhost:3000
   E2E_API_URL=http://localhost:3005
   E2E_ADMIN_USER=e2e_admin
   E2E_ADMIN_PASSWORD=<password>
   E2E_STAFF_USER=e2e_staff
   E2E_STAFF_PASSWORD=<password>
   ```

## Run

With the database, API (`server: npm run dev`) and web (`client: npm run dev`) running:

```bash
cd client
npx playwright test                       # everything (~4 minutes)
npx playwright test e2e/led-realtime.spec.ts   # one area
npx playwright show-report                # last run, with screenshots/traces of failures
```

The tests create their own attendees (company "E2E Playwright Co"), prizes and organization types
and remove them afterwards; lucky-draw clean-up uses the database directly (`e2e/db.ts`, server/.env).

`backup-reset.spec.ts` really resets this machine's database (Settings → Backup & reset). Before it
starts it copies event 1's data and all settings into schema `e2e_snapshot` (inside the database: same
values, same ids) and puts them back when it ends. If a run is killed half-way, the next run restores
that copy first. Never point `E2E_API_URL` at production.
