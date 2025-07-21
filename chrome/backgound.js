// background.js

let mastodonToken = null;
let mastodonInstance = null;

chrome.storage.local.get(['mastodonToken', 'mastodonInstance'], (result) => {
    mastodonToken = result.mastodonToken;
    mastodonInstance = result.mastodonInstance;
    console.log('Loaded Mastodon credentials:', mastodonInstance, mastodonToken ? '[token set]' : '[no token]');
});

function postToMastodon(status) {
    fetch(`${mastodonInstance}/api/v1/statuses`, {
        method: "POST",
        headers: {
            "Authorization": `Bearer ${mastodonToken}`,
            "Content-Type": "application/json"
        },
        body: JSON.stringify({ status })
    })
    .then(response => {
        console.log('Mastodon fetch response status:', response.status);
        return response.json().catch(() => ({}));
    })
    .then(data => {
        console.log('Mastodon response data:', data);
    })
    .catch(error => {
        console.error('Mastodon post error:', error);
    });
}

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    console.log('Background received message:', message);

    if (message.type === "postNowPlaying") {
        if (mastodonToken && mastodonInstance) {
            let status = `🎵 Now playing: ${message.data.title}`;
            if (message.data.artist) status += ` by ${message.data.artist}`;
            if (message.data.trackUrl) status += `\n${message.data.trackUrl}`;
            postToMastodon(status);
        } else {
            console.warn('Mastodon credentials missing! Token:', mastodonToken, 'Instance:', mastodonInstance);
        }
    } else if (message.type === "saveMastodonCredentials") {
        mastodonToken = message.token;
        mastodonInstance = message.instance;
        chrome.storage.local.set({
            mastodonToken,
            mastodonInstance
        }, () => {
            console.log('Saved Mastodon credentials.');
        });
    }
});
