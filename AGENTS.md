# AGENTS.md — Developer & Agent Workflow

## Build
- Single source of truth: `src/` (content script, popup, background per network, `lib/browser.js` shim, `lib/compose.js` shared composer).
- Build: `npm run build` (zero-dep Node, `scripts/build.js`) emits `dist/{chrome,firefox,safari}/`.
- `dist/` is **gitignored** — after `git clone` or `git pull` on any machine you MUST run `npm run build` before loading the unpacked extension.
- Verify: build runs `node --check` on JS + JSON + marker checks (`verify()` in `scripts/build.js`).

## Source layout
- `src/content.js`, `src/popup/popup.html` + `popup.js`, `src/background/{mastodon,bluesky}.js`, `src/lib/{browser,compose}.js`, `src/icons/`.
- Background is concatenated: `lib/browser.js` + `lib/compose.js` + both network files.
- Popup loads `compose.js` + `popup.js` (both shim-wrapped in `dist/`).

## Character limits
- Bluesky: 300 graphemes (hard block, `Post Now` disabled when over; `Intl.Segmenter` with fallback).
- Mastodon: per-instance `max_characters` (fetched from `{instance}/api/v1/instance` on credential save, cached as `mastodonMaxChars`, fallback 500). URLs counted as 23 chars for Mastodon.

## Git & remotes
- `origin` = Codeberg (`git@codeberg.org:binbot/Bandcamp-Now-Playing.git`) — source of truth.
- `github` = GitHub backup (`https://github.com/binbot/Bandcamp-Now-Playing.git`).
- Push **BOTH** remotes after merging to `main`.
- Branch per plan phase (`feat/phaseN-...`). Merge to `main` with `--no-ff`.
- Test live in browser (Chrome/Firefox unpacked) before pushing — not just automated checks.

## Pending
- Phase 4 branded refresh: vendor Pico CSS, tighten CSP, polish popup card/toggle/states.
- Firefox AMO readiness: replace placeholder `bandcamp-masto@yourdomain.com` gecko ID.
