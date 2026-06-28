import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import test from 'node:test';

const __dirname = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(__dirname, '../..');
const packageJsonPath = resolve(repoRoot, 'package.json');
const pluginPath = resolve(repoRoot, '.cline/plugins/superpowers.ts');
const clineToolsPath = resolve(repoRoot, 'skills/using-superpowers/references/cline-tools.md');

async function readPackageJson() {
  return JSON.parse(await readFile(packageJsonPath, 'utf8'));
}

// The plugin imports `@cline/core` only as a type (`import type`), which Node's
// type-stripping erases at load time, so we can import it directly without the
// host runtime present. Register the message builder against a stub api.
async function loadPlugin() {
  const mod = await import(pathToFileURL(pluginPath).href + `?cachebust=${Date.now()}-${Math.random()}`);
  const plugin = mod.default;
  const builders = [];
  const api = { registerMessageBuilder: (b) => builders.push(b) };
  plugin.setup(api);
  return { plugin, builders };
}

function textOf(message) {
  if (typeof message.content === 'string') return message.content;
  return message.content
    .filter((part) => part.type === 'text')
    .map((part) => part.text)
    .join('\n');
}

test('package.json declares a cline plugin pointing at the bootstrap injector', async () => {
  const pkg = await readPackageJson();

  assert.equal(pkg.name, 'superpowers');
  assert.ok(pkg.cline, 'package.json has a cline field');
  assert.equal(pkg.cline.plugins.length, 1);
  assert.deepEqual(pkg.cline.plugins[0].paths, ['./.cline/plugins/superpowers.ts']);
  assert.deepEqual(pkg.cline.plugins[0].capabilities, ['messageBuilders']);
});

test('@cline/core is declared as an optional peer dependency (zero-install)', async () => {
  const pkg = await readPackageJson();
  assert.equal(pkg.peerDependencies?.['@cline/core'], '*');
  assert.equal(pkg.peerDependenciesMeta?.['@cline/core']?.optional, true);
});

test('the pi package config is left intact alongside the cline config', async () => {
  const pkg = await readPackageJson();
  assert.deepEqual(pkg.pi.skills, ['./skills']);
  assert.deepEqual(pkg.pi.extensions, ['./.pi/extensions/superpowers.ts']);
});

test('plugin registers exactly one message builder named superpowers-bootstrap', async () => {
  const { plugin, builders } = await loadPlugin();
  assert.equal(plugin.name, 'superpowers');
  assert.deepEqual(plugin.manifest.capabilities, ['messageBuilders']);
  assert.equal(builders.length, 1);
  assert.equal(builders[0].name, 'superpowers-bootstrap');
});

test('builder injects the bootstrap as the first user message', async () => {
  const { builders } = await loadPlugin();
  const build = builders[0].build;

  const original = [{ role: 'user', content: "Let's make a react todo list" }];
  const result = build(original);

  assert.equal(result.length, 2);
  assert.equal(result[0].role, 'user');
  assert.match(textOf(result[0]), /<EXTREMELY_IMPORTANT>/);
  assert.match(textOf(result[0]), /You have superpowers/);
  assert.match(textOf(result[0]), /using-superpowers/);
  assert.match(textOf(result[0]), /Cline tool mapping/);
  assert.match(textOf(result[0]), /use_skill/);
  assert.match(textOf(result[0]), /use_subagents/);
  assert.equal(result[1], original[0]);
});

test('builder does not double-inject when the bootstrap is already present', async () => {
  const { builders } = await loadPlugin();
  const build = builders[0].build;

  const original = [{ role: 'user', content: 'hello' }];
  const once = build(original);
  const twice = build(once);

  const markerCount = twice.filter((m) =>
    textOf(m).includes('superpowers:using-superpowers bootstrap for cline'),
  ).length;
  assert.equal(markerCount, 1);
});

test('builder leaves an empty message list unchanged', async () => {
  const { builders } = await loadPlugin();
  const build = builders[0].build;
  const empty = [];
  assert.equal(build(empty), empty);
});

test('builder inserts the bootstrap after leading compaction summaries', async () => {
  const { builders } = await loadPlugin();
  const build = builders[0].build;

  const summary = { role: 'compactionSummary', summary: 'prior work' };
  const user = { role: 'user', content: 'Continue' };
  const result = build([summary, user]);

  assert.equal(result.length, 3);
  assert.equal(result[0], summary);
  assert.equal(result[1].role, 'user');
  assert.match(textOf(result[1]), /You have superpowers/);
  assert.equal(result[2], user);
});

test('builder handles array-content user messages', async () => {
  const { builders } = await loadPlugin();
  const build = builders[0].build;

  const original = [{ role: 'user', content: [{ type: 'text', text: 'hello' }] }];
  const result = build(original);

  assert.equal(result.length, 2);
  assert.match(textOf(result[0]), /You have superpowers/);
});

test('cline tools reference documents cline-specific mappings', async () => {
  assert.equal(existsSync(clineToolsPath), true, 'cline-tools.md should exist');
  const text = await readFile(clineToolsPath, 'utf8');

  for (const expected of ['use_skill', 'use_subagents', 'read_files', 'apply_patch', 'bash', 'search', 'fetch_web', 'editor']) {
    assert.match(text, new RegExp(expected));
  }
});
