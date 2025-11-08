/**
 * npm-check-prepublish
 *
 * Production-grade verification tool for npm packages (modules, CLI tools, MCP servers)
 *
 * @example
 * ```typescript
 * import { CheckPrepublish } from 'npm-check-prepublish';
 *
 * const checker = new CheckPrepublish({
 *   testFile: './scripts/check-tests.ts',
 * });
 *
 * const result = await checker.check();
 * process.exit(result.success ? 0 : 1);
 * ```
 */

export { CheckPrepublish } from './checker.ts';
export type {
  Logger,
  PackageInfo,
  PackageType,
  VerificationResult,
  VerifyConfig,
} from './types.js';
