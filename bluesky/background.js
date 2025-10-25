// background.js

let blueskyAppPassword = null;
let blueskyHandle = null;

chrome.storage.local.get(['blueskyAppPassword', 'blueskyHandle'], (result) => {
    blueskyAppPassword = result.blueskyAppPassword;
    blueskyHandle = result.blueskyHandle;
    console.log('Loaded BlueSky credentials:', blueskyHandle, blueskyAppPassword ? '[password set]' : '[no password]');
});

async function postToBluesky(postData) {
    const pdsUrl = 'https://bsky.social'; // Bluesky PDS URL

    // 1. Create Session (Authenticate)
    let session;
    try {
        const sessionResponse = await fetch(`${pdsUrl}/xrpc/com.atproto.server.createSession`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                identifier: blueskyHandle,
                password: blueskyAppPassword
            })
        });
        session = await sessionResponse.json();
        if (!sessionResponse.ok) {
            console.error('BlueSky session creation failed:', session);
            return;
        }
        console.log('BlueSky session created:', session);
    } catch (error) {
        console.error('BlueSky session creation error:', error);
        return;
    }

    const accessJwt = session.accessJwt;
    const repo = session.did;

    // 2. Basic embed without metadata fetch for debugging
    let embedExternal = {
        $type: "app.bsky.embed.external",
        external: {
            uri: postData.trackUrl,
            title: postData.title,
            description: `${postData.title} by ${postData.artist}`
        }
    };
    console.log('Embed created:', embedExternal);

    // 3. Create Post (Skeet)
    try {
        const postResponse = await fetch(`${pdsUrl}/xrpc/com.atproto.repo.createRecord`, {
            method: "POST",
            headers: {
                "Authorization": `Bearer ${accessJwt}`,
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                repo: repo,
                collection: "app.bsky.feed.post",
                record: {
                    text: postData.text, // text is now fully constructed before being passed
                    createdAt: new Date().toISOString(),
                    embed: embedExternal
                }
            })
        });
        const postResult = await postResponse.json();
        if (!postResponse.ok) {
            console.error('BlueSky post failed:', postResult);
            console.error('Post response status:', postResponse.status);
            return;
        }
        console.log('BlueSky post successful:', postResult);
    } catch (error) {
        console.error('BlueSky post error:', error);
    }
}

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    console.log('Background received message:', message);

    if (message.type === "postNowPlaying") {
        if (blueskyAppPassword && blueskyHandle) {
            let text = '';
            if (message.data.comment) {
                text += message.data.comment + '\n\n';
            }
            text += `\u{1F3B5} Now playing: ${message.data.title}`;
            if (message.data.artist) text += ` by ${message.data.artist}`;

            // Add tags
            let tags = '#nowplaying';
            if (message.data.tags) {
                const userTags = message.data.tags.split(' ').map(tag => `#${tag.trim()}`).join(' ');
                tags += ' ' + userTags;
            }
            text += `\n\n${tags}`;

            postToBluesky({ text, title: message.data.title, artist: message.data.artist, trackUrl: message.data.trackUrl });
        } else {
            console.warn('BlueSky credentials missing! Handle:', blueskyHandle, 'App Password:', blueskyAppPassword ? '[set]' : '[not set]');
        }
    } else if (message.type === "saveBlueskyCredentials") {
        blueskyAppPassword = message.appPassword;
        blueskyHandle = message.handle;
        chrome.storage.local.set({
            blueskyAppPassword,
            blueskyHandle
        }, () => {
            console.log('Saved BlueSky credentials.');
        });
    }
});