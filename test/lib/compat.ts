/**
 * Compatibility Layer for Node.js 0.8+
 * Local to this package - contains only needed functions.
 */
import assert from 'assert';

/**
 * Array.prototype.find wrapper for Node.js 0.8+
 * - Uses native find on Node 4.0+ / ES2015+
 * - Falls back to loop on Node 0.8-3.x
 */
const hasArrayFind = typeof Array.prototype.find === 'function';

export function arrayFind<T>(arr: T[], predicate: (item: T) => boolean): T | undefined {
  if (hasArrayFind) {
    return arr.find(predicate);
  }
  for (let i = 0; i < arr.length; i++) {
    if (predicate(arr[i])) {
      return arr[i];
    }
  }
  return undefined;
}

/**
 * Array.prototype.includes wrapper for Node.js 0.8+
 * - Uses native includes on Node 6.0+ / ES2016+
 * - Falls back to indexOf on Node 0.8-5.x
 */
const hasArrayIncludes = typeof Array.prototype.includes === 'function';
export function arrayIncludes<T>(arr: T[], item: T): boolean {
  if (hasArrayIncludes) return arr.includes(item);
  return arr.indexOf(item) !== -1;
}

/**
 * String.prototype.endsWith wrapper for Node.js 0.8+
 * - Uses native endsWith on Node 4.0+ / ES2015+
 * - Falls back to indexOf on Node 0.8-3.x
 */
const hasEndsWith = typeof String.prototype.endsWith === 'function';
export function stringEndsWith(str: string, search: string, position?: number): boolean {
  if (hasEndsWith) return str.endsWith(search, position);
  const len = position === undefined ? str.length : position;
  return len >= search.length && str.lastIndexOf(search) === len - search.length;
}

/**
 * String.prototype.includes wrapper for Node.js 0.8+
 * - Uses native includes on Node 4.0+ / ES2015+
 * - Falls back to indexOf on Node 0.8-3.x
 */
const hasStringIncludes = typeof String.prototype.includes === 'function';
export function stringIncludes(str: string, search: string): boolean {
  if (hasStringIncludes) return str.includes(search);
  return str.indexOf(search) !== -1;
}

function deepEqual(a: unknown, b: unknown): boolean {
  if (a === b) return true;
  if (typeof a !== typeof b || a === null || b === null || typeof a !== 'object') return false;
  const aIsArray = Array.isArray(a);
  if (aIsArray !== Array.isArray(b)) return false;
  if (aIsArray) {
    const aArr = a as unknown[];
    const bArr = b as unknown[];
    return aArr.length === bArr.length && aArr.every((v, i) => deepEqual(v, bArr[i]));
  }
  const aKeys = Object.keys(a as Record<string, unknown>);
  const bKeys = Object.keys(b as Record<string, unknown>);
  return aKeys.length === bKeys.length && aKeys.every((key) => deepEqual((a as Record<string, unknown>)[key], (b as Record<string, unknown>)[key]));
}

/**
 * assert.deepStrictEqual wrapper for Node.js 0.8+
 * - Uses native assert.deepStrictEqual on Node 1.2.0+
 * - Falls back to a recursive deep-equal check on Node 0.8-1.1
 */
const hasDeepStrictEqual = typeof assert.deepStrictEqual === 'function';
export function assertDeepStrictEqual(actual: unknown, expected: unknown, message?: string): void {
  if (hasDeepStrictEqual) {
    if (message === undefined) assert.deepStrictEqual(actual, expected);
    else assert.deepStrictEqual(actual, expected, message);
    return;
  }
  assert.ok(deepEqual(actual, expected), message || `${JSON.stringify(actual)} deepStrictEqual ${JSON.stringify(expected)}`);
}
