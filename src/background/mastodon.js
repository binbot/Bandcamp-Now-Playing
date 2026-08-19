let mastodonToken = null;
let mastodonInstance = null;

api.storage.local.get(['mastodonToken', 'mastodonInstance'], (result) => {
    mastodonToken = result.mastodonToken;
    mastodonInstance = result.mastodonInstance;
});

function postToMastodon(status) {
    return fetch(`${mastodonInstance}/api/v1/statuses`, {
        method: "POST",
        headers: {
            "Authorization": `Bearer ${mastodonToken}`,
            "Content-Type": "application/json"
        },
        body: JSON.stringify({ status })
    }).catch(() => {});
}

api.runtime.onMessage.addListener((message) => {
    if (message.type === "postNowPlaying") {
        if (mastodonToken && mastodonInstance) {
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

            postToMastodon(status);
        }
    } else if (message.type === "saveMastodonCredentials") {
        mastodonToken = message.token;
        mastodonInstance = message.instance;
        api.storage.local.set({ mastodonToken, mastodonInstance });
    }
});