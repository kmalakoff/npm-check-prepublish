#!/usr/bin/env node

var args = process.argv.slice(2);

if (args.indexOf('--version') !== -1) {
  var pkg = require('../package.json');
  console.log(pkg.version);
  process.exit(0);
}

if (args.indexOf('--help') !== -1) {
  console.log('Usage: test-cli-tool [options]');
  console.log('');
  console.log('Options:');
  console.log('  --help     Show this help message');
  console.log('  --version  Show version number');
  process.exit(0);
}

console.log('Test CLI Tool');
