let mastodonToken = null;
let mastodonInstance = null;
let mastodonMaxChars = 500;
let mastodonReady = storageGet(['mastodonToken', 'mastodonInstance', 'mastodonMaxChars']).then((result) => {
    mastodonToken = result.mastodonToken;
    mastodonInstance = result.mastodonInstance;
    if (result.mastodonMaxChars) mastodonMaxChars = result.mastodonMaxChars;
});

async function fetchMastodonMaxChars(instance) {
    try {
        const url = instance.replace(/\/+$/, '') + '/api/v1/instance';
        const res = await fetch(url);
        if (!res.ok) return null;
        const data = await res.json();
        const c = data?.configuration?.statuses?.max_characters ?? data?.max_characters ?? null;
        if (typeof c === 'number' && c > 0) return c;
    } catch (_) {}
    return null;
}

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

onMessage((message) => {
    if (message.type === "postNowPlaying" && message.network === "mastodon") {
        return (async () => {
            await mastodonReady;
            if (!mastodonToken || !mastodonInstance) {
                const fresh = await storageGet(['mastodonToken', 'mastodonInstance']);
                mastodonToken = fresh.mastodonToken;
                mastodonInstance = fresh.mastodonInstance;
                if (!mastodonToken || !mastodonInstance) {
                    return { ok: false, error: 'Mastodon credentials not configured.' };
                }
            }
            const status = composeNowPlaying('mastodon', message.data, message.data.comment, message.data.tags);
            return postToMastodon(status);
        })();
    } else if (message.type === "saveMastodonCredentials") {
        mastodonToken = message.token;
        mastodonInstance = message.instance;
        return (async () => {
            const maxChars = await fetchMastodonMaxChars(mastodonInstance);
            if (maxChars) mastodonMaxChars = maxChars;
            api.storage.local.set({
                mastodonToken,
                mastodonInstance,
                mastodonMaxChars: mastodonMaxChars
            });
            return { ok: true, maxChars: mastodonMaxChars };
        })();
    } else if (message.type === "fetchMastodonLimit") {
        return (async () => {
            if (!mastodonInstance) {
                const fresh = await storageGet(['mastodonInstance', 'mastodonMaxChars']);
                if (fresh.mastodonInstance) mastodonInstance = fresh.mastodonInstance;
                if (fresh.mastodonMaxChars) mastodonMaxChars = fresh.mastodonMaxChars;
            }
            if (!mastodonInstance) return { ok: false, maxChars: mastodonMaxChars };
            const maxChars = await fetchMastodonMaxChars(mastodonInstance);
            if (maxChars) {
                mastodonMaxChars = maxChars;
                api.storage.local.set({ mastodonMaxChars: maxChars });
            }
            return { ok: true, maxChars: mastodonMaxChars };
        })();
    }
    return undefined;
});