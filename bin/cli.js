#!/usr/bin/env node

/**
 * CLI for npm-check-prepublish
 *
 * Uses parseArgs for proper CLI argument parsing
 */

import { readFileSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';
import { parseArgs } from 'util';
import { CheckPrepublish } from '../dist/esm/index.js';

const { values } = parseArgs({
  options: {
    help: {
      type: 'boolean',
      default: false,
    },
    version: {
      type: 'boolean',
      default: false,
    },
    'no-build': {
      type: 'boolean',
      default: false,
    },
    'no-check-required-files': {
      type: 'boolean',
      default: false,
    },
    'no-pack': {
      type: 'boolean',
      default: false,
    },
    'no-check-import': {
      type: 'boolean',
      default: false,
    },
    'no-check-bin': {
      type: 'boolean',
      default: false,
    },
  },
});

if (values.version) {
  // Read version from package.json
  const __filename = fileURLToPath(import.meta.url);
  const __dirname = dirname(__filename);
  const packageJson = JSON.parse(readFileSync(join(__dirname, '../package.json'), 'utf8'));
  console.log(packageJson.version);
  process.exit(0);
}

if (values.help) {
  console.log(`
Usage: npm-check-prepublish [options]

Options:
  --help                        Show this help message
  --version                     Show version number
  --no-build                    Skip build step
  --no-check-required-files     Skip file verification
  --no-pack                     Skip npm pack + install
  --no-check-import             Skip module import check
  --no-check-bin                Skip CLI execution check

Examples:
  npm-check-prepublish
  npm-check-prepublish --no-pack
`);
  process.exit(0);
}

const checker = new CheckPrepublish({
  packageDir: process.cwd(),
  skipBuild: values['no-build'],
  skipCheckRequiredFiles: values['no-check-required-files'],
  skipPackage: values['no-pack'],
  skipCheckImport: values['no-check-import'],
  skipCheckBin: values['no-check-bin'],
});

const result = await checker.check();
process.exit(result.success ? 0 : 1);
