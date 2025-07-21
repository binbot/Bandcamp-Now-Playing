// popup.js

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

document.getElementById('save').onclick = () => {
    const instance = document.getElementById('instance').value.trim();
    const token = document.getElementById('token').value.trim();
    if (instance && token) {
        chrome.runtime.sendMessage({
            type: "saveMastodonCredentials",
            instance,
            token
        });
        document.getElementById('status').textContent = "Saved!";
    } else {
        document.getElementById('status').textContent = "Please fill both fields.";
    }
};

// Load saved credentials
chrome.storage.local.get(['mastodonInstance', 'mastodonToken'], (result) => {
    if (result.mastodonInstance) document.getElementById('instance').value = result.mastodonInstance;
    if (result.mastodonToken) document.getElementById('token').value = result.mastodonToken;
});

// Get now playing info from the active tab
function fetchNowPlaying() {
    // Firefox uses "tabs" permission differently, but this works for MV3
    chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
        if (tabs.length === 0) return;
        chrome.tabs.sendMessage(tabs[0].id, {type: "getNowPlaying"}, function(response) {
            updateNowPlayingDisplay(response);
            window._nowPlaying = response;
        });
    });
}

document.getElementById('postnow').onclick = () => {
    if (window._nowPlaying && window._nowPlaying.title) {
        chrome.runtime.sendMessage({
            type: "postNowPlaying",
            data: window._nowPlaying
        });
        document.getElementById('poststatus').textContent = "Posted!";
    } else {
        document.getElementById('poststatus').textContent = "No track info to post.";
    }
};

fetchNowPlaying();
