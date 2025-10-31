document.addEventListener('DOMContentLoaded', () => {
    const desiredWidth = 400;
    const desiredHeight = 600; // Adjust as needed

    // Directly set body style for immediate effect
    document.body.style.width = `${desiredWidth}px`;
    document.body.style.height = `${desiredHeight}px`;

    // Use window.resizeTo as a secondary measure
    window.resizeTo(desiredWidth, desiredHeight);

    // Call fetchNowPlaying after sizing is applied
    fetchNowPlaying();
});

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
        // Hide auth after save
        setTimeout(() => {
            document.getElementById('authSection').style.display = 'none';
            document.getElementById('loggedInSection').style.display = 'block';
            document.getElementById('loggedInMessage').textContent = `Logged in to ${instance}`;
        }, 1000);
    } else {
        document.getElementById('status').textContent = "Please fill both fields.";
    }
};

document.getElementById('logout').onclick = () => {
    chrome.storage.local.remove(['mastodonInstance', 'mastodonToken'], () => {
        document.getElementById('authSection').style.display = 'block';
        document.getElementById('loggedInSection').style.display = 'none';
        document.getElementById('instance').value = '';
        document.getElementById('token').value = '';
        document.getElementById('status').textContent = "Logged out.";
    });
};

// Load saved credentials
chrome.storage.local.get(['mastodonInstance', 'mastodonToken'], (result) => {
    console.log('Loaded credentials:', result);
    if (result.mastodonInstance && result.mastodonToken) {
        // Hide auth, show logged in
        document.getElementById('authSection').style.display = 'none';
        document.getElementById('loggedInSection').style.display = 'block';
        document.getElementById('loggedInMessage').textContent = `Logged in to ${result.mastodonInstance}`;
    } else {
        if (result.mastodonInstance) document.getElementById('instance').value = result.mastodonInstance;
        if (result.mastodonToken) document.getElementById('token').value = result.mastodonToken;
    }
});

// Get now playing info from the active tab
function fetchNowPlaying() {
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
        const comment = document.getElementById('comment').value.trim();
        const tags = document.getElementById('tags').value.trim();
        chrome.runtime.sendMessage({
            type: "postNowPlaying",
            data: {
                ...window._nowPlaying,
                comment,
                tags
            }
        });
        document.getElementById('poststatus').textContent = "Posted!";
    } else {
        document.getElementById('poststatus').textContent = "No track info to post.";
    }
};

fetchNowPlaying();
