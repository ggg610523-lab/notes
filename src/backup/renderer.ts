interface Note {
  id: string;
  title: string;
  content: string;
  folderId: string;
  favorite: boolean;
  tags: string[];
  deleted?: boolean;
  createdAt: string;
  updatedAt: string;
}

interface Folder {
  id: string;
  name: string;
  color: string;
  icon: string;
}

type SidebarView = 'all' | 'favorites' | 'recent' | 'tag';

const notesApi = (window as any).api as {
  windowMinimize: () => void;
  windowMaximize: () => void;
  windowClose: () => void;
  loadNotes: () => Promise<Note[]>;
  saveNotes: (notes: Note[]) => Promise<boolean>;
  loadFolders: () => Promise<Folder[]>;
  saveFolders: (folders: Folder[]) => Promise<boolean>;
  loadSettings: () => Promise<Record<string, any>>;
  saveSettings: (settings: Record<string, any>) => Promise<boolean>;
};

function escHtml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function genId(): string {
  return Date.now().toString(36) + Math.random().toString(36).substr(2, 9);
}

const _stripDiv = document.createElement('div');
function stripHtml(html: string): string {
  _stripDiv.innerHTML = html;
  return _stripDiv.textContent || _stripDiv.innerText || '';
}

// ===== Async Priority Scheduler =====
type Task = () => void;
class Scheduler {
  private high: Task[] = [];
  private low: Task[] = [];
  private raf = 0;
  private idleId: number | null = null;

  highPri(fn: Task): void {
    this.high.push(fn);
    if (!this.raf) this.raf = requestAnimationFrame(() => this.flushHigh());
  }

  lowPri(fn: Task): void {
    this.low.push(fn);
    if (this.idleId === null) {
      this.idleId = requestIdleCallback ? requestIdleCallback((dl) => this.flushLow(dl)) : (setTimeout as any)(fn, 50);
    }
  }

  private flushHigh(): void {
    this.raf = 0;
    const fns = this.high;
    this.high = [];
    for (const fn of fns) fn();
  }

  private flushLow(deadline: IdleDeadline): void {
    this.idleId = null;
    while (this.low.length > 0 && deadline.timeRemaining() > 0) {
      this.low.shift()!();
    }
    if (this.low.length > 0) this.idleId = requestIdleCallback((dl) => this.flushLow(dl));
  }
}

// ===== FPS Debug Overlay =====
class FpsDebug {
  private el: HTMLDivElement;
  private frames = 0;
  private lastTime = performance.now();
  private raf = 0;
  private visible = false;
  private avgFps = 0;
  private samples: number[] = [];

  constructor() {
    this.el = document.createElement('div');
    this.el.id = 'fps-debug';
    Object.assign(this.el.style, {
      position: 'fixed', bottom: '8px', right: '8px', zIndex: '9999',
      background: 'rgba(0,0,0,0.75)', color: '#0f0', padding: '4px 10px',
      borderRadius: '6px', font: '11px/1.4 monospace', display: 'none',
      pointerEvents: 'none', userSelect: 'none', whiteSpace: 'pre',
    });
    document.body.appendChild(this.el);

    document.addEventListener('keydown', (e: KeyboardEvent) => {
      if (e.key === 'F3') { this.toggle(); e.preventDefault(); }
    });
  }

  private toggle(): void {
    this.visible = !this.visible;
    this.el.style.display = this.visible ? 'block' : 'none';
    if (this.visible) this.start();
    else this.stop();
  }

  private start(): void {
    const tick = () => {
      this.frames++;
      const now = performance.now();
      const dt = now - this.lastTime;
      if (dt >= 500) {
        const fps = (this.frames / dt) * 1000;
        this.samples.push(fps);
        if (this.samples.length > 60) this.samples.shift();
        this.avgFps = this.samples.reduce((a, b) => a + b, 0) / this.samples.length;
        const mem = (performance as any).memory;
        this.el.textContent =
          `FPS: ${fps.toFixed(1)}\n` +
          `Avg: ${this.avgFps.toFixed(1)}\n` +
          (mem ? `Mem: ${(mem.usedJSHeapSize / 1048576).toFixed(1)} MB` : '');
        this.frames = 0;
        this.lastTime = now;
      }
      this.raf = requestAnimationFrame(tick);
    };
    this.lastTime = performance.now();
    this.frames = 0;
    this.raf = requestAnimationFrame(tick);
  }

  private stop(): void {
    cancelAnimationFrame(this.raf);
    this.el.textContent = '';
  }
}

const TAG_COLORS: Record<string, string> = {
  red: '#FF3B30',
  orange: '#FF9500',
  yellow: '#FFD60A',
  green: '#34C759',
  mint: '#00C7BE',
  teal: '#5AC8FA',
  blue: '#007AFF',
  indigo: '#5856D6',
  purple: '#AF52DE',
  pink: '#FF2D55',
};

class NotesApp {
  private notes: Note[] = [];
  private filteredNotes: Note[] = [];
  private folders: Folder[] = [];
  private currentView: SidebarView = 'all';
  private currentTagFilter: string = '';
  private searchQuery = '';
  private currentNoteId: string | null = null;
  private isMaximized = false;
  private saveTimer: ReturnType<typeof setTimeout> | null = null;
  private mq: MediaQueryList;
  private dirtyFlags = 0;
  private flushRaf = 0;
  private static readonly DF_FILTER = 1;
  private static readonly DF_SAVE = 2;
  private mqRaf: number | null = null;
  private sched = new Scheduler();
  private cardMap = new Map<string, HTMLElement>();

  private notesList!: HTMLElement;
  private emptyNotes!: HTMLElement;
  private viewTitle!: HTMLElement;
  private searchInput!: HTMLInputElement;
  private editorPanel!: HTMLElement;
  private editorTitle!: HTMLElement;
  private editorBody!: HTMLElement;
  private editorDate!: HTMLElement;
  private editorFavIcon!: SVGPathElement;
  private editorFavBtn!: HTMLElement;
  private tagsList!: HTMLElement;
  private editorTagsList!: HTMLElement;
  private tagDropdown!: HTMLElement;
  private allCount!: HTMLElement;
  private favoritesCount!: HTMLElement;
  private trashCount!: HTMLElement;
  private btnMaximize!: HTMLElement;
  private darkMode = false;
  private dialogResolve: ((val: string | null) => void) | null = null;

  constructor() {
    this.cacheElements();
    this.bindEvents();
    this.loadSettings();
    this.loadData();

    this.mq = window.matchMedia('(max-width: 900px)');
    this.updateMobileMode(this.mq.matches);
    this.mq.addEventListener('change', this.onMqChange);

    new FpsDebug();
  }

  private onMqChange = (e: MediaQueryListEvent): void => {
    if (this.mqRaf !== null) cancelAnimationFrame(this.mqRaf);
    this.mqRaf = requestAnimationFrame(() => {
      this.updateMobileMode(e.matches);
      this.mqRaf = null;
    });
  };

  private updateMobileMode(mobile: boolean): void {
    document.getElementById('root')!.classList.toggle('mobile', mobile);
    if (!mobile) this.closeSidebar();
  }

  private cacheElements(): void {
    this.notesList = document.getElementById('notes-list')!;
    this.emptyNotes = document.getElementById('empty-notes')!;
    this.viewTitle = document.getElementById('view-title')!;
    this.searchInput = document.getElementById('search-input') as HTMLInputElement;
    this.editorPanel = document.getElementById('editor-panel')!;
    this.editorTitle = document.getElementById('editor-title')!;
    this.editorBody = document.getElementById('editor-body')!;
    this.editorDate = document.getElementById('editor-date')!;
    this.editorFavIcon = document.getElementById('editor-fav-icon')!.querySelector('path') as SVGPathElement;
    this.editorFavBtn = document.getElementById('editor-favorite-btn')!;
    this.tagsList = document.getElementById('tags-list')!;
    this.editorTagsList = document.getElementById('editor-tags-list')!;
    this.tagDropdown = document.getElementById('tag-dropdown')!;
    this.allCount = document.getElementById('all-count')!;
    this.favoritesCount = document.getElementById('favorites-count')!;
    this.trashCount = document.getElementById('trash-count')!;
    this.btnMaximize = document.getElementById('btn-maximize')!;
  }

  private showInputDialog(title: string, placeholder: string, confirmText: string): Promise<string | null> {
    return new Promise((resolve) => {
      this.dialogResolve = resolve;
      document.getElementById('dialog-title')!.textContent = title;
      const input = document.getElementById('dialog-input') as HTMLInputElement;
      input.placeholder = placeholder;
      input.value = '';
      document.getElementById('dialog-confirm')!.textContent = confirmText;
      document.getElementById('dialog-overlay')!.classList.remove('hidden');
      setTimeout(() => input.focus(), 100);
      input.onkeydown = (e) => {
        if (e.key === 'Enter') this.confirmDialog();
        if (e.key === 'Escape') this.cancelDialog();
      };
    });
  }

  private confirmDialog(): void {
    const input = document.getElementById('dialog-input') as HTMLInputElement;
    const val = input.value.trim() || null;
    document.getElementById('dialog-overlay')!.classList.add('hidden');
    this.dialogResolve?.(val);
    this.dialogResolve = null;
  }

  private cancelDialog(): void {
    document.getElementById('dialog-overlay')!.classList.add('hidden');
    this.dialogResolve?.(null);
    this.dialogResolve = null;
  }

  private bindEvents(): void {
    document.querySelectorAll('.nav-item[data-view]').forEach((btn) => {
      btn.addEventListener('click', () => {
        this.switchView((btn as HTMLElement).dataset.view as SidebarView);
        this.closeSidebar();
      });
    });

    document.getElementById('hamburger-btn')!.addEventListener('click', () => {
      document.getElementById('sidebar')!.classList.toggle('open');
      document.getElementById('sidebar-overlay')!.classList.toggle('visible');
    });

    document.getElementById('sidebar-overlay')!.addEventListener('click', () => this.closeSidebar());

    this.searchInput.addEventListener('input', () => {
      this.searchQuery = this.searchInput.value.toLowerCase();
      this.markDirty(NotesApp.DF_FILTER);
    });

    document.getElementById('new-note-btn')!.addEventListener('click', () => this.createNote());
    document.getElementById('editor-back-btn')!.addEventListener('click', () => this.closeEditor().then());
    this.editorFavBtn.addEventListener('click', () => this.toggleFavorite());
    document.getElementById('editor-delete-btn')!.addEventListener('click', () => this.deleteCurrentNote());
    document.getElementById('add-tag-btn')!.addEventListener('click', () => this.createTag());
    document.getElementById('dark-mode-toggle')!.addEventListener('click', () => this.toggleDarkMode());

    this.editorTitle.addEventListener('input', () => this.markDirty(NotesApp.DF_SAVE));
    this.editorBody.addEventListener('input', () => this.markDirty(NotesApp.DF_SAVE));

    document.getElementById('btn-minimize')!.addEventListener('click', () => notesApi.windowMinimize());
    document.getElementById('btn-maximize')!.addEventListener('click', () => this.toggleMaximize());
    document.getElementById('btn-close')!.addEventListener('click', async () => {
      if (this.saveTimer) clearTimeout(this.saveTimer);
      await this.saveCurrentNote();
      notesApi.windowClose();
    });

    document.addEventListener('keydown', (e) => this.handleKeyboard(e));
    document.getElementById('editor-add-tag-btn')!.addEventListener('click', (e) => {
      e.stopPropagation();
      this.showTagDropdown();
    });
    document.addEventListener('click', () => this.tagDropdown.classList.add('hidden'));

    document.getElementById('dialog-confirm')!.addEventListener('click', () => this.confirmDialog());
    document.getElementById('dialog-cancel')!.addEventListener('click', () => this.cancelDialog());
    document.getElementById('dialog-overlay')!.addEventListener('click', (e) => {
      if (e.target === e.currentTarget) this.cancelDialog();
    });

    window.addEventListener('beforeunload', () => this.saveCurrentNote());
  }

  private async loadData(): Promise<void> {
    try {
      this.notes = await notesApi.loadNotes();
      this.folders = await notesApi.loadFolders();
      this.renderTags();
      this.applyFilters();
      this.renderNotesList(true);
      this.updateCounts();
    } catch (err) {
      console.error('[renderer] load error:', err);
    }
  }

  private async loadSettings(): Promise<void> {
    try {
      const settings = await notesApi.loadSettings();
      this.darkMode = settings.darkMode || false;
      this.applyDarkMode();
    } catch (err) {
      console.error('[renderer] load settings error:', err);
    }
  }

  private async toggleDarkMode(): Promise<void> {
    this.darkMode = !this.darkMode;
    this.applyDarkMode();
    await notesApi.saveSettings({ darkMode: this.darkMode });
  }

  private applyDarkMode(): void {
    document.documentElement.classList.toggle('dark', this.darkMode);
    const badge = document.getElementById('dark-mode-badge');
    if (badge) badge.textContent = this.darkMode ? 'On' : 'Off';
  }

  private async saveData(): Promise<void> {
    try {
      await notesApi.saveNotes(this.notes);
    } catch (err) {
      console.error('[renderer] save error:', err);
    }
  }

  private markDirty(flags: number): void {
    this.dirtyFlags |= flags;
    if (!this.flushRaf) {
      this.flushRaf = requestAnimationFrame(() => this.flush());
    }
  }

  private flush(): void {
    this.flushRaf = 0;
    const f = this.dirtyFlags;
    this.dirtyFlags = 0;
    if (f & NotesApp.DF_FILTER) this.applyFilters();
    if (f & NotesApp.DF_SAVE) {
      if (this.saveTimer) clearTimeout(this.saveTimer);
      this.saveTimer = setTimeout(() => this.saveCurrentNote(), 200);
    }
  }

  private updateCounts(): void {
    this.sched.lowPri(() => {
      const activeNotes = this.notes.filter((n) => !n.deleted);
      this.allCount.textContent = String(activeNotes.length);
      this.favoritesCount.textContent = String(activeNotes.filter((n) => n.favorite).length);
      this.trashCount.textContent = String(this.notes.filter((n) => n.deleted).length);
    });
  }

  private applyFilters(): void {
    let notes = this.notes;

    if (this.currentView === 'recent') {
      notes = notes.filter((n) => n.deleted);
    } else {
      notes = notes.filter((n) => !n.deleted);
      if (this.currentView === 'favorites') {
        notes = notes.filter((n) => n.favorite);
      } else if (this.currentView === 'tag' && this.currentTagFilter) {
        notes = notes.filter((n) => (n.tags || []).includes(this.currentTagFilter));
      }
    }

    if (this.searchQuery) {
      notes = notes.filter((n) =>
        n.title.toLowerCase().includes(this.searchQuery) ||
        stripHtml(n.content).toLowerCase().includes(this.searchQuery)
      );
    }

    notes.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
    this.filteredNotes = notes;
    this.renderNotesList();
  }

  private renderNotesList(animate = false): void {
    const filtered = this.filteredNotes;
    if (filtered.length === 0) {
      this.notesList.style.display = 'none';
      this.emptyNotes.style.display = 'flex';
      this.cardMap.forEach((el) => { el.remove(); this.cardMap.delete(el.dataset.id!); });
      return;
    }
    this.emptyNotes.style.display = 'none';
    this.notesList.style.display = '';

    const keep = new Set(filtered.map(n => n.id));
    for (const [id, el] of this.cardMap) {
      if (!keep.has(id)) { el.remove(); this.cardMap.delete(id); }
    }

    const frag = document.createDocumentFragment();
    const newCards: HTMLElement[] = [];
    for (const note of filtered) {
      let el = this.cardMap.get(note.id);
      if (!el) {
        el = this.createNoteCard(note);
        this.cardMap.set(note.id, el);
        if (animate) {
          el.classList.add('note-card-enter');
          newCards.push(el);
        }
      }
      frag.appendChild(el);
    }

    this.notesList.textContent = '';
    this.notesList.appendChild(frag);

    if (animate && newCards.length > 0) {
      this.sched.highPri(() => {
        for (const el of newCards) el.classList.add('note-card-enter-active');
      });
    }
  }

  private createNoteCard(note: Note): HTMLElement {
    const el = document.createElement('div');
    el.className = 'note-card' + (note.id === this.currentNoteId ? ' active' : '');
    el.dataset.id = note.id;

    const tags = note.tags || [];
    const preview = stripHtml(note.content).substring(0, 120);
    const date = this.formatDate(new Date(note.updatedAt));
    const tagHtml = tags.length > 0
      ? `<span class="note-card-tag" style="background:${TAG_COLORS[tags[0]] || '#8e8e93'}">${escHtml(tags[0])}</span>`
      : '';
    const favHtml = note.favorite
      ? `<svg class="note-card-fav" viewBox="0 0 24 24" fill="#FF2D55" stroke="none" width="12" height="12"><path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/></svg>`
      : '';

    el.innerHTML = `
      <div class="note-card-title">${escHtml(note.title) || 'New Note'}</div>
      <div class="note-card-preview">${escHtml(preview) || 'No additional text'}</div>
      <div class="note-card-meta">
        <span class="note-card-date">${date}</span>
        ${tagHtml}
        ${favHtml}
      </div>
    `;

    el.addEventListener('click', () => this.openNote(note));
    el.addEventListener('contextmenu', (e) => { e.preventDefault(); this.showContextMenu(e, note); });

    return el;
  }

  private async createNote(): Promise<void> {
    const note: Note = {
      id: genId(),
      title: '',
      content: '',
      folderId: 'all',
      favorite: false,
      tags: this.currentView === 'tag' && this.currentTagFilter ? [this.currentTagFilter] : [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    this.notes.unshift(note);
    await this.saveData();
    this.openNote(note);
    this.applyFilters();
    this.updateCounts();
    this.editorTitle.focus();
  }

  private openNote(note: Note): void {
    this.currentNoteId = note.id;
    this.editorTitle.textContent = note.title;
    this.editorBody.innerHTML = note.content;
    this.editorDate.textContent = this.formatFullDate(new Date(note.updatedAt));
    this.editorPanel.classList.remove('hidden');
    this.updateEditorFavBtn();
    this.renderEditorTags();
    this.activateNoteCard(note.id);
  }

  private activateNoteCard(id: string): void {
    for (const [, el] of this.cardMap) {
      el.classList.toggle('active', el.dataset.id === id);
    }
  }

  private async closeEditor(): Promise<void> {
    if (this.saveTimer) clearTimeout(this.saveTimer);
    await this.saveCurrentNote();
    this.currentNoteId = null;
    this.editorPanel.classList.add('hidden');
    this.editorTitle.textContent = '';
    this.editorBody.innerHTML = '';
    this.editorTagsList.innerHTML = '';
    this.activateNoteCard('');
  }

  private async saveCurrentNote(): Promise<void> {
    if (!this.currentNoteId) return;
    const note = this.notes.find((n) => n.id === this.currentNoteId);
    if (!note) return;
    note.title = this.editorTitle.textContent || '';
    note.content = this.editorBody.innerHTML;
    note.updatedAt = new Date().toISOString();
    await this.saveData();
    this.updateNoteCardInPlace(note);
    this.updateCounts();
  }

  private updateNoteCardInPlace(note: Note): void {
    const el = this.cardMap.get(note.id);
    if (!el) return;
    const titleEl = el.querySelector('.note-card-title');
    const previewEl = el.querySelector('.note-card-preview');
    const dateEl = el.querySelector('.note-card-date');
    if (titleEl) titleEl.textContent = note.title || 'New Note';
    if (previewEl) previewEl.textContent = stripHtml(note.content).substring(0, 120) || 'No additional text';
    if (dateEl) dateEl.textContent = this.formatDate(new Date(note.updatedAt));
  }

  private async toggleFavorite(): Promise<void> {
    if (!this.currentNoteId) return;
    const note = this.notes.find((n) => n.id === this.currentNoteId);
    if (!note) return;
    note.favorite = !note.favorite;
    note.updatedAt = new Date().toISOString();
    await this.saveData();
    this.updateEditorFavBtn();
    this.applyFilters();
    this.updateCounts();
    this.showToast(note.favorite ? 'Added to Favorites' : 'Removed from Favorites');
  }

  private updateEditorFavBtn(): void {
    const note = this.notes.find((n) => n.id === this.currentNoteId);
    if (!note) return;
    const fav = note.favorite;
    this.editorFavBtn.classList.toggle('favorited', fav);
    if (this.editorFavIcon) {
      this.editorFavIcon.setAttribute('fill', fav ? 'currentColor' : 'none');
      this.editorFavIcon.setAttribute('stroke', fav ? 'currentColor' : 'currentColor');
    }
  }

  private async deleteCurrentNote(): Promise<void> {
    if (!this.currentNoteId) return;
    const note = this.notes.find((n) => n.id === this.currentNoteId);
    if (!note) return;
    note.deleted = true;
    note.updatedAt = new Date().toISOString();
    await this.saveData();
    await this.closeEditor();
    this.applyFilters();
    this.updateCounts();
    this.showToast('Note deleted');
  }

  private switchView(view: SidebarView): void {
    this.currentView = view;
    if (view !== 'tag') this.currentTagFilter = '';
    document.querySelectorAll('.nav-item[data-view]').forEach((b) => {
      b.classList.toggle('active', (b as HTMLElement).dataset.view === view && !(b as HTMLElement).dataset.tag);
    });
    const titles: Record<string, string> = {
      all: 'All Notes',
      favorites: 'Favorites',
      recent: 'Recently Deleted',
      tag: this.currentTagFilter || 'Tags',
    };
    this.viewTitle.textContent = titles[view] || 'All Notes';
    this.applyFilters();
  }

  private closeSidebar(): void {
    document.getElementById('sidebar')!.classList.remove('open');
    document.getElementById('sidebar-overlay')!.classList.remove('visible');
  }

  private toggleMaximize(): void {
    notesApi.windowMaximize();
    this.isMaximized = !this.isMaximized;
    this.btnMaximize.classList.toggle('maximized', this.isMaximized);
  }

  private async createTag(): Promise<void> {
    const name = await this.showInputDialog('New Tag', 'Tag name', 'Create');
    if (!name) return;
    const colors = Object.keys(TAG_COLORS);
    const color = colors[this.folders.length % colors.length];
    const folder: Folder = { id: genId(), name: name.trim(), color, icon: 'tag' };
    this.folders.push(folder);
    await notesApi.saveFolders(this.folders);
    this.renderTags();
    this.showToast(`Tag "${name.trim()}" created`);
  }

  private renderTags(): void {
    this.sched.lowPri(() => {
      this.tagsList.innerHTML = '';
      for (const folder of this.folders) {
        const btn = document.createElement('button');
        btn.className = 'nav-item';
        btn.dataset.view = 'tag';
        btn.dataset.tag = folder.id;
        if (this.currentView === 'tag' && this.currentTagFilter === folder.id) {
          btn.classList.add('active');
        }
        const count = this.notes.filter((n) => !n.deleted && (n.tags || []).includes(folder.name)).length;
        btn.innerHTML = `
          <span class="nav-icon-wrap" style="background:${folder.color}">
            <svg viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" width="14" height="14"><path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z"/><circle cx="7" cy="7" r="1" fill="white"/></svg>
          </span>
          <span>${escHtml(folder.name)}</span>
          <span class="nav-badge">${count}</span>
        `;
        btn.addEventListener('click', () => {
          this.currentView = 'tag';
          this.currentTagFilter = folder.name;
          document.querySelectorAll('.nav-item[data-view]').forEach((el) => el.classList.remove('active'));
          btn.classList.add('active');
          this.viewTitle.textContent = folder.name;
          this.applyFilters();
          this.closeSidebar();
        });
        btn.addEventListener('contextmenu', (e) => {
          e.preventDefault();
          this.removeContextMenu();
          const menu = document.createElement('div');
          menu.className = 'context-menu';
          menu.style.left = `${e.clientX}px`;
          menu.style.top = `${e.clientY}px`;
          menu.innerHTML = `<button class="context-menu-item danger"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="16" height="16"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg> Delete Tag</button>`;
          menu.querySelector('button')!.addEventListener('click', async () => {
            this.removeContextMenu();
            if (!await this.showInputDialog('Delete Tag', `Type "delete" to confirm`, 'Delete')) return;
            const val = (document.getElementById('dialog-input') as HTMLInputElement).value.trim();
            if (val !== 'delete') { this.showToast('Type "delete" to confirm'); return; }
            for (const n of this.notes) {
              if (n.tags) {
                const i = n.tags.indexOf(folder.name);
                if (i >= 0) n.tags.splice(i, 1);
              }
            }
            this.folders = this.folders.filter((f) => f.id !== folder.id);
            await notesApi.saveFolders(this.folders);
            await this.saveData();
            if (this.currentView === 'tag' && this.currentTagFilter === folder.name) {
              this.switchView('all');
            }
            this.renderTags();
            if (this.currentNoteId) this.renderEditorTags();
            this.applyFilters();
            this.updateCounts();
            this.showToast(`Tag "${folder.name}" deleted`);
          });
          document.body.appendChild(menu);
          setTimeout(() => {
            const close = (ev: MouseEvent) => {
              if (!menu.contains(ev.target as Node)) { this.removeContextMenu(); document.removeEventListener('click', close); }
            };
            document.addEventListener('click', close);
          }, 0);
        });
        this.tagsList.appendChild(btn);
      }
    });
  }

  private renderEditorTags(): void {
    if (!this.currentNoteId) { this.editorTagsList.innerHTML = ''; return; }
    const note = this.notes.find((n) => n.id === this.currentNoteId);
    if (!note) { this.editorTagsList.innerHTML = ''; return; }
    const noteTags = note.tags || [];
    this.editorTagsList.innerHTML = '';
    for (const tag of noteTags) {
      const folder = this.folders.find((f) => f.name === tag);
      const color = folder ? folder.color : '#8e8e93';
      const chip = document.createElement('span');
      chip.className = 'editor-tag-chip';
      chip.style.background = TAG_COLORS[color] || color;
      chip.innerHTML = `${escHtml(tag)}<svg viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2.5"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>`;
      chip.title = 'Remove tag';
      chip.addEventListener('click', (e) => {
        e.stopPropagation();
        this.toggleNoteTag(tag);
      });
      this.editorTagsList.appendChild(chip);
    }
  }

  private showTagDropdown(): void {
    this.tagDropdown.innerHTML = '';
    const available = this.folders.filter((f) => !(this.notes.find((n) => n.id === this.currentNoteId)?.tags || []).includes(f.name));
    for (const folder of available) {
      const item = document.createElement('button');
      item.className = 'tag-dropdown-item';
      item.innerHTML = `<span class="tag-dropdown-item-dot" style="background:${TAG_COLORS[folder.color] || folder.color}"></span>${escHtml(folder.name)}`;
      item.addEventListener('click', (e) => {
        e.stopPropagation();
        this.toggleNoteTag(folder.name);
        this.tagDropdown.classList.add('hidden');
      });
      this.tagDropdown.appendChild(item);
    }
    const newBtn = document.createElement('button');
    newBtn.className = 'tag-dropdown-item';
    newBtn.style.borderTop = available.length > 0 ? '0.5px solid var(--separator)' : '';
    newBtn.style.marginTop = available.length > 0 ? '4px' : '';
    newBtn.style.paddingTop = available.length > 0 ? '8px' : '';
    newBtn.innerHTML = `<span style="font-size:16px;line-height:1;margin-right:4px">+</span>New Tag`;
    newBtn.addEventListener('click', async (e) => {
      e.stopPropagation();
      this.tagDropdown.classList.add('hidden');
      await this.createTag();
      if (this.currentNoteId) this.renderEditorTags();
    });
    this.tagDropdown.appendChild(newBtn);
    this.tagDropdown.classList.remove('hidden');
  }

  private async toggleNoteTag(tagName: string): Promise<void> {
    if (!this.currentNoteId) return;
    const note = this.notes.find((n) => n.id === this.currentNoteId);
    if (!note) return;
    if (!note.tags) note.tags = [];
    const idx = note.tags.indexOf(tagName);
    if (idx >= 0) note.tags.splice(idx, 1);
    else note.tags.push(tagName);
    note.updatedAt = new Date().toISOString();
    await this.saveData();
    this.renderEditorTags();
    this.renderTags();
    this.updateCounts();
  }

  private showContextMenu(e: MouseEvent, note: Note): void {
    this.removeContextMenu();
    const menu = document.createElement('div');
    menu.className = 'context-menu';
    menu.style.left = `${e.clientX}px`;
    menu.style.top = `${e.clientY}px`;
    const fav = note.favorite;
    menu.innerHTML = `
      <button class="context-menu-item" data-action="open"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="16" height="16"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg> Edit</button>
      <button class="context-menu-item" data-action="fav"><svg viewBox="0 0 24 24" fill="${fav ? 'currentColor' : 'none'}" stroke="currentColor" stroke-width="2" width="16" height="16"><path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/></svg> ${fav ? 'Remove from Favorites' : 'Add to Favorites'}</button>
      <button class="context-menu-item danger" data-action="delete"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="16" height="16"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg> Delete</button>
    `;
    menu.querySelectorAll('.context-menu-item').forEach((item) => {
      item.addEventListener('click', async () => {
        const action = (item as HTMLElement).dataset.action;
        if (action === 'open') this.openNote(note);
        else if (action === 'fav') {
          note.favorite = !note.favorite;
          note.updatedAt = new Date().toISOString();
          await this.saveData();
          this.applyFilters();
          this.updateCounts();
          if (this.currentNoteId === note.id) this.updateEditorFavBtn();
        } else if (action === 'delete') {
          note.deleted = true;
          note.updatedAt = new Date().toISOString();
          await this.saveData();
          if (this.currentNoteId === note.id) await this.closeEditor();
          this.applyFilters();
          this.updateCounts();
          this.showToast('Note deleted');
        }
        this.removeContextMenu();
      });
    });
    document.body.appendChild(menu);
    const close = (ev: MouseEvent) => {
      if (!menu.contains(ev.target as Node)) { this.removeContextMenu(); document.removeEventListener('click', close); }
    };
    setTimeout(() => document.addEventListener('click', close), 0);
  }

  private removeContextMenu(): void {
    document.querySelectorAll('.context-menu').forEach((m) => m.remove());
  }

  private handleKeyboard(e: KeyboardEvent): void {
    const isEditing = (e.target as HTMLElement).contentEditable === 'true' || (e.target as HTMLElement).tagName === 'INPUT';

    if ((e.metaKey || e.ctrlKey) && e.key === 'n') {
      e.preventDefault();
      this.createNote();
      return;
    }

    if ((e.metaKey || e.ctrlKey) && e.key === 'f') {
      e.preventDefault();
      this.searchInput.focus();
      return;
    }

    if (!isEditing && !this.editorPanel.classList.contains('hidden')) {
      if (e.key === 'Escape') this.closeEditor();
    } else if (!isEditing && e.key === 'Escape') {
      this.searchInput.value = '';
      this.searchQuery = '';
      this.applyFilters();
      this.searchInput.blur();
    }
  }

  private formatDate(d: Date): string {
    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const startOfD = new Date(d.getFullYear(), d.getMonth(), d.getDate());
    const diffDays = Math.floor((startOfToday.getTime() - startOfD.getTime()) / 86400000);
    if (diffDays === 0) return d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return d.toLocaleDateString('en-US', { weekday: 'long' });
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  }

  private formatFullDate(d: Date): string {
    return d.toLocaleDateString('en-US', {
      month: 'long',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    });
  }

  private showToast(msg: string): void {
    const t = document.createElement('div');
    t.className = 'toast';
    t.textContent = msg;
    document.body.appendChild(t);
    setTimeout(() => t.remove(), 3000);
  }
}

document.addEventListener('DOMContentLoaded', () => { new NotesApp(); });
