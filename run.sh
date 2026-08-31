#!/bin/bash
cd "$(dirname "$0")"
npm run build && node_modules/electron/dist/electron --no-sandbox --enable-features=UseOzonePlatform --ozone-platform=wayland dist/main.js
