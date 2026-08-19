window.bandcampNowPlaying = {};

function getNowPlaying() {
    let titleElem = document.querySelector('div[data-bind="text: currentTrack().title"]') ||
                    document.querySelector('.track_info .title') ||
                    document.querySelector('.trackTitle');
    let title = titleElem ? titleElem.textContent.trim() : '';

    let artistElem = document.querySelector('span[data-bind="text: currentTrack().artist"]') ||
                     document.querySelector('#name-section .artist') ||
                     document.querySelector('.artist') ||
                     document.querySelector('span[itemprop="byArtist"]') ||
                     document.querySelector('a.artist');
    let artist = artistElem ? artistElem.textContent.trim() : '';

    let trackUrl = window.location.href;

    window.bandcampNowPlaying = { title, artist, trackUrl, raw: `${title} by ${artist}` };

    return { title, artist, trackUrl, raw: `${title} by ${artist}` };
}

let lastRaw = null;

setInterval(() => {
    const nowPlaying = getNowPlaying();
    if (nowPlaying && nowPlaying.raw && nowPlaying.raw !== lastRaw) {
        lastRaw = nowPlaying.raw;
    }
}, 5000);

api.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.type === "getNowPlaying") {
        sendResponse(window.bandcampNowPlaying);
    }
});