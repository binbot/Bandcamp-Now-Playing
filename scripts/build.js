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

const NETWORKS = {
    mastodon: {
        name: "Bandcamp Now Playing to Mastodon",
        description: "Manually post your currently playing Bandcamp track to Mastodon.",
        hostPermissions: ["https://*.bandcamp.com/*"]
    },
    bluesky: {
        name: "Bandcamp Now Playing to BlueSky",
        description: "Manually post your currently playing Bandcamp track to BlueSky.",
        hostPermissions: ["https://*.bandcamp.com/*", "https://*.bcbits.com/*", "https://bsky.social/*"]
    }
};

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

function withShim(file) {
    const source = fs.readFileSync(file, 'utf8');
    return `${SHIM}\n\n${source}`;
}

function buildManifest(network, browser) {
    const manifest = {
        manifest_version: browser.manifestVersion,
        name: network.name,
        version: "1.1",
        description: network.description,
        background: browser.background,
        content_scripts: [{ matches: ["https://*.bandcamp.com/*"], js: ["content.js"] }],
        icons: ICON_MAP
    };

    if (browser.manifestVersion === 3) {
        manifest.permissions = browser.permissions;
        manifest.host_permissions = network.hostPermissions;
        manifest.action = { default_popup: "popup.html" };
    } else {
        manifest.permissions = [...browser.permissions, ...network.hostPermissions];
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
    JSON.parse(fs.readFileSync(path.join(dir, 'manifest.json'), 'utf8'));
}

fs.rmSync(DIST, { recursive: true, force: true });

for (const [networkName, network] of Object.entries(NETWORKS)) {
    for (const [browserName, browser] of Object.entries(BROWSERS)) {
        const dir = path.join(DIST, browserName, networkName);
        fs.mkdirSync(dir, { recursive: true });

        fs.writeFileSync(
            path.join(dir, 'manifest.json'),
            JSON.stringify(buildManifest(network, browser), null, 2) + '\n'
        );
        fs.writeFileSync(
            path.join(dir, 'background.js'),
            withShim(path.join(SRC, 'background', `${networkName}.js`))
        );
        fs.writeFileSync(path.join(dir, 'content.js'), withShim(path.join(SRC, 'content.js')));
        fs.writeFileSync(
            path.join(dir, 'popup.js'),
            withShim(path.join(SRC, 'popup', `${networkName}.js`))
        );
        fs.copyFileSync(path.join(SRC, 'popup', `${networkName}.html`), path.join(dir, 'popup.html'));

        for (const icon of ICONS) {
            fs.copyFileSync(path.join(SRC, 'icons', icon), path.join(dir, icon));
        }

        verify(dir);
        console.log(`built dist/${browserName}/${networkName}`);
    }
}

console.log('Build complete: 6 extension builds in dist/');