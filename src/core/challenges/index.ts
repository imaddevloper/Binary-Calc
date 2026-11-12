/**
 * Challenge generator. Questions come from a seeded PRNG; every answer is
 * computed by the core engine (never hardcoded), and answers are checked by
 * parsing the user's input, not by string luck.
 */
import { formatInteger, parseIntegerInput } from '../number-systems/index.ts';
import type { Base } from '../number-systems/index.ts';
import { octetToBinary, parseIPv4 } from '../ipv4/index.ts';

export type Difficulty = 'easy' | 'medium' | 'hard';
export type ChallengeType =
  | 'dec2bin'
  | 'bin2dec'
  | 'dec2hex'
  | 'hex2dec'
  | 'bin2hex'
  | 'octet2bin'
  | 'invalidIp'
  | 'cidrHostBits'
  | 'maskPrefix'
  | 'privateIp'
  | 'networkOctet'
  | 'broadcastOctet';

export const CHALLENGE_TYPES: ChallengeType[] = [
  'dec2bin', 'bin2dec', 'dec2hex', 'hex2dec', 'bin2hex', 'octet2bin', 'invalidIp',
  'cidrHostBits', 'maskPrefix', 'privateIp', 'networkOctet', 'broadcastOctet',
];

export interface Challenge {
  type: ChallengeType;
  difficulty: Difficulty;
  /** The value shown to the user (a number, binary, hex string or an IP). */
  prompt: string;
  /** Canonical correct answer. */
  answer: string;
  /** Four shuffled choices (includes the answer). */
  choices: string[];
  /** Base for typed numeric answers; null for valid/invalid or yes/no choices. */
  answerBase: Base | null;
}

export function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const MAX_BY_DIFFICULTY: Record<Difficulty, number> = { easy: 15, medium: 255, hard: 65535 };

function randInt(rng: () => number, min: number, max: number): number {
  return min + Math.floor(rng() * (max - min + 1));
}

function shuffle<T>(rng: () => number, arr: T[]): T[] {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function numberChoices(rng: () => number, answer: number, min: number, max: number): string[] {
  const values = new Set<number>([answer]);
  while (values.size < 4) values.add(randInt(rng, min, max));
  return shuffle(rng, [...values].map(String));
}

function subnetMaskFromPrefix(prefix: number): string {
  const mask = prefix === 0 ? 0 : (0xffffffff << (32 - prefix)) >>> 0;
  return [24, 16, 8, 0].map((shift) => String((mask >>> shift) & 255)).join('.');
}

/** Distractors in the answer's base: nearby values, deduplicated, never equal to the answer. */
function distractors(rng: () => number, correct: bigint, base: Base, minWidth: number, max: number): string[] {
  const answer = formatInteger(correct, base, { minWidth });
  const set = new Set<string>();
  let guard = 0;
  while (set.size < 3 && guard++ < 200) {
    const delta = BigInt(randInt(rng, 1, Math.max(2, Math.min(max, 16))));
    const cand = rng() < 0.5 ? correct + delta : correct - delta;
    if (cand < 0n) continue;
    const s = formatInteger(cand, base, { minWidth });
    if (s !== answer) set.add(s);
  }
  // Fallback guarantees three distinct wrong options even for tiny ranges.
  let k = 1n;
  while (set.size < 3) {
    const s = formatInteger(correct + k, base, { minWidth });
    if (s !== answer) set.add(s);
    k += 1n;
  }
  return [...set];
}

function mutateIp(rng: () => number, o: number[]): string {
  const parts = o.map(String);
  switch (randInt(rng, 0, 5)) {
    case 0: parts[randInt(rng, 0, 3)] = String(randInt(rng, 256, 999)); return parts.join('.');
    case 1: return parts.slice(0, 3).join('.');
    case 2: return parts.concat(String(randInt(rng, 0, 255))).join('.');
    case 3: parts[randInt(rng, 0, 3)] = 'x'; return parts.join('.');
    case 4: { const i = randInt(rng, 0, 3); parts[i] = '0' + parts[i]; return parts.join('.'); }
    default: { const i = randInt(rng, 0, 2); parts.splice(i, 1, ''); return parts.join('.'); }
  }
}

export function generateChallenge(type: ChallengeType, difficulty: Difficulty, seed: number): Challenge {
  const rng = mulberry32(seed);
  const max = MAX_BY_DIFFICULTY[difficulty];
  const n = BigInt(randInt(rng, difficulty === 'easy' ? 1 : 16, max));

  let prompt: string;
  let answer: string;
  let answerBase: Base | null;
  let choices: string[];

  switch (type) {
    case 'dec2bin': {
      prompt = formatInteger(n, 10);
      answer = formatInteger(n, 2);
      answerBase = 2;
      choices = [answer, ...distractors(rng, n, 2, 0, max)];
      break;
    }
    case 'bin2dec': {
      prompt = formatInteger(n, 2);
      answer = formatInteger(n, 10);
      answerBase = 10;
      choices = [answer, ...distractors(rng, n, 10, 0, max)];
      break;
    }
    case 'dec2hex': {
      prompt = formatInteger(n, 10);
      answer = formatInteger(n, 16);
      answerBase = 16;
      choices = [answer, ...distractors(rng, n, 16, 0, max)];
      break;
    }
    case 'hex2dec': {
      prompt = formatInteger(n, 16);
      answer = formatInteger(n, 10);
      answerBase = 10;
      choices = [answer, ...distractors(rng, n, 10, 0, max)];
      break;
    }
    case 'bin2hex': {
      prompt = formatInteger(n, 2);
      answer = formatInteger(n, 16);
      answerBase = 16;
      choices = [answer, ...distractors(rng, n, 16, 0, max)];
      break;
    }
    case 'octet2bin': {
      const octet = Number(BigInt(randInt(rng, difficulty === 'easy' ? 0 : 16, difficulty === 'easy' ? 15 : 255)));
      prompt = String(octet);
      answer = octetToBinary(octet);
      answerBase = 2;
      choices = [answer, ...distractors(rng, BigInt(octet), 2, 8, 255).map((s) => s.slice(-8).padStart(8, '0'))];
      // slice/pad above can only collide if a distractor exceeded 8 bits; re-ensure uniqueness
      choices = [...new Set(choices)];
      let k = 1;
      while (choices.length < 4) {
        const alt = octetToBinary((octet + k) % 256);
        if (!choices.includes(alt)) choices.push(alt);
        k++;
      }
      break;
    }
    case 'invalidIp': {
      const base = [randInt(rng, 1, 223), randInt(rng, 0, 255), randInt(rng, 0, 255), randInt(rng, 1, 254)];
      prompt = rng() < 0.5 ? base.join('.') : mutateIp(rng, base);
      // The truth comes from the same validator the app uses.
      answer = parseIPv4(prompt).ok ? 'valid' : 'invalid';
      answerBase = null;
      choices = ['valid', 'invalid'];
      return { type, difficulty, prompt, answer, choices, answerBase };
    }
    case 'cidrHostBits': {
      const prefix = randInt(rng, difficulty === 'easy' ? 24 : 8, difficulty === 'hard' ? 30 : 30);
      const hostBits = 32 - prefix;
      prompt = `/${prefix}`;
      answer = String(hostBits);
      answerBase = 10;
      choices = numberChoices(rng, hostBits, 0, 32);
      break;
    }
    case 'maskPrefix': {
      const prefix = randInt(rng, difficulty === 'easy' ? 24 : 8, 30);
      prompt = subnetMaskFromPrefix(prefix);
      answer = String(prefix);
      answerBase = 10;
      choices = numberChoices(rng, prefix, 0, 32);
      break;
    }
    case 'privateIp': {
      const privateAddress = rng() < 0.5;
      if (privateAddress) {
        const range = randInt(rng, 0, 2);
        prompt = range === 0
          ? `10.${randInt(rng, 0, 255)}.${randInt(rng, 0, 255)}.${randInt(rng, 1, 254)}`
          : range === 1
            ? `172.${randInt(rng, 16, 31)}.${randInt(rng, 0, 255)}.${randInt(rng, 1, 254)}`
            : `192.168.${randInt(rng, 0, 255)}.${randInt(rng, 1, 254)}`;
      } else {
        prompt = rng() < 0.5 ? '8.8.8.8' : '1.1.1.1';
      }
      answer = privateAddress ? 'yes' : 'no';
      answerBase = null;
      choices = ['yes', 'no'];
      return { type, difficulty, prompt, answer, choices, answerBase };
    }
    case 'networkOctet':
    case 'broadcastOctet': {
      const prefix = randInt(rng, 24, 30);
      const host = randInt(rng, 1, 254);
      const blockSize = 2 ** (32 - prefix);
      const network = Math.floor(host / blockSize) * blockSize;
      const broadcast = network + blockSize - 1;
      prompt = `192.168.1.${host}/${prefix}`;
      const value = type === 'networkOctet' ? network : broadcast;
      answer = String(value);
      answerBase = 10;
      choices = numberChoices(rng, value, 0, 255);
      break;
    }
  }

  return { type, difficulty, prompt, answer, choices: shuffle(rng, choices.slice(0, 4)), answerBase };
}

export type AnswerCheck =
  | { status: 'invalid_format' }
  | { status: 'correct' }
  | { status: 'wrong' };

/** Validates the typed/selected answer's format first, then compares values. */
export function checkAnswer(ch: Challenge, input: string): AnswerCheck {
  if (ch.answerBase === null) {
    const v = input.trim().toLowerCase();
    const allowed = ch.type === 'privateIp' ? ['yes', 'no'] : ['valid', 'invalid'];
    if (!allowed.includes(v)) return { status: 'invalid_format' };
    return { status: v === ch.answer ? 'correct' : 'wrong' };
  }
  const given = parseIntegerInput(input, ch.answerBase);
  if (!given.ok || given.negative) return { status: 'invalid_format' };
  const expected = parseIntegerInput(ch.answer, ch.answerBase);
  if (!expected.ok) return { status: 'invalid_format' };
  if (given.value !== expected.value) return { status: 'wrong' };
  // IPv4 octets must be written with all 8 bits.
  if (ch.type === 'octet2bin' && given.normalized.length !== 8 && input.replace(/[ _]/g, '').length !== 8) {
    return { status: 'wrong' };
  }
  return { status: 'correct' };
}
