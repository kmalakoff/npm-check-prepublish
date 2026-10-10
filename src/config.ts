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
 *
 * A missing file falls through to the next source; a file that exists but cannot be read or parsed throws.
 */

import { existsSync } from 'fs';
import { join } from 'path';
import readJsonFile from './lib/readJsonFile.ts';
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
 * @throws If a config file exists but cannot be read or parsed; the message names the file
 */
export function loadConfig(packageDir: string = process.cwd()): FileConfig {
  // Try .ncprc.json first (higher priority)
  const ncprcPath = join(packageDir, '.ncprc.json');
  if (existsSync(ncprcPath)) return readJsonFile(ncprcPath) as FileConfig;

  // Fall back to package.json "ncp" field
  const packageJsonPath = join(packageDir, 'package.json');
  if (existsSync(packageJsonPath)) {
    const packageJson = readJsonFile(packageJsonPath);
    if (packageJson.ncp && typeof packageJson.ncp === 'object') {
      return packageJson.ncp as FileConfig;
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
