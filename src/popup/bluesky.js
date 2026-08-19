document.addEventListener('DOMContentLoaded', () => {
    const desiredWidth = 400;
    const desiredHeight = 600;

    document.body.style.width = `${desiredWidth}px`;
    document.body.style.height = `${desiredHeight}px`;

    window.resizeTo(desiredWidth, desiredHeight);

    fetchNowPlaying();
});

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
    const handle = document.getElementById('handle').value.trim();
    const appPassword = document.getElementById('appPassword').value.trim();
    if (handle && appPassword) {
        api.runtime.sendMessage({ type: "saveBlueskyCredentials", handle, appPassword });
        document.getElementById('status').textContent = "Saved!";
        setTimeout(() => {
            document.getElementById('authSection').style.display = 'none';
            document.getElementById('loggedInSection').style.display = 'block';
            document.getElementById('loggedInMessage').textContent = `Logged in as ${handle}`;
        }, 1000);
    } else {
        document.getElementById('status').textContent = "Please fill both fields.";
    }
};

document.getElementById('logout').onclick = () => {
    api.storage.local.remove(['blueskyHandle', 'blueskyAppPassword'], () => {
        document.getElementById('authSection').style.display = 'block';
        document.getElementById('loggedInSection').style.display = 'none';
        document.getElementById('handle').value = '';
        document.getElementById('appPassword').value = '';
        document.getElementById('status').textContent = "Logged out.";
    });
};

api.storage.local.get(['blueskyHandle', 'blueskyAppPassword'], (result) => {
    if (result.blueskyHandle && result.blueskyAppPassword) {
        document.getElementById('authSection').style.display = 'none';
        document.getElementById('loggedInSection').style.display = 'block';
        document.getElementById('loggedInMessage').textContent = `Logged in as ${result.blueskyHandle}`;
    } else {
        if (result.blueskyHandle) document.getElementById('handle').value = result.blueskyHandle;
        if (result.blueskyAppPassword) document.getElementById('appPassword').value = result.blueskyAppPassword;
    }
});

function fetchNowPlaying() {
    api.tabs.query({active: true, currentWindow: true}, function(tabs) {
        if (tabs.length === 0) return;
        api.tabs.sendMessage(tabs[0].id, {type: "getNowPlaying"}, function(response) {
            updateNowPlayingDisplay(response);
            window._nowPlaying = response;
        });
    });
}

document.getElementById('postnow').onclick = () => {
    if (window._nowPlaying && window._nowPlaying.title) {
        const comment = document.getElementById('comment').value.trim();
        const tags = document.getElementById('tags').value.trim();
        api.runtime.sendMessage({
            type: "postNowPlaying",
            data: { ...window._nowPlaying, comment, tags }
        });
        document.getElementById('poststatus').textContent = "Posted!";
    } else {
        document.getElementById('poststatus').textContent = "No track info to post.";
    }
};