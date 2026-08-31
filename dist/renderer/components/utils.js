import { TAG_COLORS } from './state.js';
export function genId() {
    return Date.now().toString(36) + Math.random().toString(36).substr(2, 9);
}
const stripDiv = document.createElement('div');
export function stripHtml(html) {
    stripDiv.innerHTML = html;
    return stripDiv.textContent || stripDiv.innerText || '';
}
export function escHtml(s) {
    return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&quot;').replace(/"/g, '&quot;');
}
export function formatDate(d) {
    const now = new Date();
    const startToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const startD = new Date(d.getFullYear(), d.getMonth(), d.getDate());
    const diff = Math.floor((startToday.getTime() - startD.getTime()) / 86400000);
    if (diff === 0)
        return d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
    if (diff === 1)
        return 'Yesterday';
    if (diff < 7)
        return d.toLocaleDateString('en-US', { weekday: 'long' });
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}
export function formatFullDate(d) {
    return d.toLocaleDateString('en-US', {
        month: 'long', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit',
    });
}
export function getTagColor(tagName, folders) {
    const f = folders.find((x) => x.name === tagName);
    return f ? (TAG_COLORS[f.color] || f.color) : '#8e8e93';
}
