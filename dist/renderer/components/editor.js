import { Component, h } from '../core/component.js';
import { notesStore, foldersStore, currentNoteId, TAG_COLORS } from './state.js';
import { formatFullDate, getTagColor } from './utils.js';
export class Editor extends Component {
    constructor() {
        super(...arguments);
        this.saveTimer = null;
    }
    buildContent() {
        const id = currentNoteId.get();
        if (!id)
            return h('div', { id: 'editor-panel', class: 'hidden' }, null);
        const notes = notesStore.get();
        const note = notes.find((n) => n.id === id);
        if (!note)
            return h('div', { id: 'editor-panel', class: 'hidden' }, null);
        const folders = foldersStore.get();
        const noteTags = note.tags || [];
        return h('div', { id: 'editor-panel' }, null, h('div', { id: 'editor-toolbar' }, null, h('button', { id: 'editor-back-btn', class: 'editor-back-btn' }, {
            click: () => currentNoteId.set(null),
        }, h('span', null, null, '\u2190 Notes')), h('div', { class: 'editor-actions' }, null, this.favBtn(), h('button', {
            id: 'editor-delete-btn', class: 'editor-action-btn danger', title: 'Delete',
        }, { click: () => this.delete() }, SvgIcon('M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2', 'currentColor')))), h('div', { id: 'editor-content' }, null, h('div', {
            id: 'editor-title', contenteditable: 'true',
            placeholder: 'Title',
        }, { input: () => this.scheduleSave() }, note.title), h('div', { id: 'editor-date' }, null, formatFullDate(new Date(note.updatedAt))), h('div', { id: 'editor-tags' }, null, h('div', { id: 'editor-tags-list' }, null, ...noteTags.map((tag) => h('span', {
            class: 'editor-tag-chip',
            style: `background:${getTagColor(tag, folders)}`,
        }, { click: () => this.toggleTag(tag) }, tag, SvgIcon('M6 6l12 12M18 6l-12 12', 'white')))), h('button', { id: 'editor-add-tag-btn', class: 'editor-add-tag-btn' }, {
            click: (e) => { e.stopPropagation(); this.showTagPicker(); },
        }, '+'), h('div', { id: 'tag-dropdown', class: 'hidden' }, null)), h('div', {
            id: 'editor-body', contenteditable: 'true',
            placeholder: 'Start writing...',
        }, { input: () => this.scheduleSave() }, note.content)));
    }
    favBtn() {
        const id = currentNoteId.get();
        if (!id)
            return null;
        const notes = notesStore.get();
        const note = notes.find((n) => n.id === id);
        const fav = note?.favorite || false;
        return h('button', {
            id: 'editor-favorite-btn',
            class: 'editor-action-btn' + (fav ? ' favorited' : ''),
            title: fav ? 'Remove from Favorites' : 'Add to Favorites',
        }, { click: () => this.toggleFav() }, SvgIcon('M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z', fav ? 'currentColor' : 'none', fav ? 'currentColor' : 'currentColor'));
    }
    scheduleSave() {
        if (this.saveTimer)
            clearTimeout(this.saveTimer);
        this.saveTimer = setTimeout(() => this.save(), 500);
    }
    async save() {
        const id = currentNoteId.get();
        if (!id)
            return;
        const notes = notesStore.get();
        const note = notes.find((n) => n.id === id);
        if (!note)
            return;
        note.title = document.getElementById('editor-title')?.textContent || '';
        note.content = document.getElementById('editor-body')?.innerHTML || '';
        note.updatedAt = new Date().toISOString();
        const api = window.api;
        if (api?.saveNotes)
            await api.saveNotes(notes);
    }
    async delete() {
        const id = currentNoteId.get();
        if (!id)
            return;
        const notes = notesStore.get();
        const note = notes.find((n) => n.id === id);
        if (!note)
            return;
        note.deleted = true;
        note.updatedAt = new Date().toISOString();
        const api = window.api;
        if (api?.saveNotes)
            await api.saveNotes(notes);
        notesStore.set([...notes]);
        currentNoteId.set(null);
    }
    async toggleFav() {
        const id = currentNoteId.get();
        if (!id)
            return;
        const notes = notesStore.get();
        const note = notes.find((n) => n.id === id);
        if (!note)
            return;
        note.favorite = !note.favorite;
        note.updatedAt = new Date().toISOString();
        const api = window.api;
        if (api?.saveNotes)
            await api.saveNotes(notes);
        notesStore.set([...notes]);
    }
    async toggleTag(tag) {
        const id = currentNoteId.get();
        if (!id)
            return;
        const notes = notesStore.get();
        const note = notes.find((n) => n.id === id);
        if (!note)
            return;
        if (!note.tags)
            note.tags = [];
        const idx = note.tags.indexOf(tag);
        if (idx >= 0)
            note.tags.splice(idx, 1);
        else
            note.tags.push(tag);
        note.updatedAt = new Date().toISOString();
        const api = window.api;
        if (api?.saveNotes)
            await api.saveNotes(notes);
        notesStore.set([...notes]);
    }
    showTagPicker() {
        const id = currentNoteId.get();
        if (!id)
            return;
        const notes = notesStore.get();
        const note = notes.find((n) => n.id === id);
        const noteTags = note?.tags || [];
        const available = foldersStore.get().filter((f) => !noteTags.includes(f.name));
        const dd = document.getElementById('tag-dropdown');
        dd.innerHTML = '';
        dd.classList.remove('hidden');
        for (const f of available) {
            const item = h('button', { class: 'tag-dropdown-item' }, {
                click: (e) => { e.stopPropagation(); this.toggleTag(f.name); dd.classList.add('hidden'); },
            }, h('span', { class: 'tag-dropdown-item-dot', style: `background:${TAG_COLORS[f.color] || f.color}` }, null), f.name);
            dd.appendChild(item);
        }
        const newBtn = document.createElement('button');
        newBtn.className = 'tag-dropdown-item';
        if (available.length > 0) {
            newBtn.style.borderTop = '0.5px solid var(--separator)';
            newBtn.style.marginTop = '4px';
            newBtn.style.paddingTop = '8px';
        }
        newBtn.innerHTML = '<span style="font-size:16px;line-height:1;margin-right:4px">+</span>New Tag';
        newBtn.addEventListener('click', (e) => { e.stopPropagation(); dd.classList.add('hidden'); this.createTag(); });
        dd.appendChild(newBtn);
        const close = (ev) => { if (!dd.contains(ev.target)) {
            dd.classList.add('hidden');
            document.removeEventListener('click', close);
        } };
        setTimeout(() => document.addEventListener('click', close), 0);
    }
    async createTag() {
        const name = prompt('Tag name:');
        if (!name)
            return;
        const colors = Object.keys(TAG_COLORS);
        const folder = { id: Date.now().toString(36) + Math.random().toString(36).substr(2, 9), name: name.trim(), color: colors[foldersStore.get().length % colors.length], icon: 'tag' };
        foldersStore.set([...foldersStore.get(), folder]);
        const api = window.api;
        if (api?.saveFolders)
            await api.saveFolders(foldersStore.get());
    }
    onMount() {
        setTimeout(() => {
            document.getElementById('editor-title')?.focus();
            document.addEventListener('click', (e) => {
                const dd = document.getElementById('tag-dropdown');
                if (dd && !dd.classList.contains('hidden') && !e.target.closest('#tag-dropdown') && !e.target.closest('#editor-add-tag-btn')) {
                    dd.classList.add('hidden');
                }
            });
        }, 0);
    }
}
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
