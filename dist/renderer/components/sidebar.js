import { Component, h } from '../core/component.js';
import { notesStore, foldersStore, currentView, currentTagFilter } from './state.js';
import { getName } from '../platform/env.js';
export class Sidebar extends Component {
    constructor() {
        super(...arguments);
        this.viewItems = [
            { id: 'all', label: 'All Notes', icon: 'M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z', color: '#007AFF' },
            { id: 'favorites', label: 'Favorites', icon: 'M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z', color: '#FF2D55' },
            { id: 'recent', label: 'Recently Deleted', icon: 'M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z', color: '#5AC8FA' },
        ];
    }
    buildContent() {
        const notes = notesStore.get();
        const folders = foldersStore.get();
        const view = currentView.get();
        const activeNotes = notes.filter((n) => !n.deleted);
        const active = notes.filter((n) => !n.deleted && !n.favorite);
        return h('div', { id: 'sidebar' }, null, h('div', { class: 'sidebar-header' }, null, h('h1', { class: 'sidebar-title' }, null, 'Notes'), h('span', { class: 'titlebar-label', style: 'display:block;font-size:11px;margin-top:2px;color:var(--label-tertiary);letter-spacing:0.05em;text-transform:uppercase' }, null, getName())), h('div', { class: 'sidebar-nav' }, null, h('div', { class: 'nav-group' }, null, ...this.viewItems.map((item) => h('button', {
            class: 'nav-item' + (view === item.id ? ' active' : ''),
            'data-view': item.id,
        }, { click: () => { currentView.set(item.id); currentTagFilter.set(''); } }, h('span', { class: 'nav-icon-wrap', style: `background:${item.color}` }, null, SvgIcon(item.icon, 'white', 14)), h('span', null, null, item.label), h('span', { class: 'nav-badge' }, null, String(item.id === 'recent' ? notes.filter((n) => n.deleted).length :
            item.id === 'favorites' ? activeNotes.filter((n) => n.favorite).length :
                activeNotes.length))))), folders.length > 0 ? h('div', { class: 'nav-group' }, null, h('div', { class: 'nav-group-label' }, null, 'Tags'), ...folders.map((f) => h('button', {
            class: 'nav-item' + (view === 'tag' && currentTagFilter.get() === f.name ? ' active' : ''),
            'data-view': 'tag',
        }, { click: () => { currentView.set('tag'); currentTagFilter.set(f.name); } }, h('span', { class: 'nav-icon-wrap', style: `background:${f.color}` }, null, SvgIcon('M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z', 'white', 14)), h('span', null, null, f.name), h('span', { class: 'nav-badge' }, null, String(active.filter((n) => (n.tags || []).includes(f.name)).length))))) : null));
    }
}
function SvgIcon(path, fill, size) {
    const ns = 'http://www.w3.org/2000/svg';
    const svg = document.createElementNS(ns, 'svg');
    svg.setAttribute('viewBox', '0 0 24 24');
    svg.setAttribute('width', String(size));
    svg.setAttribute('height', String(size));
    svg.setAttribute('fill', fill);
    svg.setAttribute('stroke', 'none');
    const p = document.createElementNS(ns, 'path');
    p.setAttribute('d', path);
    svg.appendChild(p);
    return svg;
}
