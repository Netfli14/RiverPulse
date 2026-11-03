import { test, after } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { createRequire } from 'node:module';
import ts from 'typescript';

const root = fs.mkdtempSync(path.join(os.tmpdir(), 'waterguard-registration-'));
const require = createRequire(import.meta.url);
fs.symlinkSync(path.resolve('node_modules'), path.join(root, 'node_modules'), 'dir');
for (const [name, file] of [
  ['portal-auth', 'lib/portal-auth.ts'], ['portal-storage', 'lib/portal-storage.ts'],
  ['user-auth', 'lib/user-auth.ts'], ['session', 'app/api/portal/session/route.ts'],
]) {
  const source = fs.readFileSync(file, 'utf8').replaceAll('@/lib/', './');
  fs.writeFileSync(path.join(root, name + '.js'), ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText);
}
const { NextRequest } = require('next/server');
const route = require(path.join(root, 'session.js'));
const auth = require(path.join(root, 'portal-auth.js'));
after(() => fs.rmSync(root, { recursive: true, force: true }));

function request(body, cookie = '', method = 'POST') {
  return new NextRequest('https://site.example/api/portal/session', {
    method, headers: { origin: 'https://site.example', host: 'site.example', 'content-type': 'application/json', cookie },
    ...(method === 'POST' ? { body: JSON.stringify(body) } : {}),
  });
}
const signup = (email = 'regression@example.test') => ({ role: 'user', action: 'register', email, password: 'test-only-password' });
const cookieFor = response => 'waterguard_session=' + response.cookies.get('waterguard_session').value;

async function fixture(run, { signing = true, countersFail = false } = {}) {
  const names = ['BLOB_READ_WRITE_TOKEN', 'PORTAL_SESSION_SECRET', 'ADMIN_SESSION_SECRET'];
  const saved = names.map(name => [name, process.env[name]]);
  const previousFetch = globalThis.fetch;
  process.env.BLOB_READ_WRITE_TOKEN = 'vercel_blob_rw_teststore_testsecret';
  delete process.env.ADMIN_SESSION_SECRET;
  if (signing) process.env.PORTAL_SESSION_SECRET = 'test-only-signing-key';
  else delete process.env.PORTAL_SESSION_SECRET;
  const blobs = new Map();
  globalThis.fetch = async (input, options = {}) => {
    const url = new URL(input);
    assert.equal(options.headers.authorization, 'Bearer ' + process.env.BLOB_READ_WRITE_TOKEN);
    if (url.origin === 'https://vercel.com') {
      const pathname = url.searchParams.get('pathname');
      if (options.method === 'PUT') {
        if (countersFail && pathname.startsWith('waterguard/entries:')) return new Response(null, { status: 503 });
        if (options.headers['x-allow-overwrite'] === '0' && blobs.has(pathname)) return new Response('already exists', { status: 409 });
        blobs.set(pathname, JSON.parse(options.body));
        return Response.json({ pathname });
      }
      return Response.json({ blobs: [...blobs.keys()].filter(p => p.startsWith(url.searchParams.get('prefix'))).map(pathname => ({ pathname })), hasMore: false });
    }
    assert.equal(url.origin, 'https://teststore.private.blob.vercel-storage.com');
    const value = blobs.get(decodeURIComponent(url.pathname.slice(1)));
    return value ? Response.json(value) : new Response(null, { status: 404 });
  };
  try { await run(blobs); }
  finally {
    globalThis.fetch = previousFetch;
    for (const [name, value] of saved) {
      if (value === undefined) delete process.env[name];
      else process.env[name] = value;
    }
  }
}

test('missing session configuration creates no account and the same signup can be retried', async () => {
  await fixture(async blobs => {
    const failed = await route.POST(request(signup()));
    assert.equal(failed.status, 503);
    assert.equal(blobs.size, 0);
    process.env.PORTAL_SESSION_SECRET = 'test-only-signing-key';
    const retry = await route.POST(request(signup()));
    assert.equal(retry.status, 200);
    const session = await (await route.GET(request(null, cookieFor(retry), 'GET'))).json();
    assert.equal(session.session.email, 'regression@example.test');
  }, { signing: false });
});

test('a signing failure cannot persist an account before the session exists', async () => {
  await fixture(async blobs => {
    const original = auth.signSession;
    try {
      auth.signSession = async () => { throw new Error('test-only signing failure'); };
      assert.equal((await route.POST(request(signup()))).status, 503);
      assert.equal([...blobs.keys()].filter(key => key.startsWith('waterguard/accounts/')).length, 0);
    } finally { auth.signSession = original; }
    assert.equal((await route.POST(request(signup()))).status, 200);
  });
});

test('accepted international email addresses survive signup, session decoding and login', async () => {
  await fixture(async () => {
    const body = signup('erasyl@мысал.test');
    const created = await route.POST(request(body));
    assert.equal(created.status, 200);
    const session = await (await route.GET(request(null, cookieFor(created), 'GET'))).json();
    assert.equal(session.session.email, body.email);
    assert.equal((await route.POST(request({ ...body, action: 'login' }))).status, 200);
    assert.equal((await route.POST(request({ ...body, action: 'login', password: 'incorrect-password' }))).status, 401);
  });
});

test('unavailable visitor analytics does not turn successful signup into a failure', async () => {
  await fixture(async blobs => {
    const created = await route.POST(request(signup()));
    assert.equal(created.status, 200);
    assert.equal([...blobs.keys()].filter(key => key.startsWith('waterguard/accounts/')).length, 1);
    const session = await (await route.GET(request(null, cookieFor(created), 'GET'))).json();
    assert.equal(session.session.role, 'user');
  }, { countersFail: true });
});
