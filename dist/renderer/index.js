import { App } from './components/app.js';
import { injectPlatformCSS, applySystemTheme, setThemeChangeCallback } from './platform/theme.js';
import { notesStore, foldersStore, darkMode } from './components/state.js';
console.log('[app] bootstrap start');
try {
    const root = document.getElementById('root');
    if (!root) {
        throw new Error('#root not found');
    }
    const app = new App();
    console.log('[app] app created');
    const tree = app.build();
    console.log('[app] tree built, appending to DOM');
    root.appendChild(tree);
    app.onMount();
    console.log('[app] onMount done');
    injectPlatformCSS();
    applySystemTheme();
    setThemeChangeCallback(() => app.refresh());
    console.log('[app] theme injected');
    const api = window.api;
    if (!api) {
        console.warn('[app] no api bridge');
    }
    else {
        Promise.all([api.loadNotes(), api.loadFolders(), api.loadSettings()])
            .then(([notes, folders, settings]) => {
            console.log('[app] data loaded', notes?.length, 'notes', folders?.length, 'folders');
            notesStore.set(notes || []);
            foldersStore.set(folders || []);
            darkMode.set(settings?.darkMode || false);
        })
            .catch((e) => console.error('[app] load error:', e));
    }
    console.log('[app] bootstrap complete');
}
catch (e) {
    console.error('[app] BOOTSTRAP FAILED:', e);
    document.getElementById('root').textContent = 'Error: ' + e.message;
}
