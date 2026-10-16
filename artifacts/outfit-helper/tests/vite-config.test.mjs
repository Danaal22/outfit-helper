import assert from 'node:assert/strict';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';
import { loadConfigFromFile } from 'vite';

const configPath = fileURLToPath(new URL('../vite.config.ts', import.meta.url));

async function load(command, variables = {}, isPreview = false) {
  const keys = ['PORT', 'BASE_PATH', 'NODE_ENV'];
  const original = Object.fromEntries(keys.map((key) => [key, process.env[key]]));
  try {
    delete process.env.PORT;
    delete process.env.BASE_PATH;
    process.env.NODE_ENV = 'production';
    Object.assign(process.env, variables);
    const result = await loadConfigFromFile(
      { command, mode: 'production', isPreview },
      configPath,
    );
    assert.ok(result, 'The Vite configuration should load');
    return result.config;
  } finally {
    for (const key of keys) {
      if (original[key] === undefined) delete process.env[key];
      else process.env[key] = original[key];
    }
  }
}

test('build works without PORT or BASE_PATH', async () => {
  const config = await load('build');
  assert.equal(config.base, '/');
  assert.equal(config.server.port, undefined);
  assert.equal(config.preview.port, undefined);
});

test('build ignores runtime-only PORT even if invalid', async () => {
  const config = await load('build', { PORT: 'not-a-port' });
  assert.equal(config.server.port, undefined);
});

test('development preserves a supplied PORT and BASE_PATH', async () => {
  const config = await load('serve', { PORT: '23081', BASE_PATH: '/outfit/' });
  assert.equal(config.server.port, 23081);
  assert.equal(config.base, '/outfit/');
});

test('preview preserves a supplied PORT', async () => {
  const config = await load('serve', { PORT: '23081' }, true);
  assert.equal(config.preview.port, 23081);
});

test('serve without PORT leaves the default to Vite', async () => {
  const config = await load('serve');
  assert.equal(config.server.port, undefined);
  assert.equal(config.preview.port, undefined);
});

test('serve rejects invalid supplied ports', async () => {
  for (const PORT of ['not-a-port', '0', '-1', '1.5', '65536']) {
    await assert.rejects(load('serve', { PORT }), /PORT must be an integer/);
  }
});
