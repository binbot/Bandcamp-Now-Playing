let activeNetwork = 'mastodon';

document.addEventListener('DOMContentLoaded', () => {
    const desiredWidth = 400;
    const desiredHeight = 600;

    document.body.style.width = `${desiredWidth}px`;
    document.body.style.height = `${desiredHeight}px`;

    window.resizeTo(desiredWidth, desiredHeight);

    fetchNowPlaying();
});

function saveDraft() {
    api.storage.local.set({
        draftComment: document.getElementById('comment').value,
        draftTags: document.getElementById('tags').value,
        draftNetwork: activeNetwork
    });
}

function setActiveNetwork(network) {
    activeNetwork = network;
    document.getElementById('btnMastodon').classList.toggle('active', network === 'mastodon');
    document.getElementById('btnBluesky').classList.toggle('active', network === 'bluesky');
    document.getElementById('mastodonSection').style.display = network === 'mastodon' ? 'block' : 'none';
    document.getElementById('blueskySection').style.display = network === 'bluesky' ? 'block' : 'none';
    saveDraft();
}

document.getElementById('btnMastodon').onclick = () => setActiveNetwork('mastodon');
document.getElementById('btnBluesky').onclick = () => setActiveNetwork('bluesky');
document.getElementById('comment').addEventListener('input', saveDraft);
document.getElementById('tags').addEventListener('input', saveDraft);

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

document.getElementById('saveBluesky').onclick = async () => {
    const handle = document.getElementById('blueskyHandle').value.trim();
    const appPassword = document.getElementById('blueskyAppPassword').value.trim();
    if (handle && appPassword) {
        document.getElementById('blueskyStatus').textContent = "Checking credentials…";
        const response = await sendMessage({ type: "saveBlueskyCredentials", handle, appPassword });
        if (response && response.ok) {
            window._blueskyReady = true;
            document.getElementById('blueskyHandle').value = response.handle;
            document.getElementById('blueskyStatus').textContent = "Saved!";
            setTimeout(() => showLoggedIn('bluesky', `Logged in as ${response.handle}`), 1000);
        } else {
            document.getElementById('blueskyStatus').textContent = (response && response.error) || "Invalid handle or app password.";
        }
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

api.storage.local.get(['draftComment', 'draftTags', 'draftNetwork'], (result) => {
    if (result.draftComment) document.getElementById('comment').value = result.draftComment;
    if (result.draftTags) document.getElementById('tags').value = result.draftTags;
    if (result.draftNetwork === 'mastodon' || result.draftNetwork === 'bluesky') {
        setActiveNetwork(result.draftNetwork);
    }
});

function normalizeTags(raw) {
    return (raw || '').split(/\s+/).filter(Boolean).map((tag) => `#${tag.replace(/^#+/, '')}`).join(' ');
}

function fetchNowPlaying() {
    api.tabs.query({active: true, currentWindow: true}, function(tabs) {
        if (tabs.length === 0) return;
        api.tabs.sendMessage(tabs[0].id, {type: "getNowPlaying"}, function(response) {
            updateNowPlayingDisplay(response);
            window._nowPlaying = response;
            if (response && response.error === 'collection') {
                document.getElementById('postnow').disabled = true;
                document.getElementById('poststatus').textContent = "Your collection is cozy, but Bandcamp hides the track link here — pop open the album or track page and I'll post it properly \u{1F3B6}";
            } else {
                document.getElementById('postnow').disabled = false;
            }
        });
    });
}

document.getElementById('postnow').onclick = async () => {
    if (window._nowPlaying && window._nowPlaying.error === 'collection') {
        document.getElementById('poststatus').textContent = "Your collection is cozy, but Bandcamp hides the track link here — pop open the album or track page and I'll post it properly \u{1F3B6}";
        return;
    }
    if (window._nowPlaying && window._nowPlaying.title) {
        const comment = document.getElementById('comment').value.trim();
        const tags = document.getElementById('tags').value.trim();
        const network = activeNetwork;
        const ready = network === 'mastodon' ? window._mastodonReady : window._blueskyReady;
        if (!ready) {
            document.getElementById('poststatus').textContent = `Set up ${network} credentials first.`;
            return;
        }
        const btn = document.getElementById('postnow');
        btn.disabled = true;
        document.getElementById('poststatus').textContent = `Posting to ${network}\u2026`;
        try {
            const result = await sendMessage({
                type: "postNowPlaying",
                network,
                data: { ...window._nowPlaying, comment, tags: normalizeTags(tags) }
            });
            if (result && result.ok) {
                document.getElementById('poststatus').textContent = `Posted to ${network}!`;
            } else {
                document.getElementById('poststatus').textContent = (result && result.error) || `Failed to post to ${network}. Check credentials and try again.`;
            }
        } catch (e) {
            document.getElementById('poststatus').textContent = `Failed to post to ${network}: ${e.message || 'unknown error'}`;
        } finally {
            btn.disabled = false;
        }
    } else {
        document.getElementById('poststatus').textContent = "No track info to post.";
    }
};