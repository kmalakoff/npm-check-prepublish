/**
 * CLI implementation for npm-check-prepublish
 *
 * Supports both ESM and CJS via the bin/cli.js wrapper
 */

import exit from 'exit-compat';
import { readFileSync } from 'fs';
import getopts from 'getopts-compat';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';
import { CheckPrepublish } from './checker.ts';
import { loadConfig, mergeConfig } from './config.ts';

const __dirname = dirname(typeof __filename !== 'undefined' ? __filename : fileURLToPath(import.meta.url));

function getVersion(): string {
  const packagePath = join(__dirname, '..', '..', 'package.json');
  const packageJson = JSON.parse(readFileSync(packagePath, 'utf8'));
  return packageJson.version;
}

function showHelp(): void {
  console.log(`
Usage: ncp [options]

Verify npm package before publishing.

Options:
  --help                        Show this help message
  --version                     Show version number
  --no-build                    Skip build step
  --no-check-required-files     Skip file verification
  --no-pack                     Skip npm pack + install
  --no-check-import             Skip module import check
  --no-check-bin                Skip CLI execution check

Configuration:
  Config can be specified in .ncprc.json or package.json "ncp" field.
  CLI flags override config file settings.

  Example .ncprc.json:
    {
      "skipCheckImport": true
    }

  Example package.json:
    {
      "ncp": {
        "skipCheckImport": true
      }
    }

Examples:
  ncp
  ncp --no-pack
  ncp --no-check-import
`);
}

export default async function cli(argv: string[]): Promise<void> {
  // getopts negates "--no-x" flags onto their positive name, so declare the positive names here.
  const options = getopts(argv, {
    boolean: ['help', 'version', 'build', 'check-required-files', 'pack', 'check-import', 'check-bin'],
    default: { build: true, 'check-required-files': true, pack: true, 'check-import': true, 'check-bin': true },
  });

  if (options.version) {
    console.log(getVersion());
    exit(0);
    return;
  }

  if (options.help) {
    showHelp();
    exit(0);
    return;
  }

  const packageDir = process.cwd();

  // Load config from .ncprc.json or package.json "ncp" field
  const fileConfig = loadConfig(packageDir);

  // CLI args (only set if explicitly passed)
  const cliConfig = {
    packageDir,
    skipBuild: options.build ? undefined : true,
    skipCheckRequiredFiles: options['check-required-files'] ? undefined : true,
    skipPackage: options.pack ? undefined : true,
    skipCheckImport: options['check-import'] ? undefined : true,
    skipCheckBin: options['check-bin'] ? undefined : true,
  };

  // Merge: CLI overrides file config
  const config = mergeConfig(fileConfig, cliConfig);

  const checker = new CheckPrepublish(config);
  const result = await checker.check();
  exit(result.success ? 0 : 1);
}
