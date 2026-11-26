const fs = require('node:fs');
const path = require('node:path');
const { execFileSync } = require('node:child_process');
const root = path.resolve(__dirname, '..');
const manifest = JSON.parse(fs.readFileSync(path.join(root, 'manifest.json'), 'utf8'));
const files = [...manifest.content_scripts.flatMap(script => [...script.js, ...script.css]), manifest.action.default_popup, manifest.options_page, ...Object.values(manifest.icons)];
for (const file of files) if (!fs.existsSync(path.join(root, file))) throw new Error(`Missing: ${file}`);
function walk(dir) {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap(entry => entry.isDirectory() && !['dist', 'node_modules', 'artifacts', '.git'].includes(entry.name) ? walk(path.join(dir, entry.name)) : entry.isFile() ? [path.join(dir, entry.name)] : []);
}
const scripts = walk(root).filter(file => /\.(js|cjs)$/.test(file));
for (const file of scripts) execFileSync(process.execPath, ['--check', file]);
if (manifest.manifest_version !== 3) throw new Error('Manifest V3 required');
if (JSON.stringify(manifest).includes('<all_urls>')) throw new Error('Overbroad permission');
console.log(`Manifest assets and ${scripts.length} JavaScript files validated.`);
