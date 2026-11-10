import { mkdir, readFile, writeFile } from 'node:fs/promises';

const html = await readFile('index.html', 'utf8');
const server = await readFile('worker.mjs', 'utf8');
await mkdir('dist/server', { recursive: true });
await writeFile('dist/server/index.js', 'const html = ' + JSON.stringify(html) + ';\n' + server);
