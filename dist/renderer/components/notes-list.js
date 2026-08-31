import { Component, h } from '../core/component.js';
import { notesStore, currentView, currentTagFilter, searchQuery } from './state.js';
import { stripHtml } from './utils.js';
import { NoteCard } from './note-card.js';
export class NotesList extends Component {
    buildContent() {
        const notes = this.getFiltered();
        return h('div', { id: 'notes-list-panel' }, null, h('div', { id: 'toolbar' }, null, h('h2', { id: 'view-title' }, null, this.getTitle()), h('div', { class: 'toolbar-actions' }, null, h('div', { class: 'search-bar' }, null, ...this.searchInput(), h('input', {
            id: 'search-input', type: 'text', placeholder: 'Search',
            value: searchQuery.get(),
        }, { input: (e) => searchQuery.set(e.target.value.toLowerCase()) })), h('button', {
            id: 'new-note-btn', class: 'toolbar-btn', title: 'New Note (Ctrl+N)',
        }, { click: () => this.dispatchEvent('new-note') }, SvgIcon('M12 4v16m8-8H4', 'currentColor')))), h('div', { id: 'notes-container' }, null, notes.length === 0
            ? h('div', { class: 'empty-state', style: 'display:flex' }, null, h('div', { class: 'empty-icon' }, null, SvgIcon('M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2z', 'currentColor', 48)), h('h2', null, null, this.getEmptyTitle()), h('p', null, null, this.getEmptyText()))
            : null, ...notes.map((n) => new NoteCard(n).build())));
    }
    searchInput() {
        return [];
    }
    getFiltered() {
        const all = notesStore.get();
        let notes = currentView.get() === 'recent'
            ? all.filter((n) => n.deleted)
            : all.filter((n) => !n.deleted);
        if (currentView.get() === 'favorites')
            notes = notes.filter((n) => n.favorite);
        if (currentView.get() === 'tag' && currentTagFilter.get()) {
            notes = notes.filter((n) => (n.tags || []).includes(currentTagFilter.get()));
        }
        const q = searchQuery.get();
        if (q) {
            notes = notes.filter((n) => n.title.toLowerCase().includes(q) || stripHtml(n.content).toLowerCase().includes(q));
        }
        notes.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
        return notes;
    }
    getTitle() {
        if (currentView.get() === 'favorites')
            return 'Favorites';
        if (currentView.get() === 'recent')
            return 'Recently Deleted';
        if (currentView.get() === 'tag')
            return currentTagFilter.get() || 'Tags';
        return 'All Notes';
    }
    getEmptyTitle() {
        if (currentView.get() === 'recent')
            return 'No Recently Deleted';
        if (currentView.get() === 'favorites')
            return 'No Favorites';
        if (currentView.get() === 'tag')
            return 'No Notes with This Tag';
        if (searchQuery.get())
            return 'No Results';
        return 'No Notes';
    }
    getEmptyText() {
        if (searchQuery.get())
            return 'Try a different search';
        if (currentView.get() === 'recent')
            return 'Deleted notes appear here';
        return 'Create a new note to get started';
    }
    dispatchEvent(type) {
        this._el?.dispatchEvent(new CustomEvent(type, { bubbles: true }));
    }
}
function SvgIcon(path, fill, size = 16) {
    const ns = 'http://www.w3.org/2000/svg';
    const svg = document.createElementNS(ns, 'svg');
    svg.setAttribute('viewBox', '0 0 24 24');
    svg.setAttribute('width', String(size));
    svg.setAttribute('height', String(size));
    svg.setAttribute('fill', 'none');
    svg.setAttribute('stroke', fill);
    svg.setAttribute('stroke-width', '2');
    svg.setAttribute('stroke-linecap', 'round');
    svg.setAttribute('stroke-linejoin', 'round');
    const p = document.createElementNS(ns, 'path');
    p.setAttribute('d', path);
    svg.appendChild(p);
    return svg;
}
