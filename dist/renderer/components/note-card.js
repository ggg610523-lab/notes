import { h } from '../core/component.js';
import { notesStore, currentNoteId, foldersStore } from './state.js';
import { stripHtml, formatDate, getTagColor } from './utils.js';
function SvgIcon(path, fill, stroke, size = 16) {
    const ns = 'http://www.w3.org/2000/svg';
    const svg = document.createElementNS(ns, 'svg');
    svg.setAttribute('viewBox', '0 0 24 24');
    svg.setAttribute('width', String(size));
    svg.setAttribute('height', String(size));
    svg.setAttribute('fill', fill || 'none');
    svg.setAttribute('stroke', stroke || fill || 'currentColor');
    svg.setAttribute('stroke-width', '2');
    svg.setAttribute('stroke-linecap', 'round');
    svg.setAttribute('stroke-linejoin', 'round');
    const p = document.createElementNS(ns, 'path');
    p.setAttribute('d', path);
    svg.appendChild(p);
    return svg;
}
export class NoteCard {
    constructor(note) {
        this.note = note;
    }
    build() {
        const n = this.note;
        const tags = n.tags || [];
        const preview = stripHtml(n.content).substring(0, 120);
        const folders = foldersStore.get();
        const isActive = currentNoteId.get() === n.id;
        const card = h('div', {
            class: 'note-card' + (isActive ? ' active' : ''),
            'data-id': n.id,
        }, {
            click: () => this.openNote(n),
            contextmenu: (e) => this.showMenu(e, n),
        }, h('div', { class: 'note-card-title' }, null, n.title || 'New Note'), h('div', { class: 'note-card-preview' }, null, preview || 'No additional text'), h('div', { class: 'note-card-meta' }, null, h('span', { class: 'note-card-date' }, null, formatDate(new Date(n.updatedAt))), tags.length > 0
            ? h('span', { class: 'note-card-tag', style: `background:${getTagColor(tags[0], folders)}` }, null, tags[0])
            : null, n.favorite ? h('span', { class: 'note-card-fav' }, null, SvgIcon('M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z', '#FF2D55')) : null));
        requestAnimationFrame(() => card.classList.add('note-card-enter'));
        return card;
    }
    openNote(note) {
        currentNoteId.set(note.id);
    }
    showMenu(e, note) {
        e.preventDefault();
        this.removeMenus();
        const menu = h('div', { class: 'context-menu', style: `left:${e.clientX}px;top:${e.clientY}px` }, null, this.menuItem('Edit', 'M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z', () => currentNoteId.set(note.id)), this.menuItem(note.favorite ? 'Remove from Favorites' : 'Add to Favorites', 'M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z', () => { note.favorite = !note.favorite; note.updatedAt = new Date().toISOString(); this.saveAndRefresh(); }), this.menuItem('Delete', 'M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2', () => { note.deleted = true; note.updatedAt = new Date().toISOString(); this.saveAndRefresh(); if (currentNoteId.get() === note.id)
            currentNoteId.set(null); }, true));
        document.body.appendChild(menu);
        setTimeout(() => {
            document.addEventListener('click', () => this.removeMenus(), { once: true });
        }, 0);
    }
    menuItem(label, icon, action, danger = false) {
        return h('button', {
            class: 'context-menu-item' + (danger ? ' danger' : ''),
        }, {
            click: () => { action(); this.removeMenus(); },
        }, SvgIcon(icon, 'currentColor'), label);
    }
    removeMenus() {
        document.querySelectorAll('.context-menu').forEach((m) => m.remove());
    }
    async saveAndRefresh() {
        const api = window.api;
        if (api?.saveNotes)
            await api.saveNotes(notesStore.get());
        notesStore.set([...notesStore.get()]);
    }
}
