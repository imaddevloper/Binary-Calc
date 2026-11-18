import { test } from 'node:test';
import assert from 'node:assert/strict';
import { allRepresentations, convertBetweenBases, parseIntegerInput } from '../src/core/number-systems/index.ts';
import { analyzeIPv6, formatIPv6, parseIPv6 } from '../src/core/ipv6/index.ts';

test('all four number bases convert exactly in every direction', () => {
  const values = [0n, 1n, 7n, 8n, 15n, 255n, 65535n, 9007199254740993n, 123456789012345678901234567890n];
  const bases = [2, 8, 10, 16] as const;
  for (const value of values) {
    const reps = allRepresentations(value);
    for (const from of bases) {
      for (const to of bases) {
        const result = convertBetweenBases(reps[from], from, to);
        assert.ok(result.ok, `${reps[from]} base ${from} -> base ${to}`);
        assert.equal(result.output, reps[to]);
        assert.equal(result.value, value);
      }
    }
  }
});

test('all four bases preserve signed magnitudes and normalize negative zero', () => {
  const bases = [2, 8, 10, 16] as const;
  for (const from of bases) {
    for (const to of bases) {
      const source = '-' + (42n).toString(from).toUpperCase();
      const result = convertBetweenBases(source, from, to);
      assert.ok(result.ok);
      assert.equal(result.output, '-' + (42n).toString(to).toUpperCase());
    }
  }
  assert.deepEqual(parseIntegerInput('-0', 8), { ok: true, value: 0n, normalized: '0', negative: false });
});

test('octal validation rejects digits outside 0..7 and accepts 0o prefix', () => {
  assert.deepEqual(parseIntegerInput('128', 8), { ok: false, error: 'invalid_octal' });
  const parsed = parseIntegerInput('0o755', 8);
  assert.ok(parsed.ok);
  assert.equal(parsed.value, 493n);
  assert.equal(parsed.normalized, '755');
});

test('IPv6 canonical parsing and exact 128-bit representations', () => {
  const samples = [
    ['::', '::'],
    ['2001:0db8:0000:0000:0000:ff00:0042:8329', '2001:db8::ff00:42:8329'],
    ['::ffff:192.0.2.1', '::ffff:c000:201'],
    ['2001:db8::192.0.2.1', '2001:db8::c000:201'],
  ] as const;
  for (const [input, canonical] of samples) {
    const parsed = parseIPv6(input);
    assert.ok(parsed.ok, input);
    assert.equal(formatIPv6(parsed.value), canonical);
    const result = analyzeIPv6(input);
    assert.ok(result.ok);
    assert.equal(result.analysis.binary.length, 128);
    assert.equal(BigInt('0b' + result.analysis.binary), parsed.value);
    assert.equal(BigInt('0o' + result.analysis.octal), parsed.value);
    assert.equal(BigInt(result.analysis.decimal), parsed.value);
    assert.equal(BigInt('0x' + result.analysis.hexadecimal), parsed.value);
    assert.equal(result.analysis.groups.length, 8);
  }
});

test('IPv6 rejects malformed compression and invalid groups', () => {
  for (const input of ['', '1:2:3:4:5:6:7', '1:2:3:4:5:6:7:8:9', '1::2::3', '1:::2', 'gggg::1', '::ffff:192.0.2.999', 'fe80::1%eth0']) {
    assert.equal(parseIPv6(input).ok, false, input);
  }
});

test('IPv6 formatting compresses the longest zero run and does not compress a single zero group', () => {
  const parsed = parseIPv6('2001:db8:0:1:0:0:0:1');
  assert.ok(parsed.ok);
  assert.equal(formatIPv6(parsed.value), '2001:db8:0:1::1');
  const oneZero = parseIPv6('2001:db8:0:1:2:3:4:5');
  assert.ok(oneZero.ok);
  assert.equal(formatIPv6(oneZero.value), '2001:db8:0:1:2:3:4:5');
});
