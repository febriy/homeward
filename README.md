# Homeward

The home we build, together.

Short lessons for everyday family life: learn a small idea, reflect privately, and keep a dated snapshot. An optional values workbook helps couples agree on a shared vision. No AI service is used.

## Try it

[Open the hosted preview](https://homeward-git-feat-no-ai-workbook-arvins-projects-318f977d.vercel.app). The preview is publicly accessible without a Vercel account. No login is needed: a separate guest space opens automatically and saves progress for this browser. Guest access lasts up to 30 days; clearing cookies starts a fresh space. This preview uses a dedicated Neon database in Singapore on its Free plan.

Login and profile creation screens are currently bypassed for testing. Existing valid profiles still resume their saved records. The micro-lessons work independently; the original shared workbook still requires two separate profiles for joint approvals.

The home screen is a learning dashboard with **three modules and XP**. Start **Talk without blame**, **Make dinner manageable**, or **Find what matters**. Each module has six small screens: idea, quiz, idea, quiz, personal reflection and optional note. Quizzes explain the answer; personal ratings are not graded. Earn 10 XP once per new step (60 per module), save and leave at any time, and resume where you stopped. Revisiting saves another reflection without duplicating XP.

Earlier micro-lessons, reflections and dinner-practice records remain accessible to people who already have them. **Values workbook** opens the original couples flow:

1. Save private reflections using five questions and optional prompts.
2. Choose up to three values and three feelings, using editable examples or your own words.
3. Explicitly check the cards you want to share. Discuss and each agree to shared priorities.
4. Write a statement or edit a sentence starter. Save the wording before each person approves it.
5. Choose a pictured meal or your own, plan timing and responsibilities, and agree on a fallback and review date. Both people approve the plan and its weekly review.

Saved sessions, plan revisions and completed reviews remain available. Export includes your private reflections and the shared record, never your partner’s private interview. Use **Refresh shared work** to fetch your partner’s latest changes.

## Local setup

Requires Python 3.12+, PostgreSQL 15+ and, for the small UI regression suite, Node.js 22+. The application has no JavaScript build step.

```sh
python3 -m venv .venv
.venv/bin/pip install -r requirements.txt
cp .env.example .env.local
```

Create a dedicated PostgreSQL database, then edit `DATABASE_URL` in `.env.local` to its connection string. The application creates tables in the `homeward` schema; it never substitutes a mock or file database. Keep credentials out of Git.

```sh
.venv/bin/python scripts/migrate.py
.venv/bin/python server.py --port 8791
```

Open http://127.0.0.1:8791. Development binds to localhost. Data lives in PostgreSQL and survives application restarts.

For a separate local Homebrew PostgreSQL cluster, the following creates a Unix-socket-only server without touching an existing cluster. Run `initdb` only for a new empty directory; retain `.local/postgres` to keep saved work.

```sh
brew install postgresql@15
mkdir -p .local
chmod 700 .local
/opt/homebrew/opt/postgresql@15/bin/initdb -D "$PWD/.local/postgres" --auth-local=trust --auth-host=scram-sha-256
/opt/homebrew/opt/postgresql@15/bin/pg_ctl -D "$PWD/.local/postgres" -l "$PWD/.local/postgres.log" -o "-p 55439 -k $PWD/.local -c listen_addresses=''" start
/opt/homebrew/opt/postgresql@15/bin/createdb -h "$PWD/.local" -p 55439 homeward
```

The cluster path must contain no spaces for this `pg_ctl -o` example. Set the local connection string to `postgresql:///homeward?host=/absolute/path/to/checkout/.local&port=55439`. For Homebrew on Intel Macs, replace `/opt/homebrew` with `/usr/local`.

## Checks

```sh
.venv/bin/python -m unittest discover -s tests -v
node --test tests/*.cjs
node --check public/app.js
node --check public/practice.js
node --check public/skills.js
node --check public/lessons.js
node --check public/modules.js
```

Python tests require a real PostgreSQL database. They use `HOMEWARD_TEST_DATABASE_URL`, falling back to `DATABASE_URL` from `.env.local`. Each test creates and removes its own randomly named `test_*` schema. Use a dedicated development/test database whose role can create schemas.

See [VERIFICATION.md](VERIFICATION.md) for observed results and limitations.

## Vercel deployment

The Git-connected Vercel project is `homeward` in `arvins-projects-318f977d`. The feature branch `feat/no-ai-workbook` deploys to the preview linked above. The pull request remains unmerged; production is not released.

The preview has a dedicated `homeward-preview` Neon database, with the database and function in Singapore. The integration provides `DATABASE_URL` for preview. `APP_ORIGIN` allows the exact branch-preview origin; the deployment's own `VERCEL_URL` is also accepted. Secrets remain in Vercel and ignored local environment files.

For subsequent schema changes, load the target environment deliberately and run `scripts/migrate.py` before serving traffic. It prefers `DATABASE_URL_UNPOOLED` for migrations and falls back to `DATABASE_URL` for ordinary PostgreSQL setups. The running app uses pooled connections. Migrations are explicit; requests do not create tables.

For a future production release, create a separate database and production environment variables, run migrations, deploy a reviewed commit, and verify the complete hosted flow before promoting it. Do not connect production to the test database or use local database files for Vercel persistence.

Hosted verification covered health, actual browser account creation/join, private reflection saving, and the API journey through both approvals and a completed review, then a browser reload showing the saved result. See [VERIFICATION.md](VERIFICATION.md).

## Structure and limits

- `core.py`: authenticated session behavior and ownership checks.
- `modules.py`: three authored learning sequences, checked quizzes, atomic progress and one-time XP.
- `lessons.py`: authored lesson catalogue, private drafts and dated self-reflection snapshots.
- `skills.py`: account-scoped dinner skill, atomic versioned saves, private history and opt-in milestones.
- `db.py`, `schema.sql`: PostgreSQL persistence, transactions and version checks.
- `workbook.py`: authored reflection prompts, editable examples and a deterministic statement starter.
- `server.py`, `api/handler.py`: shared local/hosted HTTP boundary.
- `public/`: buildless browser UI and four meal illustrations.

This is an early couples release. There is no password recovery, email verification, invitation renewal UI, automatic reminder, calendar integration, payment or subscription. Keep your password safe. Sharing is deliberate, but private reflections are not end-to-end encrypted: the application/database operator can access stored data. Public launch still requires operational backup/restore, account recovery and retention/deletion procedures.

Meal illustrations were generated during design; prompts and provenance are in `docs/assets/` and adjacent asset sidecars. The running application makes no model calls. The original workbook PDF, personal records, credentials and earlier Software Factory pilot are not in this repository.
