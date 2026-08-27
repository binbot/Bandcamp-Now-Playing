const pdsUrl = 'https://bsky.social';

function decodeHtmlEntities(text) {
    return text.replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#39;/g, "'");
}

let blueskyAppPassword = null;
let blueskyHandle = null;
let blueskyReady = storageGet(['blueskyAppPassword', 'blueskyHandle']).then((result) => {
    blueskyAppPassword = result.blueskyAppPassword;
    blueskyHandle = result.blueskyHandle;
});

async function createBlueskySession(identifier, password) {
    try {
        const sessionResponse = await fetch(`${pdsUrl}/xrpc/com.atproto.server.createSession`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ identifier, password })
        });
        const data = await sessionResponse.json();
        if (!sessionResponse.ok) {
            return { ok: false, error: data.error || `Session creation failed (${sessionResponse.status})` };
        }
        return { ok: true, accessJwt: data.accessJwt, did: data.did, handle: data.handle };
    } catch (error) {
        return { ok: false, error: error.message || 'Network error' };
    }
}

async function postToBluesky(postData) {
    const session = await createBlueskySession(blueskyHandle, blueskyAppPassword);
    if (!session.ok) {
        return { ok: false, error: session.error || 'Bluesky authentication failed.' };
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
        const data = await postResponse.json().catch(() => ({}));
        if (!postResponse.ok) {
            return { ok: false, error: data.message || data.error || `Bluesky post failed (${postResponse.status})` };
        }
        return { ok: true, data };
    } catch (error) {
        return { ok: false, error: error.message || 'Network error posting to Bluesky.' };
    }
}

onMessage((message) => {
    if (message.type === "postNowPlaying" && message.network === "bluesky") {
        return (async () => {
            await blueskyReady;
            if (!blueskyAppPassword || !blueskyHandle) {
                const fresh = await storageGet(['blueskyAppPassword', 'blueskyHandle']);
                blueskyAppPassword = fresh.blueskyAppPassword;
                blueskyHandle = fresh.blueskyHandle;
                if (!blueskyAppPassword || !blueskyHandle) {
                    return { ok: false, error: 'Bluesky credentials not configured.' };
                }
            }
            const text = composeNowPlaying('bluesky', message.data, message.data.comment, message.data.tags);
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

            return postToBluesky({ text, facets, title: message.data.title, artist: message.data.artist, trackUrl: message.data.trackUrl });
        })();
    } else if (message.type === "saveBlueskyCredentials") {
        return (async () => {
            const result = await createBlueskySession(message.handle, message.appPassword);
            if (!result.ok) {
                return { ok: false, error: result.error };
            }
            blueskyAppPassword = message.appPassword;
            blueskyHandle = result.handle;
            api.storage.local.set({ blueskyAppPassword, blueskyHandle });
            return { ok: true, handle: result.handle };
        })();
    }
    return undefined;
});