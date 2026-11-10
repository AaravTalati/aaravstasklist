import { createServer } from 'node:http';
import { timingSafeEqual } from 'node:crypto';
import { mkdirSync, readFileSync } from 'node:fs';
import { dirname } from 'node:path';
import { DatabaseSync } from 'node:sqlite';
import worker from './dist/server/index.js';

const port = Number(process.env.PORT ?? 3000);
const origin = new URL(process.env.TASKS_ORIGIN ?? ('http://localhost:' + port)).origin;
const password = process.env.TASKS_PASSWORD;
const localOrigins = ['http://localhost:' + port, 'http://127.0.0.1:' + port];
if (!localOrigins.includes(origin) && (!origin.startsWith('https://') || !password)) {
  throw new Error('Remote access requires an HTTPS TASKS_ORIGIN and TASKS_PASSWORD.');
}
const expected = password && Buffer.from('Basic ' + Buffer.from('tasks:' + password).toString('base64'));

const databasePath = process.env.TASKS_DB ?? 'data/tasks.sqlite';
mkdirSync(dirname(databasePath), { recursive: true });
const sqlite = new DatabaseSync(databasePath);
sqlite.exec(readFileSync(new URL('./schema.sql', import.meta.url), 'utf8'));
const DB = {
  prepare(sql) {
    const statement = sqlite.prepare(sql);
    return {
      bind(...args) {
        return {
          all: () => ({ results: statement.all(...args) }),
          run: () => statement.run(...args),
        };
      },
    };
  },
};

const server = createServer(async (req, res) => {
  if (req.headers.host !== new URL(origin).host) {
    res.writeHead(400).end('Open the app at ' + origin);
    return;
  }
  if (expected) {
    const actual = Buffer.from(req.headers.authorization ?? '');
    if (actual.length !== expected.length || !timingSafeEqual(actual, expected)) {
      res.writeHead(401, { 'WWW-Authenticate': 'Basic realm="Tasks"', 'Cache-Control': 'no-store' });
      res.end('Sign in to Tasks');
      return;
    }
  }

  try {
    const headers = new Headers();
    for (const name of ['content-type', 'origin']) {
      if (typeof req.headers[name] === 'string') headers.set(name, req.headers[name]);
    }
    headers.set('oai-authenticated-user-id', 'self-hosted-owner');
    const method = req.method;
    const options = { method, headers };
    if (method !== 'GET' && method !== 'HEAD') {
      const chunks = [];
      let size = 0;
      for await (const chunk of req) {
        size += chunk.length;
        if (size > 8192) {
          res.writeHead(413).end('Request too large');
          return;
        }
        chunks.push(chunk);
      }
      options.body = Buffer.concat(chunks);
    }
    const response = await worker.fetch(new Request(origin + req.url, options), { DB });
    res.writeHead(response.status, Object.fromEntries(response.headers));
    res.end(Buffer.from(await response.arrayBuffer()));
  } catch (error) {
    console.error(error.message);
    if (!res.headersSent) res.writeHead(500);
    res.end('Unable to process request');
  }
});

server.listen(port, '127.0.0.1', () => console.log('Tasks is ready at ' + origin));
