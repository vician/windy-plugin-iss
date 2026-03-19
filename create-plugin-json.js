#!/usr/bin/env node

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

console.log('Creating plugin.json...');

// Ensure dist directory exists
const distDir = path.join(__dirname, 'dist');
if (!fs.existsSync(distDir)) {
  fs.mkdirSync(distDir);
}

// Create plugin.json with the known config
const config = {
  "name": "windy-plugin-iss-tracker",
  "version": "0.1.1",
  "icon": "🛰️",
  "title": "ISS Tracker",
  "description": "Track the International Space Station position and trajectory.",
  "author": "Martin Vician",
  "repository": "https://github.com/vician/windy-plugin-iss",
  "desktopUI": "rhpane",
  "mobileUI": "fullscreen",
  "routerPath": "/iss-tracker",
  "private": true
};

const configPath = path.join(distDir, 'plugin.json');
fs.writeFileSync(configPath, JSON.stringify(config, null, 2));
console.log('plugin.json created at:', configPath);