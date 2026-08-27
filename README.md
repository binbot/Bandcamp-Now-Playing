# Bandcamp-Now-Playing

🎵 A simple browser extension to share your currently playing Bandcamp track—complete with clickable link and auto-generated artwork/player preview—directly to Mastodon or Bluesky with the click of a button. No scraping hacks, no complicated APIs, and no CORS headaches. Just a simple access token/password and music, your way.

---

## Features

- 🎶 **Manual posting:** Click “Post Now” only when you want to share—no spam.
- 🔗 **Link sharing:** Posts include a direct link to the Bandcamp track or album, which Mastodon/Bluesky will expand with artwork and a player.
- 🔒 **Privacy friendly:** No credentials stored except your access token/password (saved locally in your browser).
- 🌟 **Open source:** Tweak, remix, or fork as you wish.

---

## Browser Support

🌐 One **unified** extension for **Chrome/Chromium**, **Firefox/Gecko**, and **Safari** — Mastodon + Bluesky in one popup (Manifest V3 on Chrome/Safari, V2 on Firefox). You pick the network in the popup; no separate installs.

Built from source via `npm run build` → `dist/{chrome,firefox,safari}/` (or grab a ready-made zip from Releases).

---

### Getting a Mastodon Access Token

🔑 To use the Mastodon version, generate an access token from your Mastodon account. This token allows the extension to post on your behalf.

1.  Log in to your Mastodon account on your instance (e.g., `mastodon.social`).
2.  Go to **Preferences > Development**.
3.  Click **"New Application"**.
4.  Give your application a **Name** (e.g., "Bandcamp Now Playing").
5.  Under **Application scopes**, check `write:statuses`.
6.  Click **"Submit"**.
7.  Click on your new application in the list.
8.  Copy the **"Your access token"** and paste it into the extension's settings.

### Getting a Bluesky App Password

🔑 To use the Bluesky version, create an app password from your Bluesky account. This allows the extension to post on your behalf.

1.  Log in to your Bluesky account at [bsky.app](https://bsky.app).
2.  Go to **Settings > App Passwords**.
3.  Click **"Add App Password"**.
4.  Give it a **Name** (e.g., "Bandcamp Now Playing").
5.  Click **"Create"**.
6.  Copy the generated app password and paste it into the extension's settings (along with your handle, e.g., `user.bsky.social`).

---

## Installation & Usage

### Easy Installation (Recommended)

🎉 Download ready-to-install files from the [**Releases page**](https://github.com/YOUR_USERNAME/YOUR_REPONAME/releases) on GitHub.

1.  Choose your platform: **Mastodon** or **Bluesky**.
2.  Download the file for your browser:
    - Chrome: `.zip` (e.g., `mastodon-chrome.zip` or `bluesky-chrome.zip`)
    - Firefox: `.xpi` (e.g., `mastodon-firefox.xpi` or `bluesky-firefox.xpi`)
    - Safari: `.zip` (e.g., `mastodon-safari.zip` or `bluesky-safari.zip`)
3.  **For Chrome:**
    - Go to `chrome://extensions/`.
    - Enable "Developer mode".
    - Drag and drop the `.zip` file onto the page.
4.  **For Firefox:**
    - Go to `about:addons`.
    - Click the gear icon > "Install Add-on From File...".
    - Select the `.xpi` file.
5.  **For Safari:**
    - Unzip the `.zip` file.
    - Load as unpacked extension via Safari Extension Builder.
6.  Click the extension icon, enter your credentials (Mastodon: instance + token; Bluesky: handle + app password).
7.  Start playing a track on Bandcamp and enjoy! 🎶


### Developer Installation (from Source)

1. Clone this repo and build it — `dist/` is gitignored, so you must build on every machine:
   ```
   git clone git@codeberg.org:binbot/Bandcamp-Now-Playing.git
   npm run build   # or npm run build after every git pull — emits dist/{chrome,firefox,safari}/
   ```
   (Zero extra deps; just Node. Build verification runs `node --check` + marker checks.)

#### Chrome/Chromium (Manifest V3)

1. Go to `chrome://extensions/` in Chrome.
2. Enable "Developer mode" (top right).
3. Click "Load unpacked" and select `dist/chrome/`.
4. Click the extension icon, pick **Mastodon** or **Bluesky** at the top of the popup, and enter your credentials.
5. Open a Bandcamp album or track, play a song, and click "Post Now" — drafts persist, the button shows live character counts (Bluesky 300, Mastodon 500/instance), and blocks over-limit posts.

#### Firefox/Gecko (Manifest V2, including Zen)

1. Open Firefox.
2. Go to `about:debugging#/runtime/this-firefox`.
3. Click "Load Temporary Add-on…".
4. Select `dist/firefox/manifest.json`.
5. Pick the network in the popup, enter creds, and post.

#### Safari (macOS)

Safari still uses Manifest V3 but requires Xcode conversion:

1. **Prerequisites:** a Mac with Xcode (Apple Developer Program for distribution only; local testing works without).
2. **Convert the built extension:**
   ```
   xcrun safari-web-extension-converter dist/safari/
   ```
3. **Build and Run in Xcode:** open the generated Xcode project, select "My Mac", Run (▸).
4. **Enable:** Safari → Preferences → Advanced → "Show Develop menu" → Develop → "Allow Unsigned Extensions" → Preferences → Extensions → enable "Bandcamp Now Playing".
5. Pick a network, enter creds, and post.

---

## How It Works

🎼 The extension reads the currently playing track and artist from Bandcamp’s player bar. When you click “Post Now,” it sends a status to your Mastodon/Bluesky account with the track info, hashtags, and a link. The platform’s link preview automatically displays the album art and a player.

---

## To Do

- [ ] Create and publish proper Chrome Web Store extensions (Mastodon & Bluesky).
- [ ] Create and publish proper Firefox Add-ons (AMO) extensions (Mastodon & Bluesky).
- [ ] Create and publish proper Safari App Store extensions (Mastodon & Bluesky).
- [ ] Add support for more music sites (SoundCloud, YouTube Music, etc).
- [ ] Option to auto-post on track change.
- [ ] Customizable post message templates.
- [ ] Improved error handling and user feedback in the popup.
- [ ] Add localization/multi-language support.

---

## License

MIT — do whatever you like, just don’t blame me if you accidentally share your secret ambient playlist.

---

## Credits

- 🎵 Bandcamp for the music.
- 🐘 Mastodon for the fediverse.
- 🦋 Bluesky for the social sky.
- 🎨 Icons from favicon.io https://favicon.io/ and Twemoji.
---

## Icon

🎨 A simple, friendly suggestion:
- Create a 128x128 PNG with a music note and the Bandcamp “BC” waveform logo, or overlay a music note on Mastodon’s “M” or Bluesky’s butterfly logo.
- [favicon.io](https://favicon.io/) is great for quick icons, or try Canva for a custom look.
- Save as `icon16.png`, `icon32.png`, `icon48.png`, and `icon128.png` in your extension folder.

---

**Questions? Ideas? PRs? File an issue or fork away! Enjoy sharing your Bandcamp discoveries on Mastodon or Bluesky! 🚀**
