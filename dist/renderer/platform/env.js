const _de = guessDE();
function guessDE() {
    try {
        const ua = navigator.userAgent.toLowerCase();
        if (ua.includes('gnome') || ua.includes('pantheon') || ua.includes('budgie'))
            return 'gnome';
        if (ua.includes('kde') || ua.includes('plasma'))
            return 'kde';
    }
    catch { }
    return 'other';
}
export function detectDesktop() {
    return _de;
}
export function isDarkMode() {
    try {
        return window.matchMedia('(prefers-color-scheme: dark)').matches;
    }
    catch {
        return false;
    }
}
export function getName() {
    const names = { gnome: 'GNOME', kde: 'KDE Plasma', other: 'Linux' };
    return names[_de];
}
export function getSystemFont() {
    if (_de === 'gnome')
        return "'Cantarell', system-ui, sans-serif";
    if (_de === 'kde')
        return "'Noto Sans', system-ui, sans-serif";
    return "system-ui, -apple-system, sans-serif";
}
export function getAccentColor() {
    try {
        return getComputedStyle(document.documentElement).getPropertyValue('--accent-color').trim() || '#007AFF';
    }
    catch {
        return '#007AFF';
    }
}
