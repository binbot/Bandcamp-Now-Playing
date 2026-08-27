let activeNetwork = 'mastodon';

const BLUESKY_LIMIT = 300;
window._mastodonLimit = 500;

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

function graphemeLength(str) {
    try {
        const seg = new Intl.Segmenter(undefined, { granularity: 'grapheme' });
        return [...seg.segment(str)].length;
    } catch (_) {
        return [...str].length;
    }
}

function mastodonLength(str) {
    const placeholder = 'x'.repeat(23);
    const withoutUrls = str.replace(/https?:\/\/\S+/g, placeholder);
    return graphemeLength(withoutUrls);
}

function updateCounter() {
    const el = document.getElementById('charCount');
    const btn = document.getElementById('postnow');
    if (!el || !btn) return;
    if (!window._nowPlaying || !window._nowPlaying.title) {
        el.textContent = '';
        el.classList.remove('over');
        return;
    }
    if (window._nowPlaying.error === 'collection') {
        el.textContent = '';
        el.classList.remove('over');
        return;
    }
    if (window._posted) {
        return;
    }
    const comment = document.getElementById('comment').value;
    const tagsRaw = document.getElementById('tags').value;
    const tags = normalizeTags(tagsRaw);
    let composed;
    try {
        composed = composeNowPlaying(activeNetwork, window._nowPlaying, comment, tags);
    } catch (_) {
        composed = comment;
    }
    const limit = activeNetwork === 'bluesky' ? BLUESKY_LIMIT : window._mastodonLimit;
    const len = activeNetwork === 'bluesky' ? graphemeLength(composed) : mastodonLength(composed);
    const remaining = limit - len;
    if (remaining >= 0) {
        el.textContent = `${remaining} characters left`;
        el.classList.remove('over');
        if (!window._posted) btn.disabled = false;
    } else {
        el.textContent = `${Math.abs(remaining)} over the ${limit}-character limit for ${activeNetwork}`;
        el.classList.add('over');
        btn.disabled = true;
        document.getElementById('poststatus').textContent = `Over the ${limit}-character limit for ${activeNetwork} — trim your comment or tags before posting.`;
    }
    if (remaining >= 0) {
        const ps = document.getElementById('poststatus').textContent;
        if (ps && ps.includes('Over the') && ps.includes('character limit')) {
            document.getElementById('poststatus').textContent = '';
        }
    }
}

function setActiveNetwork(network) {
    activeNetwork = network;
    document.getElementById('btnMastodon').classList.toggle('active', network === 'mastodon');
    document.getElementById('btnBluesky').classList.toggle('active', network === 'bluesky');
    document.getElementById('mastodonSection').style.display = network === 'mastodon' ? 'block' : 'none';
    document.getElementById('blueskySection').style.display = network === 'bluesky' ? 'block' : 'none';
    window._posted = false;
    const btn = document.getElementById('postnow');
    if (btn && !(window._nowPlaying && window._nowPlaying.error === 'collection')) {
        btn.disabled = false;
        btn.textContent = 'Post Now';
    }
    saveDraft();
    updateCounter();
}

document.getElementById('btnMastodon').onclick = () => setActiveNetwork('mastodon');
document.getElementById('btnBluesky').onclick = () => setActiveNetwork('bluesky');
document.getElementById('comment').addEventListener('input', () => { saveDraft(); updateCounter(); });
document.getElementById('tags').addEventListener('input', () => { saveDraft(); updateCounter(); });

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
window._posted = false;

document.getElementById('saveMastodon').onclick = async () => {
    const instance = document.getElementById('mastodonInstance').value.trim();
    const token = document.getElementById('mastodonToken').value.trim();
    if (instance && token) {
        document.getElementById('mastodonStatus').textContent = "Saving…";
        try {
            const response = await sendMessage({ type: "saveMastodonCredentials", instance, token });
            if (response && response.ok) {
                window._mastodonReady = true;
                window._mastodonLimit = response.maxChars || 500;
                document.getElementById('mastodonStatus').textContent = "Saved!";
                setTimeout(() => showLoggedIn('mastodon', `Logged in to ${instance}`), 1000);
                updateCounter();
            } else {
                document.getElementById('mastodonStatus').textContent = (response && response.error) || "Failed to save.";
            }
        } catch (e) {
            window._mastodonReady = true;
            document.getElementById('mastodonStatus').textContent = "Saved!";
            setTimeout(() => showLoggedIn('mastodon', `Logged in to ${instance}`), 1000);
            updateCounter();
        }
    } else {
        document.getElementById('mastodonStatus').textContent = "Please fill both fields.";
    }
};

document.getElementById('logoutMastodon').onclick = () => {
    api.storage.local.remove(['mastodonInstance', 'mastodonToken', 'mastodonMaxChars'], () => {
        window._mastodonReady = false;
        window._mastodonLimit = 500;
        showLoggedOut('mastodon');
        document.getElementById('mastodonInstance').value = '';
        document.getElementById('mastodonToken').value = '';
        document.getElementById('mastodonStatus').textContent = "Logged out.";
        updateCounter();
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

api.storage.local.get(['mastodonInstance', 'mastodonToken', 'mastodonMaxChars'], (result) => {
    if (result.mastodonMaxChars) window._mastodonLimit = result.mastodonMaxChars;
    if (result.mastodonInstance && result.mastodonToken) {
        window._mastodonReady = true;
        showLoggedIn('mastodon', `Logged in to ${result.mastodonInstance}`);
        if (!result.mastodonMaxChars) {
            sendMessage({ type: "fetchMastodonLimit" }).then((r) => {
                if (r && r.ok && r.maxChars) {
                    window._mastodonLimit = r.maxChars;
                    updateCounter();
                }
            });
        }
    } else {
        if (result.mastodonInstance) document.getElementById('mastodonInstance').value = result.mastodonInstance;
        if (result.mastodonToken) document.getElementById('mastodonToken').value = result.mastodonToken;
    }
    updateCounter();
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
    updateCounter();
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
            window._posted = false;
            const btn = document.getElementById('postnow');
            btn.textContent = 'Post Now';
            if (response && response.error === 'collection') {
                btn.disabled = true;
                document.getElementById('poststatus').textContent = "Your collection is cozy, but Bandcamp hides the track link here — pop open the album or track page and I'll post it properly \u{1F3B6}";
                document.getElementById('charCount').textContent = '';
            } else {
                btn.disabled = false;
                document.getElementById('poststatus').textContent = '';
                updateCounter();
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
        if (window._posted) {
            document.getElementById('poststatus').textContent = `Already posted to ${activeNetwork} ✓ — switch networks or reload the track to post again.`;
            return;
        }
        const comment = document.getElementById('comment').value.trim();
        const tags = document.getElementById('tags').value.trim();
        const network = activeNetwork;
        const ready = network === 'mastodon' ? window._mastodonReady : window._blueskyReady;
        if (!ready) {
            document.getElementById('poststatus').textContent = `Set up ${network} credentials first.`;
            return;
        }
        const normalizedTags = normalizeTags(tags);
        try {
            const composed = composeNowPlaying(network, window._nowPlaying, comment, normalizedTags);
            const limit = network === 'bluesky' ? BLUESKY_LIMIT : window._mastodonLimit;
            const len = network === 'bluesky' ? graphemeLength(composed) : mastodonLength(composed);
            if (len > limit) {
                document.getElementById('poststatus').textContent = `Over the ${limit}-character limit for ${network} (${len}/${limit}) — trim your comment or tags before posting.`;
                return;
            }
        } catch (_) {}
        const btn = document.getElementById('postnow');
        btn.disabled = true;
        document.getElementById('poststatus').textContent = `Posting to ${network}\u2026`;
        try {
            const result = await sendMessage({
                type: "postNowPlaying",
                network,
                data: { ...window._nowPlaying, comment, tags: normalizedTags }
            });
            if (result && result.ok) {
                window._posted = true;
                document.getElementById('poststatus').textContent = `Posted to ${network} ✓`;
                btn.textContent = 'Posted ✓';
                btn.disabled = true;
            } else {
                document.getElementById('poststatus').textContent = (result && result.error) || `Failed to post to ${network}. Check credentials and try again.`;
                btn.disabled = false;
                updateCounter();
            }
        } catch (e) {
            document.getElementById('poststatus').textContent = `Failed to post to ${network}: ${e.message || 'unknown error'}`;
            btn.disabled = false;
            updateCounter();
        }
    } else {
        document.getElementById('poststatus').textContent = "No track info to post.";
    }
};
