import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { DICTIONARIES, ltr, translate } from '../src/i18n/index.ts';

const en = DICTIONARIES.en as Record<string, string>;
const ar = DICTIONARIES.ar as Record<string, string>;

const placeholders = (s: string) => [...s.matchAll(/\{(\w+)\}/g)].map((m) => m[1]).sort();

test('English and Arabic have exactly the same keys', () => {
  const enKeys = Object.keys(en).sort();
  const arKeys = Object.keys(ar).sort();
  assert.deepEqual(arKeys, enKeys);
});

test('no empty strings in either language', () => {
  for (const [k, v] of Object.entries(en)) assert.ok(v.trim() !== '', `en ${k} empty`);
  for (const [k, v] of Object.entries(ar)) assert.ok(v.trim() !== '', `ar ${k} empty`);
});

test('placeholders match between languages', () => {
  for (const k of Object.keys(en)) {
    assert.deepEqual(placeholders(ar[k]), placeholders(en[k]), `placeholder mismatch in ${k}`);
  }
});

test('Arabic strings are actually translated (contain Arabic letters) unless purely technical', () => {
  const technical = /^[\s\d.+\-−×÷=:/^{}()←→A-Za-z0-9⁰-⁹²³¹⁦⁩]*$/;
  for (const [k, v] of Object.entries(ar)) {
    if (/[؀-ۿ]/.test(v)) continue;
    assert.ok(technical.test(v) && (v.replace(/←/g, '→') === en[k] || k.startsWith('base.chip') || k === 'app.name' || k === 'ipv4.placeholder'),
      `ar ${k} looks untranslated: ${v}`);
  }
});

function walk(dir: string, out: string[] = []): string[] {
  for (const f of readdirSync(dir)) {
    if (f === 'node_modules' || f.startsWith('.')) continue;
    const p = join(dir, f);
    if (statSync(p).isDirectory()) walk(p, out);
    else if (/\.(ts|tsx)$/.test(f)) out.push(p);
  }
  return out;
}

test('every literal translation key used in the source exists', () => {
  const files = [...walk('src'), ...walk('app')].filter((f) => !f.includes('i18n/'));
  const used = new Set<string>();
  const dynamic = new Set<string>();
  for (const f of files) {
    const src = readFileSync(f, 'utf8');
    for (const m of src.matchAll(/\b(?:t|tm)\(\s*'([a-zA-Z0-9_.]+)'/g)) used.add(m[1]);
    for (const m of src.matchAll(/\b(?:t|tm)\(\s*`([a-zA-Z0-9_.]*)\$\{/g)) dynamic.add(m[1]);
  }
  const missing = [...used].filter((k) => !(k in en));
  assert.deepEqual(missing, [], `missing keys: ${missing.join(', ')}`);
  for (const prefix of dynamic) {
    assert.ok(Object.keys(en).some((k) => k.startsWith(prefix)), `no keys for dynamic prefix ${prefix}`);
  }
  assert.ok(used.size > 100, 'scan should find many keys');
});

test('every category has a title and a description in both languages', () => {
  const cats = ['unspecified', 'this_network', 'private_use', 'shared_address_space', 'loopback', 'link_local', 'ietf_protocol',
    'documentation', 'deprecated_6to4', 'benchmarking', 'multicast', 'reserved_future', 'limited_broadcast', 'general'];
  for (const c of cats) {
    assert.ok(`cat.${c}` in en && `cat.${c}.d` in en, c);
  }
});

test('translate substitutes parameters and ltr isolates technical text', () => {
  assert.equal(translate('en', 'err.too_long', { max: 256 }), 'The number is too long. Maximum supported length: 256 digits.');
  assert.equal(translate('ar', 'learn.progress', { n: 3, total: 17 }), 'الدرس 3 من 17');
  assert.equal(ltr('192.168.1.10'), '⁦192.168.1.10⁩');
});
