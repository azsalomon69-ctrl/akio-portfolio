const http = require('node:http');
const path = require('node:path');
const fs = require('node:fs');
const fsp = require('node:fs/promises');

const projectRoot = __dirname;
const preferredPort = Number(process.env.PORT || 4173);
const host = process.env.HOST || '0.0.0.0';
let activePort = preferredPort;
const maxBodyBytes = 50_000;

const mimeTypes = {
  '.css': 'text/css; charset=utf-8',
  '.gif': 'image/gif',
  '.html': 'text/html; charset=utf-8',
  '.ico': 'image/x-icon',
  '.jpeg': 'image/jpeg',
  '.jpg': 'image/jpeg',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.svg': 'image/svg+xml; charset=utf-8',
  '.webp': 'image/webp'
};

function loadLocalEnv() {
  const envPath = path.join(projectRoot, '.env');
  if (!fs.existsSync(envPath)) return;
  const lines = fs.readFileSync(envPath, 'utf8').split(/\r?\n/);
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const separator = trimmed.indexOf('=');
    if (separator < 1) continue;
    const key = trimmed.slice(0, separator).trim();
    let value = trimmed.slice(separator + 1).trim();
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    if (!(key in process.env)) process.env[key] = value;
  }
}

function sendJson(response, status, payload) {
  response.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8',
    'Cache-Control': 'no-store',
    'X-Content-Type-Options': 'nosniff'
  });
  response.end(JSON.stringify(payload));
}

function sendRuntimeConfig(response) {
  const script = [
    `window.__AKIO_API_BASE_URL__ = '';`,
    `window.__AUDIUS_API_KEY__ = ${JSON.stringify((process.env.AUDIUS_API_KEY || '').trim())};`,
    ''
  ].join('\n');
  response.writeHead(200, {
    'Content-Type': 'text/javascript; charset=utf-8',
    'Content-Length': Buffer.byteLength(script),
    'Cache-Control': 'no-store',
    'X-Content-Type-Options': 'nosniff'
  });
  response.end(script);
}

async function readBody(request) {
  const chunks = [];
  let size = 0;
  for await (const chunk of request) {
    size += chunk.length;
    if (size > maxBodyBytes) throw new Error('BODY_TOO_LARGE');
    chunks.push(chunk);
  }
  return Buffer.concat(chunks);
}

async function runApi(request, response, chatHandler) {
  let body;
  try {
    body = await readBody(request);
  } catch (error) {
    if (error.message === 'BODY_TOO_LARGE') return sendJson(response, 413, { error: 'Request is too large.' });
    return sendJson(response, 400, { error: 'Could not read the request.' });
  }

  const headers = new Headers();
  for (const [name, value] of Object.entries(request.headers)) {
    if (Array.isArray(value)) value.forEach(item => headers.append(name, item));
    else if (value !== undefined) headers.set(name, value);
  }

  const webRequest = new Request(`http://${request.headers.host || `localhost:${activePort}`}${request.url}`, {
    method: request.method,
    headers,
    body: ['GET', 'HEAD'].includes(request.method) ? undefined : body,
    duplex: 'half'
  });
  const webResponse = await chatHandler.fetch(webRequest);
  const responseHeaders = Object.fromEntries(webResponse.headers.entries());
  response.writeHead(webResponse.status, responseHeaders);
  response.end(Buffer.from(await webResponse.arrayBuffer()));
}

async function serveStatic(request, response) {
  if (!['GET', 'HEAD'].includes(request.method)) {
    response.writeHead(405, { Allow: 'GET, HEAD' });
    return response.end('Method not allowed');
  }

  let pathname;
  try {
    pathname = decodeURIComponent(new URL(request.url, `http://${request.headers.host || 'localhost'}`).pathname);
  } catch {
    response.writeHead(400);
    return response.end('Bad request');
  }
  if (pathname === '/') pathname = '/akio.html';

  const filePath = path.resolve(projectRoot, `.${pathname}`);
  const insideProject = filePath === projectRoot || filePath.startsWith(`${projectRoot}${path.sep}`);
  const relativePath = path.relative(projectRoot, filePath);
  if (!insideProject || relativePath.startsWith('.') || relativePath.startsWith(`api${path.sep}`)) {
    response.writeHead(404);
    return response.end('Not found');
  }

  try {
    const stat = await fsp.stat(filePath);
    if (!stat.isFile()) throw new Error('NOT_FILE');
    response.writeHead(200, {
      'Content-Type': mimeTypes[path.extname(filePath).toLowerCase()] || 'application/octet-stream',
      'Content-Length': stat.size,
      'X-Content-Type-Options': 'nosniff'
    });
    if (request.method === 'HEAD') return response.end();
    fs.createReadStream(filePath).pipe(response);
  } catch {
    response.writeHead(404);
    response.end('Not found');
  }
}

loadLocalEnv();

function hasConfiguredKey() {
  return Object.keys(process.env).some(name => {
    const value = process.env[name];
    return /^NVIDIA_API_KEY_[1-5]$/.test(name)
      && typeof value === 'string'
      && value.startsWith('nvapi-')
      && !value.includes('replace_with_');
  });
}

import('./api/chat.mjs').then(chatModule => {
  const server = http.createServer(async (request, response) => {
    try {
      const pathname = new URL(request.url, `http://${request.headers.host || 'localhost'}`).pathname;
      if (pathname === '/api/chat') return await runApi(request, response, chatModule.default);
      if (pathname === '/health') return sendJson(response, 200, { status: 'ok' });
      if (pathname === '/config.js') return sendRuntimeConfig(response);
      return await serveStatic(request, response);
    } catch (error) {
      console.error('Request failed:', error.message);
      if (!response.headersSent) return sendJson(response, 500, { error: 'Internal server error.' });
      response.end();
    }
  });

  let portAttempts = 0;
  server.on('error', error => {
    if (error.code === 'EADDRINUSE' && !process.env.PORT && portAttempts < 10) {
      const unavailablePort = activePort;
      activePort += 1;
      portAttempts += 1;
      console.log(`Port ${unavailablePort} is busy. Trying ${activePort}...`);
      return server.listen(activePort, host);
    }
    console.error('Could not start the server:', error.message);
    process.exitCode = 1;
  });

  server.listen(activePort, host, () => {
    console.log(`Akio portfolio: http://127.0.0.1:${activePort}`);
    if (!hasConfiguredKey()) {
      console.log('AI is offline: open .env and add at least one newly generated NVIDIA key.');
    }
  });
}).catch(error => {
  console.error('Could not start the server:', error.message);
  process.exitCode = 1;
});
