#!/usr/bin/env node
/**
 * Scans the dist output and writes a cache-files.json listing all
 * files the service worker should pre-cache for offline use.
 * No external dependencies — uses only Node built-ins.
 */
const fs = require('fs');
const path = require('path');

const DIST_DIR = path.join(__dirname, '..', 'dist', 'gcp-editor-pro');

// Extensions to skip (large or unnecessary for offline)
const SKIP_EXT = new Set(['.map']);

function walk(dir, base) {
  let results = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const fullPath = path.join(dir, entry.name);
    const relPath = path.join(base, entry.name).replace(/\\/g, '/');
    if (entry.isDirectory()) {
      results = results.concat(walk(fullPath, relPath));
    } else {
      const ext = path.extname(entry.name).toLowerCase();
      if (!SKIP_EXT.has(ext)) {
        results.push('./' + relPath);
      }
    }
  }
  return results;
}

if (!fs.existsSync(DIST_DIR)) {
  console.error('dist/gcp-editor-pro not found. Run ng build first.');
  process.exit(1);
}

const files = walk(DIST_DIR, '');
const outPath = path.join(DIST_DIR, 'cache-files.json');
fs.writeFileSync(outPath, JSON.stringify(files, null, 2));
console.log(`cache-files.json written with ${files.length} entries.`);
