const api = globalThis.browser ?? globalThis.chrome;
const usesPromises = typeof globalThis.browser !== 'undefined';

function onMessage(listener) {
    if (usesPromises) {
        return api.runtime.onMessage.addListener((message, sender) => {
            const result = listener(message, sender);
            return result && typeof result.then === 'function' ? result : undefined;
        });
    }
    return api.runtime.onMessage.addListener((message, sender, sendResponse) => {
        const result = listener(message, sender);
        if (result && typeof result.then === 'function') {
            result.then(sendResponse);
            return true;
        }
        return result;
    });
}

function sendMessage(message) {
    if (usesPromises) {
        return api.runtime.sendMessage(message);
    }
    return new Promise((resolve) => api.runtime.sendMessage(message, resolve));
}

function storageGet(keys) {
    if (usesPromises) {
        return api.storage.local.get(keys);
    }
    return new Promise((resolve) => api.storage.local.get(keys, resolve));
}