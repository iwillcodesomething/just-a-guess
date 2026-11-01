# Just a Guess

A Turkish, mobile-first daily prediction game. Built with React, Vinext and Cloudflare D1; hosted as a private Site with platform-owned ChatGPT sign-in.

## Working features
- Three shared daily questions with server-enforced deadlines and confidence-based Brier scoring.
- Weather questions and conditional football fixtures; future-day manual editorial questions.
- Two explicitly labeled practice questions, immediate feedback, no competitive scoring.
- Durable profile, prediction edits, result history, participation streak, XP and achievements.
- Daily, weekly and 28-day seasonal rankings; mutual friend requests using invite codes.
- In-app notifications, sound/haptics settings, personal data export and deletion.
- Owner-only content studio with evidence-backed manual settlement.
- Responsive desktop, tablet and phone layouts and a web-app manifest.

## Important scope
This is a web application, not an APK. Background push and scheduled unattended settlement are not implemented. Results are checked on app access and while an active tab refreshes. Source rechecks are throttled to 15 minutes. Questions not verified within 72 hours after their expected resolution are voided. No fabricated results, leaderboard users, historical activity or live match scores are seeded.

Weather settlement uses Open-Meteo's first available past-day model record after the stated settlement time. It is not an assertion of ground-truth station observations. Free Open-Meteo access is intended for this private, noncommercial beta; review licensing before commercial use. TheSportsDB public development access is best-effort. App-store distribution requires reviewing its paid subscription and third-party image rights. No external images are used.

## Development
Follow the installed Sites skill for dependency setup, preview, migrations and publishing. Configure `.openai/hosting.json` with the `DB` D1 binding. Generate schema migrations with the provided db:generate command; do not create tables in request handlers.

Tests: `node --experimental-strip-types --test tests/*.test.mjs`
Types: `node node_modules/typescript/bin/tsc --noEmit`

Service tests run actual application SQL against an isolated in-memory SQLite database with explicit fixture source responses and a controlled clock. They never modify production data. Local and deployed databases are separate.

## Identity and ownership
Hosted requests require the Sites-injected authenticated visitor ID. No client-supplied user ID or custom OAuth stack is used. A private Site's first authenticated visitor becomes its content owner. Sharing Site access is a separate platform operation; an in-game friend code does not grant site access.
