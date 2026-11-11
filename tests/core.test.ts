import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  parseIntegerInput, formatInteger, convertBetweenBases, decimalToBinarySteps, binaryToDecimalSteps,
  decimalToHexSteps, hexToDecimalSteps, binaryToHexSteps, hexToBinarySteps, getBitBreakdown,
  groupFromRight, MAX_DIGITS,
} from '../src/core/number-systems/index.ts';
import { binaryArithmetic } from '../src/core/arithmetic/index.ts';
import {
  parseIPv4, analyzeIPv4, octetToBinary, ipv4ToHex, ipv4ToBinary32, classifyIPv4, historicalClass,
} from '../src/core/ipv4/index.ts';
import { extractIPv4Candidates } from '../src/core/ocr/candidates.ts';
import { CHALLENGE_TYPES, generateChallenge, checkAnswer } from '../src/core/challenges/index.ts';

// ------------------------------------------------------------ conversions

test('required conversion table (spec 17.2)', () => {
  const rows: [string, string, string, string][] = [
    ['0', '0', '0', '0'], ['1', '1', '1', '1'], ['10', '1010', '10', 'A'], ['15', '1111', '15', 'F'],
    ['16', '10000', '16', '10'], ['64', '1000000', '64', '40'], ['127', '1111111', '127', '7F'],
    ['128', '10000000', '128', '80'], ['168', '10101000', '168', 'A8'], ['192', '11000000', '192', 'C0'],
    ['255', '11111111', '255', 'FF'],
  ];
  for (const [input, b, d, h] of rows) {
    assert.deepEqual(
      [convertBetweenBases(input, 10, 2), convertBetweenBases(input, 10, 10), convertBetweenBases(input, 10, 16)]
        .map((r) => (r.ok ? r.output : r.error)),
      [b, d, h], input);
  }
});

test('parse: errors and normalization', () => {
  assert.deepEqual(parseIntegerInput('', 2), { ok: false, error: 'empty' });
  assert.deepEqual(parseIntegerInput('   ', 10), { ok: false, error: 'empty' });
  assert.deepEqual(parseIntegerInput('102', 2), { ok: false, error: 'invalid_binary' });
  assert.deepEqual(parseIntegerInput('12a', 10), { ok: false, error: 'invalid_decimal' });
  assert.deepEqual(parseIntegerInput('1,5', 10), { ok: false, error: 'invalid_decimal' });
  assert.deepEqual(parseIntegerInput('1.5', 10), { ok: false, error: 'fraction_not_supported' });
  assert.deepEqual(parseIntegerInput('10.1', 2), { ok: false, error: 'fraction_not_supported' });
  assert.deepEqual(parseIntegerInput('xyz', 16), { ok: false, error: 'invalid_hex' });
  assert.deepEqual(parseIntegerInput('-', 10), { ok: false, error: 'invalid_decimal' });
  assert.deepEqual(parseIntegerInput('1'.repeat(MAX_DIGITS + 1), 2), { ok: false, error: 'too_long' });

  const p = parseIntegerInput(' 0xc0_A8 ', 16);
  assert.ok(p.ok && p.value === 49320n && p.normalized === 'C0A8');
  const b = parseIntegerInput('0b1100 0000', 2);
  assert.ok(b.ok && b.value === 192n && b.normalized === '11000000');
  const lead = parseIntegerInput('000', 10);
  assert.ok(lead.ok && lead.value === 0n && lead.normalized === '0');
  const neg = parseIntegerInput('-0', 10);
  assert.ok(neg.ok && neg.value === 0n && !neg.negative && neg.normalized === '0');
});

test('negative values are signed magnitudes', () => {
  const r = convertBetweenBases('-10', 10, 2);
  assert.ok(r.ok && r.output === '-1010');
  const h = convertBetweenBases('-ff', 16, 10);
  assert.ok(h.ok && h.output === '-255');
});

test('large integers keep full precision', () => {
  const big = '123456789012345678901234567890123456789012345678901234567890';
  const r = convertBetweenBases(big, 10, 16);
  assert.ok(r.ok);
  const back = convertBetweenBases(r.output, 16, 10);
  assert.ok(back.ok && back.output === big);
  // beyond Number.MAX_SAFE_INTEGER
  const edge = convertBetweenBases('9007199254740993', 10, 2);
  assert.ok(edge.ok && edge.output === '100000000000000000000000000000000000000000000000000001');
});

test('formatInteger padding and grouping', () => {
  assert.equal(formatInteger(5n, 2, { minWidth: 8 }), '00000101');
  assert.equal(formatInteger(255n, 16), 'FF');
  assert.equal(groupFromRight('1100000010101000', 4), '1100 0000 1010 1000');
  assert.equal(groupFromRight('10101', 4), '1 0101');
});

test('decimalToBinarySteps: 192', () => {
  const s = decimalToBinarySteps(192n);
  assert.equal(s.result, '11000000');
  assert.equal(s.expression, '192 = 128 + 64');
  assert.deepEqual(s.rows.map((r) => r.remainder), [0, 0, 0, 0, 0, 0, 1, 1]);
  assert.equal(decimalToBinarySteps(0n).result, '0');
  assert.equal(decimalToBinarySteps(0n).expression, '0 = 0');
  assert.equal(decimalToBinarySteps(-5n).result, '101');
});

test('binaryToDecimalSteps: 11000000', () => {
  const s = binaryToDecimalSteps('11000000');
  assert.equal(s.total, 192n);
  assert.equal(s.expression, '1×2⁷ + 1×2⁶');
  assert.equal(s.sumExpression, '128 + 64');
  assert.equal(binaryToDecimalSteps('0').total, 0n);
  assert.throws(() => binaryToDecimalSteps('102'));
});

test('decimalToHexSteps and hexToDecimalSteps', () => {
  const s = decimalToHexSteps(192n);
  assert.equal(s.result, 'C0');
  assert.deepEqual(s.letterDigits, [{ digit: 'C', value: 12 }]);
  assert.equal(decimalToHexSteps(255n).result, 'FF');
  const h = hexToDecimalSteps('C0');
  assert.equal(h.total, 192n);
  assert.equal(h.expression, '12×16¹');
  assert.equal(hexToDecimalSteps('ff').total, 255n);
});

test('binary <-> hex steps do not change the value', () => {
  const s = binaryToHexSteps('11000000');
  assert.equal(s.paddedBy, 0);
  assert.deepEqual(s.groups, [{ bits: '1100', hex: 'C' }, { bits: '0000', hex: '0' }]);
  assert.equal(s.result, 'C0');
  const p = binaryToHexSteps('101');
  assert.equal(p.paddedBy, 1);
  assert.equal(p.padded, '0101');
  assert.equal(p.result, '5');
  assert.equal(hexToBinarySteps('A8').result, '10101000');
  assert.equal(hexToBinarySteps('0F').result, '1111');
  // exhaustive consistency over a range
  for (let n = 0; n < 5000; n++) {
    const b = n.toString(2);
    assert.equal(BigInt('0x' + binaryToHexSteps(b).result), BigInt(n));
    assert.equal(binaryToDecimalSteps(b).total, BigInt(n));
    assert.equal(hexToDecimalSteps(n.toString(16)).total, BigInt(n));
  }
});

test('getBitBreakdown', () => {
  const b = getBitBreakdown(192n);
  assert.equal(b.width, 8);
  assert.deepEqual(b.bits.map((x) => Number(x.place)), [128, 64, 32, 16, 8, 4, 2, 1]);
  assert.deepEqual(b.bits.map((x) => x.bit), [1, 1, 0, 0, 0, 0, 0, 0]);
  assert.equal(getBitBreakdown(256n).width, 16);
  assert.equal(getBitBreakdown(5n, 4).bits.length, 4);
  assert.throws(() => getBitBreakdown(16n, 4));
  assert.throws(() => getBitBreakdown(-1n));
});

// ------------------------------------------------------------ arithmetic

function arith(a: string, b: string, op: 'add' | 'sub' | 'mul' | 'div') {
  const r = binaryArithmetic(a, b, op);
  assert.ok(r.ok, `${a} ${op} ${b} should succeed`);
  return r.result;
}

test('required binary arithmetic (spec 17.3)', () => {
  assert.equal(arith('1010', '0011', 'add').binary, '1101');
  assert.equal(arith('1111', '0001', 'add').binary, '10000');
  assert.equal(arith('1000', '0001', 'sub').binary, '111');
  assert.equal(arith('101', '11', 'mul').binary, '1111');
  const d1 = arith('1100', '10', 'div');
  assert.deepEqual([d1.quotient, d1.remainder], ['110', '0']);
  const d2 = arith('1101', '10', 'div');
  assert.deepEqual([d2.quotient, d2.remainder], ['110', '1']);
  const z = binaryArithmetic('101', '0', 'div');
  assert.deepEqual(z, { ok: false, error: 'division_by_zero', operand: 'b' });
});

test('subtraction never wraps: negative result is signed and labeled', () => {
  const r = arith('1', '1000', 'sub');
  assert.equal(r.binary, '-111');
  assert.equal(r.decimal, '-7');
  assert.equal(r.negative, true);
  assert.ok(r.steps.kind === 'sub' && r.steps.swapped);
});

test('arithmetic input validation', () => {
  assert.deepEqual(binaryArithmetic('', '1', 'add'), { ok: false, error: 'empty', operand: 'a' });
  assert.deepEqual(binaryArithmetic('1', '12', 'add'), { ok: false, error: 'invalid_binary', operand: 'b' });
  assert.deepEqual(binaryArithmetic('-1', '1', 'add'), { ok: false, error: 'negative_operand', operand: 'a' });
});

test('add steps: long carry chain', () => {
  const r = arith('1111111111111111', '1', 'add');
  assert.equal(r.binary, '10000000000000000');
  assert.ok(r.steps.kind === 'add' && r.steps.finalCarry === 1);
  assert.ok(r.steps.kind === 'add' && r.steps.columns.every((c) => c.carryOut === 1));
});

test('arithmetic matches independent decimal arithmetic (exhaustive 0..40)', () => {
  for (let x = 0; x <= 40; x++) {
    for (let y = 0; y <= 40; y++) {
      const xb = x.toString(2);
      const yb = y.toString(2);
      assert.equal(arith(xb, yb, 'add').decimal, String(x + y));
      assert.equal(arith(xb, yb, 'sub').decimal, String(x - y));
      const m = arith(xb, yb, 'mul');
      assert.equal(m.decimal, String(x * y));
      if (m.steps.kind === 'mul') {
        const sum = m.steps.partials.reduce((acc, p) => acc + BigInt(p.decimal), 0n);
        assert.equal(sum, BigInt(x * y));
      }
      if (y !== 0) {
        const d = arith(xb, yb, 'div');
        const q = BigInt('0b' + d.quotient!);
        const rem = BigInt('0b' + d.remainder!);
        assert.equal(q, BigInt(Math.floor(x / y)));
        assert.equal(rem, BigInt(x % y));
        assert.equal(BigInt(y) * q + rem, BigInt(x)); // dividend = divisor × quotient + remainder
      }
    }
  }
});

test('subtraction columns reproduce the difference', () => {
  for (let x = 0; x <= 60; x++) {
    for (let y = 0; y <= 60; y++) {
      const r = arith(x.toString(2), y.toString(2), 'sub');
      assert.ok(r.steps.kind === 'sub');
      const bits = r.steps.columns.map((c) => c.diff).reverse().join('');
      assert.equal(BigInt('0b' + bits), BigInt(Math.abs(x - y)));
    }
  }
});

test('large operands stay exact', () => {
  const a = '1' + '0'.repeat(200);
  const r = arith(a, a, 'mul');
  assert.equal(r.binary, '1' + '0'.repeat(400));
});

// ------------------------------------------------------------------ IPv4

test('valid IPv4 (spec 17.4)', () => {
  for (const ip of ['192.168.1.10', '8.8.8.8', '127.0.0.1', '0.0.0.0', '255.255.255.255']) {
    assert.ok(parseIPv4(ip).ok, ip);
  }
  assert.ok(parseIPv4('  10.0.0.1  ').ok);
});

test('invalid IPv4 (spec 17.4)', () => {
  const cases: [string, string][] = [
    ['256.1.1.1', 'out_of_range'],
    ['192.168.1', 'wrong_parts'],
    ['192.168.1.10.5', 'wrong_parts'],
    ['192..1.10', 'empty_octet'],
    ['192.168.one.10', 'invalid_char'],
    ['-1.2.3.4', 'invalid_char'],
    ['1.2.3.999', 'out_of_range'],
    ['', 'empty'],
    ['01.2.3.4', 'leading_zero'],
    ['1.2.3.00', 'leading_zero'],
    ['1. 2.3.4', 'invalid_char'],
    ['1.2.3.4a', 'invalid_char'],
    ['1.2.3.', 'empty_octet'],
    ['abc', 'invalid_char'],
  ];
  for (const [ip, code] of cases) {
    const r = parseIPv4(ip);
    assert.ok(!r.ok && r.error === code, `${ip} -> expected ${code}, got ${JSON.stringify(r)}`);
  }
});

test('octets are always exactly 8 bits', () => {
  const expected: Record<number, string> = {
    0: '00000000', 1: '00000001', 10: '00001010', 64: '01000000', 127: '01111111',
    128: '10000000', 168: '10101000', 192: '11000000', 255: '11111111',
  };
  for (const [n, b] of Object.entries(expected)) assert.equal(octetToBinary(Number(n)), b);
  assert.throws(() => octetToBinary(256));
  assert.throws(() => octetToBinary(-1));
});

test('32-bit and hex output, computed not hardcoded', () => {
  const cases: [string, string, string][] = [
    ['0.0.0.0', '00000000.00000000.00000000.00000000', '00000000'],
    ['1.0.0.0', '00000001.00000000.00000000.00000000', '01000000'],
    ['127.0.0.1', '01111111.00000000.00000000.00000001', '7F000001'],
    ['192.168.1.10', '11000000.10101000.00000001.00001010', 'C0A8010A'],
    ['255.255.255.255', '11111111.11111111.11111111.11111111', 'FFFFFFFF'],
  ];
  for (const [ip, b32, hex] of cases) {
    const r = analyzeIPv4(ip);
    assert.ok(r.ok);
    assert.equal(r.analysis.binary32, b32, ip);
    assert.equal(r.analysis.binary32Compact.length, 32);
    assert.equal(r.analysis.hex, hex, ip);
  }
  const hi = analyzeIPv4('255.255.255.255');
  assert.ok(hi.ok && hi.analysis.uint32 === 4294967295); // not negative
  const o = parseIPv4('192.168.1.10');
  assert.ok(o.ok && ipv4ToHex(o.octets) === 'C0A8010A' && ipv4ToBinary32(o.octets).split('.').length === 4);
});

function cat(ip: string) {
  const p = parseIPv4(ip);
  assert.ok(p.ok, ip);
  return classifyIPv4(p.octets).category;
}

test('classification (spec 17.4)', () => {
  assert.equal(cat('127.0.0.1'), 'loopback');
  assert.equal(cat('192.168.1.10'), 'private_use');
  assert.notEqual(cat('8.8.8.8'), 'private_use');
  assert.equal(cat('8.8.8.8'), 'general');
  assert.equal(cat('255.255.255.255'), 'limited_broadcast');
  assert.equal(cat('0.0.0.0'), 'unspecified');
});

test('classification boundaries', () => {
  const table: [string, string][] = [
    ['9.255.255.255', 'general'], ['10.0.0.0', 'private_use'], ['10.255.255.255', 'private_use'], ['11.0.0.0', 'general'],
    ['172.15.255.255', 'general'], ['172.16.0.0', 'private_use'], ['172.31.255.255', 'private_use'], ['172.32.0.0', 'general'],
    ['192.167.255.255', 'general'], ['192.168.0.0', 'private_use'], ['192.168.255.255', 'private_use'], ['192.169.0.0', 'general'],
    ['100.63.255.255', 'general'], ['100.64.0.0', 'shared_address_space'], ['100.127.255.255', 'shared_address_space'], ['100.128.0.0', 'general'],
    ['126.255.255.255', 'general'], ['127.0.0.0', 'loopback'], ['127.255.255.255', 'loopback'], ['128.0.0.0', 'general'],
    ['169.253.255.255', 'general'], ['169.254.0.0', 'link_local'], ['169.254.255.255', 'link_local'], ['169.255.0.0', 'general'],
    ['198.17.255.255', 'general'], ['198.18.0.0', 'benchmarking'], ['198.19.255.255', 'benchmarking'], ['198.20.0.0', 'general'],
    ['192.0.2.1', 'documentation'], ['198.51.100.7', 'documentation'], ['203.0.113.9', 'documentation'],
    ['223.255.255.255', 'general'], ['224.0.0.0', 'multicast'], ['239.255.255.255', 'multicast'], ['240.0.0.0', 'reserved_future'],
    ['255.255.255.254', 'reserved_future'], ['255.255.255.255', 'limited_broadcast'],
    ['0.0.0.1', 'this_network'], ['0.255.255.255', 'this_network'], ['1.0.0.0', 'general'],
  ];
  for (const [ip, expected] of table) assert.equal(cat(ip), expected, ip);
});

test('historical classful labels', () => {
  assert.deepEqual(historicalClass(10), { label: 'A', caveat: false });
  assert.deepEqual(historicalClass(127), { label: 'A', caveat: true });
  assert.deepEqual(historicalClass(0), { label: 'A', caveat: true });
  assert.equal(historicalClass(128).label, 'B');
  assert.equal(historicalClass(191).label, 'B');
  assert.equal(historicalClass(192).label, 'C');
  assert.equal(historicalClass(223).label, 'C');
  assert.equal(historicalClass(224).label, 'D');
  assert.equal(historicalClass(239).label, 'D');
  assert.equal(historicalClass(240).label, 'E');
  assert.equal(historicalClass(255).label, 'E');
});

// ------------------------------------------------------------------- OCR

test('OCR candidates: extraction, flagging, validation', () => {
  const c = extractIPv4Candidates('Server IP: 192.168.1.10\nGateway (192.168.1.1).\nBad: 999.1.1.1 and O.O.O.O');
  const by = Object.fromEntries(c.map((x) => [x.suggested, x]));
  assert.ok(by['192.168.1.10'].valid && !by['192.168.1.10'].needsConfirmation);
  assert.ok(by['192.168.1.1'].valid);
  assert.ok(!by['999.1.1.1'].valid && by['999.1.1.1'].needsConfirmation);
  assert.ok(by['0.0.0.0'].corrected && by['0.0.0.0'].needsConfirmation && by['0.0.0.0'].raw === 'O.O.O.O');
});

test('OCR candidates: confusions are suggested, never silently trusted', () => {
  const [c] = extractIPv4Candidates('l92,168.l.l0');
  assert.equal(c.raw, 'l92,168.l.l0');
  assert.equal(c.suggested, '192.168.1.10');
  assert.ok(c.corrected && c.valid && c.needsConfirmation);
  assert.deepEqual(extractIPv4Candidates('hello world 1.2.3'), []);
  assert.deepEqual(extractIPv4Candidates('1.2.3.4.5'), []);
  assert.equal(extractIPv4Candidates('1.2.3.4 1.2.3.4').length, 1);
});

// ------------------------------------------------------------ challenges

test('challenge answers are computed, valid and checkable', () => {
  for (const type of CHALLENGE_TYPES) {
    for (const difficulty of ['easy', 'medium', 'hard'] as const) {
      for (let seed = 1; seed <= 60; seed++) {
        const ch = generateChallenge(type, difficulty, seed);
        assert.ok(ch.choices.includes(ch.answer), `${type}/${difficulty}/${seed} choices include answer`);
        assert.equal(new Set(ch.choices).size, ch.choices.length, 'choices unique');
        assert.equal(checkAnswer(ch, ch.answer).status, 'correct');
        for (const wrong of ch.choices.filter((c) => c !== ch.answer)) {
          assert.equal(checkAnswer(ch, wrong).status, 'wrong', `${type} ${wrong}`);
        }
      }
    }
  }
});

test('challenges are deterministic per seed and vary across seeds', () => {
  assert.deepEqual(generateChallenge('dec2bin', 'hard', 7), generateChallenge('dec2bin', 'hard', 7));
  const prompts = new Set<string>();
  for (let s = 0; s < 50; s++) prompts.add(generateChallenge('dec2hex', 'medium', s).prompt);
  assert.ok(prompts.size > 20);
});

test('challenge correctness spot checks', () => {
  for (let s = 0; s < 40; s++) {
    const c = generateChallenge('dec2hex', 'hard', s);
    assert.equal(BigInt('0x' + c.answer), BigInt(c.prompt));
    const o = generateChallenge('octet2bin', 'medium', s);
    assert.equal(o.answer.length, 8);
    assert.equal(parseInt(o.answer, 2), Number(o.prompt));
    const ip = generateChallenge('invalidIp', 'easy', s);
    assert.equal(ip.answer, parseIPv4(ip.prompt).ok ? 'valid' : 'invalid');
  }
  const kinds = new Set<string>();
  for (let s = 0; s < 80; s++) kinds.add(generateChallenge('invalidIp', 'easy', s).answer);
  assert.equal(kinds.size, 2);
});

test('answer format validation', () => {
  const ch = generateChallenge('dec2bin', 'easy', 3);
  assert.equal(checkAnswer(ch, '').status, 'invalid_format');
  assert.equal(checkAnswer(ch, '12').status, 'invalid_format');
  assert.equal(checkAnswer(generateChallenge('invalidIp', 'easy', 1), 'maybe').status, 'invalid_format');
  const o = generateChallenge('octet2bin', 'medium', 5);
  assert.equal(checkAnswer(o, String(parseInt(o.answer, 2).toString(2))).status, o.answer.startsWith('0') ? 'wrong' : 'correct');
});
