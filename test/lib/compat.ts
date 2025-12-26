/**
 * Compatibility Layer for Node.js 0.8+
 * Local to this package - contains only needed functions.
 */

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
 * String.prototype.endsWith wrapper for Node.js 0.8+
 * - Uses native endsWith on Node 4.0+ / ES2015+
 * - Falls back to indexOf on Node 0.8-3.x
 */
const hasEndsWith = typeof String.prototype.endsWith === 'function';
export function stringEndsWith(str: string, search: string, position?: number): boolean {
  if (hasEndsWith) return str.endsWith(search, position);
  const len = position === undefined ? str.length : position;
  return str.lastIndexOf(search) === len - search.length;
}
