function decodeHtmlEntities(text) {
    return text.replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#39;/g, "'");
}

let blueskyAppPassword = null;
let blueskyHandle = null;

api.storage.local.get(['blueskyAppPassword', 'blueskyHandle'], (result) => {
    blueskyAppPassword = result.blueskyAppPassword;
    blueskyHandle = result.blueskyHandle;
});

async function postToBluesky(postData) {
    const pdsUrl = 'https://bsky.social';

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
            return;
        }
    } catch (error) {
        return;
    }

    const accessJwt = session.accessJwt;
    const repo = session.did;

    let embedExternal = {};
    let thumbBlob = null;
    try {
        const pageResponse = await fetch(postData.trackUrl);
        const html = await pageResponse.text();

        const titleMatch = html.match(/<meta property="og:title" content="([^"]*)"/i);
        const title = titleMatch ? decodeHtmlEntities(titleMatch[1]) : postData.title;
        const descMatch = html.match(/<meta property="og:description" content="([^"]*)"/i);
        const description = descMatch ? decodeHtmlEntities(descMatch[1]) : `${postData.title} by ${postData.artist}`;
        const imageMatch = html.match(/<meta property="og:image" content="([^"]*)"/i);
        const imageUrl = imageMatch ? imageMatch[1] : null;

        if (imageUrl) {
            try {
                const imageResponse = await fetch(imageUrl);
                const imageBlob = await imageResponse.blob();
                const uploadResponse = await fetch(`${pdsUrl}/xrpc/com.atproto.repo.uploadBlob`, {
                    method: 'POST',
                    headers: { 'Authorization': `Bearer ${accessJwt}`, 'Content-Type': imageBlob.type },
                    body: imageBlob
                });
                const uploadData = await uploadResponse.json();
                if (uploadResponse.ok) {
                    thumbBlob = { $type: 'blob', ref: uploadData.blob.ref, mimeType: uploadData.blob.mimeType, size: uploadData.blob.size };
                }
            } catch (error) {}
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
    } catch (error) {
        embedExternal = {
            $type: "app.bsky.embed.external",
            external: {
                uri: postData.trackUrl,
                title: postData.title,
                description: `${postData.title} by ${postData.artist}`
            }
        };
    }

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
                    text: postData.text,
                    createdAt: new Date().toISOString(),
                    facets: postData.facets || [],
                    embed: embedExternal
                }
            })
        });
        await postResponse.json();
    } catch (error) {}
}

api.runtime.onMessage.addListener((message) => {
    if (message.type === "postNowPlaying") {
        if (blueskyAppPassword && blueskyHandle) {
            let text = '';
            if (message.data.comment) {
                text += message.data.comment + '\n\n';
            }
            text += `\u{1F3B5} Now playing: ${message.data.title}`;
            if (message.data.artist) text += ` by ${message.data.artist}`;

            let tags = '#nowplaying';
            if (message.data.tags) {
                const userTags = message.data.tags.split(' ').map(tag => `#${tag.trim()}`).join(' ');
                tags += ' ' + userTags;
            }
            text += `\n\n${tags}\n\n${message.data.trackUrl}`;

            const facets = [];
            const encoder = new TextEncoder();
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
        }
    } else if (message.type === "saveBlueskyCredentials") {
        blueskyAppPassword = message.appPassword;
        blueskyHandle = message.handle;
        api.storage.local.set({ blueskyAppPassword, blueskyHandle });
    }
});