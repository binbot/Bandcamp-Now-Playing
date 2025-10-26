{
  "manifest_version": 2,
  "name": "Bandcamp Now Playing to Mastodon",
  "version": "1.1",
  "description": "Manually post your currently playing Bandcamp track to Mastodon.",
  "permissions": [
    "storage",
    "activeTab",
    "https://*.bandcamp.com/*"
  ],
  "background": {
    "scripts": ["background.js"],
    "persistent": true
  },
  "content_scripts": [
    {
      "matches": ["https://*.bandcamp.com/*"],
      "js": ["content.js"]
    }
  ],
  "browser_action": {
    "default_popup": "popup.html"
  },
  "icons": {
    "16": "icon16.png",
    "32": "icon32.png",
    "48": "icon48.png",
    "128": "icon128.png"
  },
  "applications": {
    "gecko": {
      "id": "bandcamp-masto@yourdomain.com"
    }
  }
}
