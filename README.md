# Bandcamp-Now-Playing

A simple browser extension to share your currently playing Bandcamp track—complete with clickable link and auto-generated artwork/player preview—directly to Mastodon with the click of a button. No scraping hacks, no complicated APIs, and no CORS headaches. Just a simple Mastodon access token and music, your way.

---

## Features

- **Manual posting:** Click “Post Now” only when you want to share—no spam.
- **Link sharing:** Posts include a direct link to the Bandcamp track or album, which Mastodon will expand with artwork and a player.
- **Privacy friendly:** No credentials stored except your Mastodon access token (saved locally in your browser).
- **Open source:** Tweak, remix, or fork as you wish.

---

## Browser Support

This extension works in both **Chrome/Chromium** and **Firefox/Gecko** browsers.  
Choose the version that matches your browser:

- **Chrome/Chromium:** Use the files in the `chrome/` folder (Manifest V3).
- **Firefox/Gecko (including Zend):** Use the files in the `firefox/` folder (Manifest V2).

---

## Installation & Usage

### Chrome/Chromium (Manifest V3)

1. Download or clone this repo.
2. Go to `chrome://extensions/` in Chrome.
3. Enable “Developer mode” (top right).
4. Click “Load unpacked” and select the `chrome/` folder.
5. Click the extension icon and enter your Mastodon instance URL and access token (with `write:statuses` permission).
6. Open a Bandcamp album or track, play a song, and click “Post Now” in the popup.

### Firefox/Gecko (Manifest V2)

1. Download or clone this repo.
2. Open Firefox.
3. Go to `about:debugging#/runtime/this-firefox`
4. Click “Load Temporary Add-on.”
5. Select the `manifest.json` file inside the `firefox/` folder.
6. Click the extension icon, enter your Mastodon instance URL and access token (with `write:statuses` permission).
7. Open a Bandcamp album or track, play a song, and click “Post Now” in the popup.

---

## How It Works

- The extension reads the currently playing track and artist from Bandcamp’s player bar.
- When you click “Post Now,” it sends a status to your Mastodon account with the track info and a link.
- Mastodon’s link preview automatically displays the album art and a player.

---

## To Do

- [ ] Create and publish a proper Chrome Web Store extension.
- [ ] Create and publish a proper Firefox Add-ons (AMO) extension.
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

- Bandcamp for the music.
- Mastodon for the fediverse.
- [Your Name] for the code.

---

## Icon

A simple, friendly suggestion:
- Create a 128x128 PNG with a music note and the Bandcamp “BC” waveform logo, or overlay a music note on Mastodon’s “M” logo.
- [favicon.io](https://favicon.io/) is great for quick icons, or try Canva for a custom look.
- Save as `icon16.png`, `icon32.png`, `icon48.png`, and `icon128.png` in your extension folder.

---

**Questions? Ideas? PRs? File an issue or fork away! Enjoy sharing your Bandcamp discoveries.**
