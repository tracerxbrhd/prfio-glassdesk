# Release verification

Verified on Windows on 8–9 September 2026 with Python 3.12, Node.js 24.19.0 and Playwright Chromium. Native execution uses SQLite; PostgreSQL is configured for Docker and CI.

## Executed checks

| Check | Result |
| --- | --- |
| `python backend/manage.py test support` | 12 tests passed |
| `ruff check backend` and `ruff format --check backend` | Passed |
| Django system check and migration drift check | Passed |
| Migrations and repeated demo seed | Passed; existing records and passwords retained |
| Frontend ESLint and Prettier | Passed |
| `npm run build` | Passed |
| Playwright | 11 tests passed in 1.0 minute in the final full run |
| axe WCAG A/AA | Zero violations in 18 scans across 360 and 1440 px |
| Demo and production `docker compose ... config --quiet` | Both passed; manifest validation only |
| Responsive widths | 360, 768, 1440 and 1920 px passed without document overflow |
| Screenshots | 20 captures from the running application |

The production build produces 417.82 kB JavaScript (131.84 kB gzip) and 57.69 kB CSS (15.61 kB gzip), plus locally served Manrope font assets. These are build output sizes, not browser performance or field Core Web Vitals measurements.

## Backend coverage

The 12 tests exercise anonymous and non-agent access denial, CSRF-protected login and writes, session/logout behavior, project-specific HttpOnly cookie naming, inactive accounts, invalid login payloads, ticket CRUD and cascade deletion, conversation persistence, resolution/reopening timestamps, assignment and status validation, rejection of forged event messages and blank replies, staff-only administration, customer/tag CRUD and protected customer deletion, password validation/hashing and account deactivation, exact persisted reporting durations, notes excluded from first-response statistics, production seed refusal, and repeat-safe seeding.

Expected 400/401/403 responses in the test log represent negative assertions. The tests do not claim exhaustive permission, concurrency or security coverage.

## Browser coverage

The suite contains 11 scenarios:

1. Invalid login, session persistence after reload, logout and protected routes; no credentials in local storage.
2. Create, edit and delete a ticket; persisted public replies/internal notes, priority and status updates.
3. Customer/category management, team name editing and restoration, ticket filters and the empty state.
4. Support-agent access without administrator-only controls.
5. Four responsive route matrices at 360, 768, 1440 and 1920 px: login, overview, inbox, ticket, customers, analytics, team and tags; label checks and uncaught JavaScript error listeners.
6. Two axe WCAG A/AA checks at 360 and 1440 px across login, seven workspace routes and the new-ticket dialog; Escape dismissal.
7. An interrupted dashboard request followed by a working retry.

The four viewport scenarios and the two axe scenarios are separate tests, giving 11 tests in total. Accessibility scans use reduced motion and wait for visible content and fonts. Automated checks complement keyboard and screenshot review; they do not constitute a full accessibility conformance claim.

## Screenshots

| Screen | Desktop | Mobile |
| --- | --- | --- |
| Sign in | [1440 px](screenshots/login-1440.png) | [360 px](screenshots/login-360.png) |
| Overview | [1440 px](screenshots/dashboard-1440.png) | [360 px](screenshots/dashboard-360.png) |
| Inbox | [1440 px](screenshots/inbox-1440.png) | [360 px](screenshots/inbox-360.png) |
| Conversation | [1440 px](screenshots/ticket-1440.png) | [360 px](screenshots/ticket-360.png) |
| Customers | [1440 px](screenshots/customers-1440.png) | Responsive route verified |
| Analytics | [1440 px](screenshots/analytics-1440.png) | Responsive route verified |
| Team | [1440 px](screenshots/team-1440.png) | Responsive route verified |
| Tags | [1440 px](screenshots/tags-1440.png) | Responsive route verified |

Login, overview, inbox and conversation also have 768 px and 1920 px captures. Screenshots show demonstration data from the actual API. They are documentation captures, not image-diff regression baselines.

## Reproduce

Follow [native installation](../README.md#run-natively), then use a dedicated disposable database for browser writes. From the repository root with the virtual environment activated, in PowerShell:

```powershell
$browserDatabase = (Join-Path (Get-Location) 'backend/browser-check.sqlite3').Replace('\', '/')
$env:DATABASE_URL = "sqlite:///$browserDatabase"
$env:API_USER_RATE = '3000/minute'
python backend/manage.py migrate --noinput
python backend/manage.py seed_demo
python backend/manage.py runserver 127.0.0.1:8103 --noreload
```

In a second terminal, from `frontend`:

```bash
npm ci
npx playwright install chromium
npm run lint
npm run format:check
npm run build
npm run test:e2e
```

The shared browser download in the original workspace was selected with `PLAYWRIGHT_BROWSERS_PATH`; a fresh checkout can use Playwright's normal installation. The higher API rate is only for repeated automated testing; normal application runs default to `300/minute`. A failed browser run may leave clearly named verification records. Successful mutation tests remove their temporary records and restore the edited team name.

## Review fixes

The final pass fixed mobile overflow, a route-transition remount race while opening a created ticket, reduced-motion timing, insufficient foreground contrast, and the accessible name of compact search. The navigation became an inset glass rail with opaque text, separating its appearance from the other workspaces. Session and CSRF cookies use `glassdesk_` names so local applications can remain signed in together.

## Verification limits

- Docker Engine was unavailable. Docker image builds, PostgreSQL runtime, Nginx/Gunicorn integration and mounted production TLS certificates were not executed locally. Both Compose configurations parsed successfully; a parsed configuration is not a working deployment.
- `check --deploy` with a generated production key reported only W005 and W021: HSTS subdomain coverage and preload are deliberately not enabled without control of the deployment's domain family. Other deployment checks passed; this does not verify a real TLS deployment.
- GitHub CLI was not installed. No remote repository, remote CI run or public deployment is claimed. CI is configured to use PostgreSQL and Chromium.
- The browser checks used Chromium on Windows. Firefox, Safari, physical devices, screen-reader sessions, load tests and production operations were not exercised.
- Outbound/inbound email, attachments, customer self-service and tenant isolation are outside the implemented scope. Replies are stored conversation records.
- A fresh npm advisory request on 9 September failed with registry `ECONNRESET`; it did not provide a vulnerability verdict. Dependency versions are recorded by the lockfile and requirements; retry `npm audit` when the advisory endpoint is reachable.
