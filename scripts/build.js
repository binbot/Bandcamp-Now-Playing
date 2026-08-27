const fs = require('node:fs');
const path = require('node:path');
const { execFileSync } = require('node:child_process');

const ROOT = path.resolve(__dirname, '..');
const SRC = path.join(ROOT, 'src');
const DIST = path.join(ROOT, 'dist');

const ICONS = ['16', '32', '48', '128'].map((size) => `icon${size}.png`);
const ICON_MAP = Object.fromEntries(
    ICONS.map((name) => [name.replace('icon', '').replace('.png', ''), name])
);

const CSP = "script-src 'self'; object-src 'self'; style-src 'self' https://cdn.jsdelivr.net 'unsafe-inline';";

const EXTENSION = {
    name: "Bandcamp Now Playing",
    version: "1.2",
    description: "Manually post your currently playing Bandcamp track to Mastodon or Bluesky."
};

const HOST_PERMISSIONS = [
    "https://*.bandcamp.com/*",
    "https://*.bcbits.com/*",
    "https://bsky.social/*"
];

const BROWSERS = {
    chrome: {
        manifestVersion: 3,
        permissions: ["storage", "scripting", "activeTab"],
        background: { service_worker: "background.js" },
        contentSecurityPolicy: CSP
    },
    firefox: {
        manifestVersion: 2,
        permissions: ["storage", "activeTab"],
        background: { scripts: ["background.js"], persistent: true },
        gecko: { id: "bandcamp-masto@yourdomain.com" }
    },
    safari: {
        manifestVersion: 3,
        permissions: ["storage", "scripting", "activeTab"],
        background: { scripts: ["background.js"] },
        contentSecurityPolicy: CSP,
        browserSpecificSettings: { safari: { strict_min_version: "15" } }
    }
};

const SHIM = fs.readFileSync(path.join(SRC, 'lib', 'browser.js'), 'utf8');
const COMPOSE = fs.readFileSync(path.join(SRC, 'lib', 'compose.js'), 'utf8');

function readSource(file) {
    return fs.readFileSync(file, 'utf8');
}

function withShim(body) {
    return `${SHIM}\n\n${body}`;
}

function buildBackground() {
    const bodies = ['mastodon', 'bluesky']
        .map((network) => readSource(path.join(SRC, 'background', `${network}.js`)))
        .join('\n\n');
    return withShim(`${COMPOSE}\n\n${bodies}`);
}

function buildManifest(browser) {
    const manifest = {
        manifest_version: browser.manifestVersion,
        name: EXTENSION.name,
        version: EXTENSION.version,
        description: EXTENSION.description,
        background: browser.background,
        content_scripts: [{ matches: ["https://*.bandcamp.com/*"], js: ["content.js"] }],
        icons: ICON_MAP
    };

    if (browser.manifestVersion === 3) {
        manifest.permissions = browser.permissions;
        manifest.host_permissions = HOST_PERMISSIONS;
        manifest.action = { default_popup: "popup.html" };
    } else {
        manifest.permissions = [...browser.permissions, ...HOST_PERMISSIONS];
        manifest.browser_action = { default_popup: "popup.html" };
    }

    if (browser.contentSecurityPolicy) {
        manifest.content_security_policy = { extension_pages: browser.contentSecurityPolicy };
    }
    if (browser.gecko) {
        manifest.browser_specific_settings = { gecko: browser.gecko };
    }
    if (browser.browserSpecificSettings) {
        manifest.browser_specific_settings = browser.browserSpecificSettings;
    }

    return manifest;
}

function verify(dir) {
    for (const file of ['background.js', 'content.js', 'popup.js']) {
        execFileSync(process.execPath, ['--check', path.join(dir, file)]);
    }
    const manifest = JSON.parse(fs.readFileSync(path.join(dir, 'manifest.json'), 'utf8'));
    if (manifest.name !== EXTENSION.name) {
        throw new Error(`${dir}: manifest name mismatch`);
    }

    const background = readSource(path.join(dir, 'background.js'));
    for (const marker of [
        'saveMastodonCredentials',
        'saveBlueskyCredentials',
        '/api/v1/statuses',
        'app.bsky.feed.post',
        'com.atproto.repo.createRecord',
        'message.network === "mastodon"',
        'message.network === "bluesky"'
    ]) {
        if (!background.includes(marker)) {
            throw new Error(`${dir}: background.js missing ${marker}`);
        }
    }
}

fs.rmSync(DIST, { recursive: true, force: true });

for (const [browserName, browser] of Object.entries(BROWSERS)) {
    const dir = path.join(DIST, browserName);
    fs.mkdirSync(dir, { recursive: true });

    fs.writeFileSync(
        path.join(dir, 'manifest.json'),
        JSON.stringify(buildManifest(browser), null, 2) + '\n'
    );
    fs.writeFileSync(path.join(dir, 'background.js'), buildBackground());
    fs.writeFileSync(
        path.join(dir, 'content.js'),
        withShim(readSource(path.join(SRC, 'content.js')))
    );
    fs.writeFileSync(
        path.join(dir, 'popup.js'),
        withShim(`${COMPOSE}\n\n${readSource(path.join(SRC, 'popup', 'popup.js'))}`)
    );
    fs.copyFileSync(path.join(SRC, 'popup', 'popup.html'), path.join(dir, 'popup.html'));
    fs.copyFileSync(path.join(SRC, 'lib', 'compose.js'), path.join(dir, 'compose.js'));

    for (const icon of ICONS) {
        fs.copyFileSync(path.join(SRC, 'icons', icon), path.join(dir, icon));
    }

    verify(dir);
    console.log(`built dist/${browserName}`);
}

console.log('Build complete: 3 unified extension builds in dist/');