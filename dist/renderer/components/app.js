import { Component, h } from '../core/component.js';
import { notesStore, currentNoteId, currentView, currentTagFilter, darkMode, isMaximized } from './state.js';
import { detectDesktop } from '../platform/env.js';
import { Sidebar } from './sidebar.js';
import { NotesList } from './notes-list.js';
import { Editor } from './editor.js';
export class App extends Component {
    constructor() {
        super();
        this.sidebar = new Sidebar();
        this.notesList = new NotesList();
        this.editor = new Editor();
    }
    buildContent() {
        const de = detectDesktop();
        return h('div', { id: 'root' }, null, h('div', { class: 'titlebar' }, null, h('div', { class: 'titlebar-drag' }, null, h('span', { class: 'titlebar-label' }, null, 'Notes')), h('div', { class: 'win-controls', style: `flex-direction:${de === 'kde' ? 'row-reverse' : 'row'}` }, null, h('button', { class: 'wc-btn wc-btn-min', id: 'btn-minimize' }, {
            click: () => window.api?.windowMinimize(),
        }, SvgWin('M20 12H4')), h('button', { class: 'wc-btn wc-btn-max', id: 'btn-maximize' }, {
            click: () => this.toggleMax(),
        }, SvgWin('M12 5v14M5 12h14')), h('button', { class: 'wc-btn wc-btn-close', id: 'btn-close' }, {
            click: () => window.api?.windowClose(),
        }, SvgWin('M18 6L6 18M6 6l12 12')))), h('div', { id: 'app' }, null, this.sidebar.build(), h('div', { id: 'main-content' }, null, this.notesList.build(), this.editor.build())), h('div', { id: 'dialog-overlay', class: 'dialog-overlay hidden' }, null, h('div', { class: 'dialog' }, null, h('h3', { class: 'dialog-title', id: 'dialog-title' }, null, ''), h('input', { class: 'dialog-input', id: 'dialog-input', type: 'text', placeholder: '' }, null), h('div', { class: 'dialog-actions' }, null, h('button', { class: 'dialog-btn dialog-btn-cancel', id: 'dialog-cancel' }, null, 'Cancel'), h('button', { class: 'dialog-btn dialog-btn-confirm', id: 'dialog-confirm' }, null, 'OK')))));
    }
    onMount() {
        this.bindGlobalEvents();
        this.editor.onMount();
        darkMode.subscribe(() => {
            document.documentElement.classList.toggle('dark', darkMode.get());
            window.api?.saveSettings?.({ darkMode: darkMode.get() });
        });
    }
    toggleMax() {
        window.api?.windowMaximize();
        isMaximized.set(!isMaximized.get());
    }
    bindGlobalEvents() {
        document.addEventListener('keydown', (e) => {
            if ((e.metaKey || e.ctrlKey) && e.key === 'n') {
                e.preventDefault();
                this.createNote();
            }
            if ((e.metaKey || e.ctrlKey) && e.key === 'f') {
                e.preventDefault();
                document.getElementById('search-input')?.focus();
            }
            if (e.key === 'Escape') {
                if (currentNoteId.get())
                    currentNoteId.set(null);
            }
        });
        document.addEventListener('new-note', () => this.createNote());
        window.addEventListener('resize', () => {
            if (window.innerWidth > 900) {
                document.getElementById('sidebar')?.classList.remove('open');
                document.getElementById('sidebar-overlay')?.classList.remove('visible');
            }
        });
    }
    async createNote() {
        const note = {
            id: Date.now().toString(36) + Math.random().toString(36).substr(2, 9),
            title: '', content: '', folderId: 'all',
            favorite: false,
            tags: currentView.get() === 'tag' ? [currentTagFilter.get()] : [],
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
        };
        const notes = notesStore.get();
        notes.unshift(note);
        notesStore.set([...notes]);
        currentNoteId.set(note.id);
        const api = window.api;
        if (api?.saveNotes)
            api.saveNotes(notes);
    }
}
function SvgWin(path) {
    const ns = 'http://www.w3.org/2000/svg';
    const svg = document.createElementNS(ns, 'svg');
    svg.setAttribute('viewBox', '0 0 24 24');
    svg.setAttribute('width', '10');
    svg.setAttribute('height', '10');
    svg.setAttribute('fill', 'none');
    svg.setAttribute('stroke', 'currentColor');
    svg.setAttribute('stroke-width', '1.5');
    svg.setAttribute('stroke-linecap', 'round');
    svg.setAttribute('stroke-linejoin', 'round');
    const p = document.createElementNS(ns, 'path');
    p.setAttribute('d', path);
    svg.appendChild(p);
    return svg;
}
