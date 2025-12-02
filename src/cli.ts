/**
 * CLI implementation for npm-check-prepublish
 *
 * Supports both ESM and CJS via the bin/cli.js wrapper
 */

import { readFileSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';
import { parseArgs } from 'util';
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
  const { values } = parseArgs({
    args: argv,
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
    console.log(getVersion());
    process.exit(0);
  }

  if (values.help) {
    showHelp();
    process.exit(0);
  }

  const packageDir = process.cwd();

  // Load config from .ncprc.json or package.json "ncp" field
  const fileConfig = loadConfig(packageDir);

  // CLI args (only set if explicitly passed)
  const cliConfig = {
    packageDir,
    skipBuild: values['no-build'] || undefined,
    skipCheckRequiredFiles: values['no-check-required-files'] || undefined,
    skipPackage: values['no-pack'] || undefined,
    skipCheckImport: values['no-check-import'] || undefined,
    skipCheckBin: values['no-check-bin'] || undefined,
  };

  // Merge: CLI overrides file config
  const config = mergeConfig(fileConfig, cliConfig);

  const checker = new CheckPrepublish(config);
  const result = await checker.check();
  process.exit(result.success ? 0 : 1);
}
