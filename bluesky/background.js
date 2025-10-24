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

    // 2. Fetch metadata from Dub.co
    let embedExternal = {};
    try {
        const dubResponse = await fetch(`https://api.dub.co/metatags?url=${encodeURIComponent(postData.trackUrl)}`);
        const dubData = await dubResponse.json();

        if (dubResponse.ok && dubData.title) {
            embedExternal = {
                $type: "app.bsky.embed.external",
                external: {
                    uri: postData.trackUrl,
                    title: dubData.title || postData.title,
                    description: dubData.description || `${postData.title} by ${postData.artist}`,
                    // We are not uploading the image blob for now, just passing the URL if available
                    // BlueSky might still unfurl a richer card with just title/description
                    ...(dubData.image && { thumb: { $type: "blob", ref: { $link: dubData.image }, mimeType: "image/jpeg", size: 0 } }) // Placeholder for thumb
                }
            };
        } else {
            console.warn('Failed to fetch metadata from Dub.co, using basic embed.', dubData);
            embedExternal = {
                $type: "app.bsky.embed.external",
                external: {
                    uri: postData.trackUrl,
                    title: postData.title,
                    description: `${postData.title} by ${postData.artist}`
                }
            };
        }
    } catch (error) {
        console.error('Error fetching metadata from Dub.co:', error);
        embedExternal = {
            $type: "app.bsky.embed.external",
            external: {
                uri: postData.trackUrl,
                title: postData.title,
                description: `${postData.title} by ${postData.artist}`
            }
        };
    }

    // 3. Create Post (Skeet)
    try {
        const postResponse = await fetch(`${pdsUrl}/xrpc/com.atproto.repo.createRecord`, {
            method: "POST",
            headers: {
                "Authorization": `Bearer ${accessJwt}`,
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                repo: blueskyHandle,
                collection: "app.bsky.feed.post",
                record: {
                    text: postData.text, // text is now fully constructed before being passed
                    createdAt: new Date().toISOString(),
                    embed: embedExternal // Use the dynamically created embed object
                }
            })
        });
        const postResult = await postResponse.json();
        if (!postResponse.ok) {
            console.error('BlueSky post failed:', postResult);
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
                tags += ' ' + message.data.tags;
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
