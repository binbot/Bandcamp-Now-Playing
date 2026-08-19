let activeNetwork = 'mastodon';

document.addEventListener('DOMContentLoaded', () => {
    const desiredWidth = 400;
    const desiredHeight = 600;

    document.body.style.width = `${desiredWidth}px`;
    document.body.style.height = `${desiredHeight}px`;

    window.resizeTo(desiredWidth, desiredHeight);

    fetchNowPlaying();
});

function setActiveNetwork(network) {
    activeNetwork = network;
    document.getElementById('btnMastodon').classList.toggle('active', network === 'mastodon');
    document.getElementById('btnBluesky').classList.toggle('active', network === 'bluesky');
    document.getElementById('mastodonSection').style.display = network === 'mastodon' ? 'block' : 'none';
    document.getElementById('blueskySection').style.display = network === 'bluesky' ? 'block' : 'none';
}

document.getElementById('btnMastodon').onclick = () => setActiveNetwork('mastodon');
document.getElementById('btnBluesky').onclick = () => setActiveNetwork('bluesky');

function updateNowPlayingDisplay(info) {
    const np = document.getElementById('nowplaying');
    if (info && info.title) {
        let html = `<b>${info.title}</b>`;
        if (info.artist) html += ` by <b>${info.artist}</b>`;
        if (info.trackUrl) html += `<br><a href="${info.trackUrl}" target="_blank">${info.trackUrl}</a>`;
        np.innerHTML = html;
    } else {
        np.textContent = "No track info found. Play a track on Bandcamp and refresh this popup.";
    }
}

function showLoggedIn(network, message) {
    document.getElementById(`${network}Auth`).style.display = 'none';
    document.getElementById(`${network}LoggedIn`).style.display = 'block';
    document.getElementById(`${network}LoggedInMessage`).textContent = message;
}

function showLoggedOut(network) {
    document.getElementById(`${network}Auth`).style.display = 'block';
    document.getElementById(`${network}LoggedIn`).style.display = 'none';
}

window._mastodonReady = false;
window._blueskyReady = false;

document.getElementById('saveMastodon').onclick = () => {
    const instance = document.getElementById('mastodonInstance').value.trim();
    const token = document.getElementById('mastodonToken').value.trim();
    if (instance && token) {
        api.runtime.sendMessage({ type: "saveMastodonCredentials", instance, token });
        window._mastodonReady = true;
        document.getElementById('mastodonStatus').textContent = "Saved!";
        setTimeout(() => showLoggedIn('mastodon', `Logged in to ${instance}`), 1000);
    } else {
        document.getElementById('mastodonStatus').textContent = "Please fill both fields.";
    }
};

document.getElementById('logoutMastodon').onclick = () => {
    api.storage.local.remove(['mastodonInstance', 'mastodonToken'], () => {
        window._mastodonReady = false;
        showLoggedOut('mastodon');
        document.getElementById('mastodonInstance').value = '';
        document.getElementById('mastodonToken').value = '';
        document.getElementById('mastodonStatus').textContent = "Logged out.";
    });
};

document.getElementById('saveBluesky').onclick = () => {
    const handle = document.getElementById('blueskyHandle').value.trim();
    const appPassword = document.getElementById('blueskyAppPassword').value.trim();
    if (handle && appPassword) {
        api.runtime.sendMessage({ type: "saveBlueskyCredentials", handle, appPassword });
        window._blueskyReady = true;
        document.getElementById('blueskyStatus').textContent = "Saved!";
        setTimeout(() => showLoggedIn('bluesky', `Logged in as ${handle}`), 1000);
    } else {
        document.getElementById('blueskyStatus').textContent = "Please fill both fields.";
    }
};

document.getElementById('logoutBluesky').onclick = () => {
    api.storage.local.remove(['blueskyHandle', 'blueskyAppPassword'], () => {
        window._blueskyReady = false;
        showLoggedOut('bluesky');
        document.getElementById('blueskyHandle').value = '';
        document.getElementById('blueskyAppPassword').value = '';
        document.getElementById('blueskyStatus').textContent = "Logged out.";
    });
};

api.storage.local.get(['mastodonInstance', 'mastodonToken'], (result) => {
    if (result.mastodonInstance && result.mastodonToken) {
        window._mastodonReady = true;
        showLoggedIn('mastodon', `Logged in to ${result.mastodonInstance}`);
    } else {
        if (result.mastodonInstance) document.getElementById('mastodonInstance').value = result.mastodonInstance;
        if (result.mastodonToken) document.getElementById('mastodonToken').value = result.mastodonToken;
    }
});

api.storage.local.get(['blueskyHandle', 'blueskyAppPassword'], (result) => {
    if (result.blueskyHandle && result.blueskyAppPassword) {
        window._blueskyReady = true;
        showLoggedIn('bluesky', `Logged in as ${result.blueskyHandle}`);
    } else {
        if (result.blueskyHandle) document.getElementById('blueskyHandle').value = result.blueskyHandle;
        if (result.blueskyAppPassword) document.getElementById('blueskyAppPassword').value = result.blueskyAppPassword;
    }
});

function fetchNowPlaying() {
    api.tabs.query({active: true, currentWindow: true}, function(tabs) {
        if (tabs.length === 0) return;
        api.tabs.sendMessage(tabs[0].id, {type: "getNowPlaying"}, function(response) {
            updateNowPlayingDisplay(response);
            window._nowPlaying = response;
        });
    });
}

document.getElementById('postnow').onclick = () => {
    if (window._nowPlaying && window._nowPlaying.title) {
        const comment = document.getElementById('comment').value.trim();
        const tags = document.getElementById('tags').value.trim();
        const network = activeNetwork;
        const ready = network === 'mastodon' ? window._mastodonReady : window._blueskyReady;
        if (!ready) {
            document.getElementById('poststatus').textContent = `Set up ${network} credentials first.`;
            return;
        }
        api.runtime.sendMessage({
            type: "postNowPlaying",
            network,
            data: { ...window._nowPlaying, comment, tags }
        });
        document.getElementById('poststatus').textContent = `Posted to ${network}!`;
    } else {
        document.getElementById('poststatus').textContent = "No track info to post.";
    }
};