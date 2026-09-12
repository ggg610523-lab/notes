# Notes

An iOS-style Notes app for Linux, built with Electron and TypeScript.

## Requirements

- Node.js (v18 or later)
- npm
- On some Linux/Wayland environments, [fuse](https://github.com/AppImage/AppImageKit/wiki/FUSE) is required to run the AppImage.

## Install dependencies

```bash
npm install
```

> Note: Electron post-install scripts must be allowed (`allowScripts` is set in `package.json`). If `npm install` skips the Electron download, run `node_modules/.bin/electron --version` or reinstall with scripts enabled.

## Build

Compile TypeScript and copy static assets into `dist/`:

```bash
npm run build
```

## Run (development)

Builds then launches the app with Wayland support:

```bash
npm run dev
# or
npm start
```

You can also run it from the prepared script:

```bash
./run.sh
```

## Build AppImage (distribution)

Builds and packages a Linux AppImage into the `release/` directory:

```bash
npm run dist
```

The resulting `release/Notes-<version>.AppImage` can be run directly:

```bash
./release/Notes-1.0.0.AppImage
```

## Project layout

```
src/            TypeScript source (main, preload, renderer)
dist/           Build output (generated — not committed for distribution)
build/          Packaging assets (icon, desktop entry)
release/        AppImage output (generated)
```
