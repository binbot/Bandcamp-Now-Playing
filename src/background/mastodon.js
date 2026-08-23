let mastodonToken = null;
let mastodonInstance = null;
let mastodonReady = storageGet(['mastodonToken', 'mastodonInstance']).then((result) => {
    mastodonToken = result.mastodonToken;
    mastodonInstance = result.mastodonInstance;
});

async function postToMastodon(status) {
    if (!mastodonInstance || !mastodonToken) {
        return { ok: false, error: 'Mastodon credentials not configured.' };
    }
    try {
        const response = await fetch(`${mastodonInstance}/api/v1/statuses`, {
            method: "POST",
            headers: {
                "Authorization": `Bearer ${mastodonToken}`,
                "Content-Type": "application/json"
            },
            body: JSON.stringify({ status })
        });
        const data = await response.json().catch(() => ({}));
        if (!response.ok) {
            return { ok: false, error: data.error || data.message || `Mastodon post failed (${response.status})` };
        }
        return { ok: true, data };
    } catch (error) {
        return { ok: false, error: error.message || 'Network error posting to Mastodon.' };
    }
}

onMessage(async (message) => {
    if (message.type === "postNowPlaying" && message.network === "mastodon") {
        await mastodonReady;
        if (!mastodonToken || !mastodonInstance) {
            const fresh = await storageGet(['mastodonToken', 'mastodonInstance']);
            mastodonToken = fresh.mastodonToken;
            mastodonInstance = fresh.mastodonInstance;
            if (!mastodonToken || !mastodonInstance) {
                return { ok: false, error: 'Mastodon credentials not configured.' };
            }
        }
        let status = '';
        if (message.data.comment) {
            status += message.data.comment + '\n\n';
        }
        status += `\u{1F3B5} Now playing: ${message.data.title}`;
        if (message.data.artist) status += ` by ${message.data.artist}`;
        if (message.data.trackUrl) status += `\n${message.data.trackUrl}`;

        let tags = '#nowplaying';
        if (message.data.tags) {
            tags += ' ' + message.data.tags;
        }
        status += `\n\n${tags}`;

        return postToMastodon(status);
    } else if (message.type === "saveMastodonCredentials") {
        mastodonToken = message.token;
        mastodonInstance = message.instance;
        api.storage.local.set({ mastodonToken, mastodonInstance });
    }
});