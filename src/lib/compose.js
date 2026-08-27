function composeNowPlaying(network, data, comment, tags) {
    const title = data.title || '';
    const artist = data.artist || '';
    const trackUrl = data.trackUrl || '';
    const hasComment = Boolean(comment && comment.trim());
    const normalizedTags = tags || '';
    let tagLine = '#nowplaying';
    if (normalizedTags) {
        tagLine += ' ' + normalizedTags;
    }

    if (network === 'bluesky') {
        let text = '';
        if (hasComment) text += comment.trim() + '\n\n';
        text += '\u{1F3B5} Now playing: ' + title;
        if (artist) text += ' by ' + artist;
        text += '\n\n' + tagLine + '\n\n' + trackUrl;
        return text;
    }
    let status = '';
    if (hasComment) status += comment.trim() + '\n\n';
    status += '\u{1F3B5} Now playing: ' + title;
    if (artist) status += ' by ' + artist;
    if (trackUrl) status += '\n' + trackUrl;
    status += '\n\n' + tagLine;
    return status;
}
