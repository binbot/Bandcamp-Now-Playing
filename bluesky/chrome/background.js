// background.js

function decodeHtmlEntities(text) {
    // Simple decode for common entities
    return text.replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#39;/g, "'");
}

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

    // 2. Fetch metadata from Bandcamp page
    let embedExternal = {};
    let thumbBlob = null;
    try {
        console.log('Fetching metadata from:', postData.trackUrl);
        const pageResponse = await fetch(postData.trackUrl);
        console.log('Page response status:', pageResponse.status);
        const html = await pageResponse.text();
        console.log('HTML length:', html.length);

        const titleMatch = html.match(/<meta property="og:title" content="([^"]*)"/i);
        const title = titleMatch ? decodeHtmlEntities(titleMatch[1]) : postData.title;
        const descMatch = html.match(/<meta property="og:description" content="([^"]*)"/i);
        const description = descMatch ? decodeHtmlEntities(descMatch[1]) : `${postData.title} by ${postData.artist}`;
        const imageMatch = html.match(/<meta property="og:image" content="([^"]*)"/i);
        const imageUrl = imageMatch ? imageMatch[1] : null;
        console.log('Extracted title:', title, 'desc:', description, 'image:', imageUrl);

        // Upload image if available
        if (imageUrl) {
            try {
                console.log('Fetching image:', imageUrl);
                const imageResponse = await fetch(imageUrl);
                console.log('Image response status:', imageResponse.status);
                const imageBlob = await imageResponse.blob();
                console.log('Image blob size:', imageBlob.size);
                const uploadResponse = await fetch(`${pdsUrl}/xrpc/com.atproto.repo.uploadBlob`, {
                    method: 'POST',
                    headers: { 'Authorization': `Bearer ${accessJwt}`, 'Content-Type': imageBlob.type },
                    body: imageBlob
                });
                const uploadData = await uploadResponse.json();
                console.log('Upload response:', uploadResponse.status, uploadData);
                if (uploadResponse.ok) {
                    thumbBlob = { $type: 'blob', ref: uploadData.blob.ref, mimeType: uploadData.blob.mimeType, size: uploadData.blob.size };
                }
            } catch (error) {
                console.error('Image upload failed:', error);
            }
        }

        embedExternal = {
            $type: "app.bsky.embed.external",
            external: {
                uri: postData.trackUrl,
                title,
                description,
                ...(thumbBlob && { thumb: thumbBlob })
            }
        };
        console.log('Embed created:', embedExternal);
        console.log('Thumb blob:', thumbBlob);
    } catch (error) {
        console.error('Error fetching metadata from Bandcamp:', error);
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
                repo: repo,
                collection: "app.bsky.feed.post",
                record: {
                    text: postData.text, // text is now fully constructed before being passed
                    createdAt: new Date().toISOString(),
                    facets: postData.facets || [],
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
            text += `\n\n${tags}\n\n${message.data.trackUrl}`;

            // Create facets for hashtags
            const facets = [];
            const encoder = new TextEncoder();
            const textBytes = encoder.encode(text);
            const tagRegex = /#(\w+)/g;
            let match;
            while ((match = tagRegex.exec(text)) !== null) {
                const byteStart = encoder.encode(text.substring(0, match.index)).length;
                const byteEnd = byteStart + encoder.encode(match[0]).length;
                facets.push({
                    "$type": "app.bsky.richtext.facet",
                    "features": [{ "$type": "app.bsky.richtext.facet#tag", "tag": match[1] }],
                    "index": { "byteStart": byteStart, "byteEnd": byteEnd }
                });
            }

            postToBluesky({ text, facets, title: message.data.title, artist: message.data.artist, trackUrl: message.data.trackUrl });
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
            console.log('Saved BlueSky credentials:', blueskyHandle, blueskyAppPassword ? '[password set]' : '[no password]');
        });
    }
});