import { cp, mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';

const root = process.cwd();
const output = path.join(root, 'dist');
const apiBaseUrl = (process.env.API_BASE_URL || '').trim().replace(/\/+$/, '');

if (apiBaseUrl) {
  let parsed;
  try {
    parsed = new URL(apiBaseUrl);
  } catch {
    throw new Error('API_BASE_URL must be a complete URL, such as https://your-api.onrender.com');
  }
  if (!['http:', 'https:'].includes(parsed.protocol)) throw new Error('API_BASE_URL must use http or https');
}

await rm(output, { recursive: true, force: true });
await mkdir(output, { recursive: true });

for (const file of ['akio.html', 'akio.css', 'akio.js', 'music.js', 'tetris.js', 'social.html', 'social.css', 'social-v2.css', 'social.js']) {
  await cp(path.join(root, file), path.join(output, file));
}
await cp(path.join(root, 'images'), path.join(output, 'images'), { recursive: true });
await writeFile(
  path.join(output, 'config.js'),
  `window.__AKIO_API_BASE_URL__ = ${JSON.stringify(apiBaseUrl)};\n`,
  'utf8'
);

const html = await readFile(path.join(output, 'akio.html'), 'utf8');
if (!html.includes('config.js')) throw new Error('akio.html must load config.js before akio.js');

console.log(`Built static site in dist (API: ${apiBaseUrl || 'same origin/local server'})`);
