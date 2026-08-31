import { detectDesktop, isDarkMode, getSystemFont } from './env.js';
let currentTheme = 'light';
let onThemeChange = null;
export function setThemeChangeCallback(fn) {
    onThemeChange = fn;
}
export function applySystemTheme() {
    const dark = isDarkMode();
    currentTheme = dark ? 'dark' : 'light';
    document.documentElement.classList.toggle('dark', dark);
}
export function getCurrentTheme() {
    return currentTheme;
}
export function injectPlatformCSS() {
    const de = detectDesktop();
    const font = getSystemFont();
    const style = document.createElement('style');
    style.textContent = `
    :root {
      --system-font: ${font};
      --titlebar-height: ${de === 'kde' ? '34px' : '38px'};
      --platform-radius: ${de === 'kde' ? '6px' : '8px'};
      --accent-color: ${getDesktopAccent()};
      --wc-order: ${de === 'gnome' ? 'row' : 'row-reverse'};
    }

    .titlebar {
      background: ${de === 'kde' ? 'rgba(239, 240, 241, 0.95)' : 'rgba(242, 242, 247, 0.95)'};
      backdrop-filter: saturate(180%) blur(20px);
      -webkit-backdrop-filter: saturate(180%) blur(20px);
      border-bottom: 0.5px solid color-mix(in srgb, currentColor 12%, transparent);
    }

    .dark .titlebar {
      background: ${de === 'gnome' ? 'rgba(30, 30, 30, 0.95)' : 'rgba(35, 35, 35, 0.95)'};
    }

    body {
      font-family: var(--system-font);
    }

    .nav-item.active {
      background: ${de === 'gnome' ? 'color-mix(in srgb, var(--accent-color) 20%, transparent)' : 'rgba(0, 122, 255, 0.12)'};
    }

    @media (prefers-color-scheme: dark) {
      .titlebar {
        background: ${de === 'gnome' ? 'rgba(30, 30, 30, 0.95)' : 'rgba(35, 35, 35, 0.95)'};
      }
      .dark .titlebar {
        background: ${de === 'gnome' ? 'rgba(30, 30, 30, 0.95)' : 'rgba(35, 35, 35, 0.95)'};
      }
    }
  `;
    document.head.appendChild(style);
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    mq.addEventListener('change', () => {
        applySystemTheme();
        onThemeChange?.();
    });
}
function getDesktopAccent() {
    const de = detectDesktop();
    if (de === 'gnome')
        return '#3584e4';
    if (de === 'kde')
        return '#3daee9';
    return '#007AFF';
}
