/**
 * Configuration file loader for npm-check-prepublish
 *
 * Supports:
 * - .ncprc.json (JSON)
 * - package.json "ncp" field
 *
 * Priority (highest to lowest):
 * 1. CLI arguments (handled by caller)
 * 2. .ncprc.json file
 * 3. package.json "ncp" field
 * 4. Defaults
 */

import { existsSync, readFileSync } from 'fs';
import { join } from 'path';
import type { VerifyConfig } from './types.ts';

/**
 * Configuration options that can be specified in config files
 * (subset of VerifyConfig - excludes runtime-only options like logger)
 */
export interface FileConfig {
  requiredFiles?: string[];
  skipBuild?: boolean;
  skipCheckRequiredFiles?: boolean;
  skipPackage?: boolean;
  skipCheckImport?: boolean;
  skipCheckBin?: boolean;
}

/**
 * Load configuration from .ncprc.json or package.json "ncp" field
 *
 * @param packageDir - Directory to search for config files (defaults to cwd)
 * @returns Loaded configuration or empty object if no config found
 */
export function loadConfig(packageDir: string = process.cwd()): FileConfig {
  // Try .ncprc.json first (higher priority)
  const ncprcPath = join(packageDir, '.ncprc.json');
  if (existsSync(ncprcPath)) {
    try {
      const content = readFileSync(ncprcPath, 'utf8');
      return JSON.parse(content) as FileConfig;
    } catch {
      // Invalid JSON in .ncprc.json - silently ignore
    }
  }

  // Fall back to package.json "ncp" field
  const packageJsonPath = join(packageDir, 'package.json');
  if (existsSync(packageJsonPath)) {
    try {
      const content = readFileSync(packageJsonPath, 'utf8');
      const packageJson = JSON.parse(content);
      if (packageJson.ncp && typeof packageJson.ncp === 'object') {
        return packageJson.ncp as FileConfig;
      }
    } catch {
      // Invalid package.json - silently ignore
    }
  }

  return {};
}

/**
 * Merge file config with CLI options
 * CLI options take precedence over file config
 *
 * @param fileConfig - Config loaded from file
 * @param cliConfig - Config from CLI arguments
 * @returns Merged configuration
 */
export function mergeConfig(fileConfig: FileConfig, cliConfig: Partial<VerifyConfig>): Partial<VerifyConfig> {
  return {
    // Start with non-skip options from cliConfig
    packageDir: cliConfig.packageDir,
    logger: cliConfig.logger,
    // Merge skip flags: CLI wins if explicitly set, otherwise use file config
    skipBuild: cliConfig.skipBuild ?? fileConfig.skipBuild,
    skipCheckRequiredFiles: cliConfig.skipCheckRequiredFiles ?? fileConfig.skipCheckRequiredFiles,
    skipPackage: cliConfig.skipPackage ?? fileConfig.skipPackage,
    skipCheckImport: cliConfig.skipCheckImport ?? fileConfig.skipCheckImport,
    skipCheckBin: cliConfig.skipCheckBin ?? fileConfig.skipCheckBin,
    // Merge arrays: combine both sources
    requiredFiles: [...(fileConfig.requiredFiles || []), ...(cliConfig.requiredFiles || [])],
  };
}
