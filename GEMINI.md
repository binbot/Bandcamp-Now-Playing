# Bandcamp Now Playing to Mastodon

## Project Overview

This project is a browser extension designed to allow users to easily share their currently playing Bandcamp tracks to Mastodon. It supports Chrome, Firefox, and Safari, adapting to the specific manifest versions and APIs of each browser. The extension injects a content script into Bandcamp pages to detect track information, provides a popup for user interaction (e.g., entering Mastodon credentials and triggering posts), and uses a background script to handle the communication with the Mastodon API.

## Technologies Used

*   **JavaScript:** For all extension logic (content scripts, background scripts, popup scripts).
*   **HTML:** For the extension's popup interface.
*   **CSS:** (Inferred) For styling the popup.
*   **Web Extensions API:** Utilized for browser-specific functionalities like storage, messaging, and tab management.

## Architecture

The extension follows a standard browser extension architecture:

*   **`content.js`**: Injected into Bandcamp web pages to scrape the currently playing track's title, artist, and URL. It makes this information available to the extension's popup and background script.
*   **`background.js`**: Runs in the background and handles persistent tasks. Its primary responsibilities include:
    *   Storing and retrieving Mastodon API tokens and instance URLs using browser storage.
    *   Receiving "post now playing" requests from the popup.
    *   Constructing the Mastodon status message with track details and relevant tags.
    *   Making authenticated API calls to the user's Mastodon instance to post the status.
*   **`popup.html` / `popup.js`**: Provides the user interface that appears when the extension icon is clicked. This is where users can configure their Mastodon instance and token, and initiate the posting of the current track.

## Building and Running

This project does not require a traditional "build" step. To run the extension, you need to load it as an unpacked or temporary add-on in your browser's developer settings.

### Chrome

1.  Open Chrome and navigate to `chrome://extensions`.
2.  Enable "Developer mode" using the toggle in the top right corner.
3.  Click "Load unpacked" and select the `/home/binbot/Projects/Bandcamp-Now-Playing/chrome` directory.

### Firefox

1.  Open Firefox and navigate to `about:debugging#/runtime/this-firefox`.
2.  Click "Load Temporary Add-on..." and select any file within the `/home/binbot/Projects/Bandcamp-Now-Playing/firefox` directory (e.g., `manifest.json`).

### Safari

1.  Open Safari and go to `Safari > Preferences > Advanced` and check "Show Develop menu in menu bar".
2.  From the Develop menu, select "Show Extension Builder".
3.  Click the "+" button in the bottom left and choose "Add Extension".
4.  Select the `/home/binbot/Projects/Bandcamp-Now-Playing/safari` directory.
5.  Click "Run" to install and run the extension.

## Development Conventions

*   **Browser-Specific Directories:** The project maintains separate directories (`chrome`, `firefox`, `safari`) for each browser to accommodate differences in their Web Extensions API implementations and `manifest.json` requirements.
*   **Manifest Versions:** Chrome and Safari versions utilize `manifest_version: 3`, while the Firefox version uses `manifest_version: 2`. This impacts how permissions are declared, background scripts are registered, and other API calls are made.
*   **Code Reusability:** Where possible, common logic (e.g., track scraping in `content.js`) is kept similar across browser implementations, with adaptations primarily in the manifest files and background script initialization.
