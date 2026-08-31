import { state } from '../core/signal.js';
export const notesStore = state([]);
export const foldersStore = state([]);
export const currentView = state('all');
export const currentTagFilter = state('');
export const searchQuery = state('');
export const currentNoteId = state(null);
export const darkMode = state(false);
export const isMaximized = state(false);
export const TAG_COLORS = {
    red: '#FF3B30', orange: '#FF9500', yellow: '#FFD60A', green: '#34C759',
    mint: '#00C7BE', teal: '#5AC8FA', blue: '#007AFF', indigo: '#5856D6',
    purple: '#AF52DE', pink: '#FF2D55',
};
