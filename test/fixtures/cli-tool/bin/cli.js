#!/usr/bin/env node

import { readFileSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';
import { parseArgs } from 'util';

const { values } = parseArgs({
  options: {
    help: { type: 'boolean', default: false },
    version: { type: 'boolean', default: false },
  },
});

if (values.version) {
  const __filename = fileURLToPath(import.meta.url);
  const __dirname = dirname(__filename);
  const packageJson = JSON.parse(readFileSync(join(__dirname, '../package.json'), 'utf8'));
  console.log(packageJson.version);
  process.exit(0);
}

if (values.help) {
  console.log('Usage: test-cli-tool [options]');
  console.log('');
  console.log('Options:');
  console.log('  --help     Show this help message');
  console.log('  --version  Show version number');
  process.exit(0);
}

console.log('Test CLI Tool');
