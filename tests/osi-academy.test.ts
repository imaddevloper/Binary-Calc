import { test } from 'node:test';
import assert from 'node:assert/strict';
import { OSI_LAYERS, OSI_ROADMAP, OSI_GLOSSARY, OSI_PATHS, OSI_REFERENCES } from '../src/features/learning/osiData.ts';

test('OSI curriculum contains seven layers in correct top-to-bottom order', () => {
  assert.deepEqual(OSI_LAYERS.map((layer) => layer.id), [7, 6, 5, 4, 3, 2, 1]);
});

test('every OSI layer has bilingual teaching content and a valid quiz answer', () => {
  for (const layer of OSI_LAYERS) {
    assert.ok(layer.name.trim() && layer.ar.trim());
    assert.ok(layer.summary.trim() && layer.summaryAr.trim());
    assert.ok(layer.purpose.trim() && layer.purposeAr.trim());
    assert.ok(layer.duties.length >= 3 && layer.dutiesAr.length >= 3);
    assert.ok(layer.technologies.length > 0);
    assert.ok(layer.example.trim() && layer.exampleAr.trim());
    assert.ok(layer.misconception.trim() && layer.misconceptionAr.trim());
    assert.ok(layer.options.length >= 3);
    assert.equal(layer.options.length, layer.optionsAr.length);
    assert.ok(layer.answer >= 0 && layer.answer < layer.options.length);
    assert.ok(layer.explanation.trim() && layer.explanationAr.trim());
  }
});

test('OSI roadmap, glossary and external reference metadata are populated', () => {
  assert.ok(OSI_ROADMAP.length >= 6);
  assert.ok(OSI_GLOSSARY.length >= 7);
  assert.ok(OSI_PATHS.length >= 7);
  assert.ok(OSI_REFERENCES.length >= 3);
  for (const item of [...OSI_PATHS, ...OSI_REFERENCES]) assert.match(item.url, /^https:\/\//);
});
