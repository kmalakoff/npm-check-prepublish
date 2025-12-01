# npm-check-prepublish

Verification tool for npm prepublishing packages (modules, CLI tools).

## What It Does

Verifies your npm package works correctly **before** publishing. Catches common packaging issues that break production installations.

Supports 2 package types:
1. **Normal modules** - Verifies build, files, and import
2. **CLI tools** - Verifies build, files, and execution

## Installation

```bash
npm install --save-dev npm-check-prepublish
```

## Usage

### Quick Start

```bash
# In your package directory
npx npm-check-prepublish
```

### Programmatic Usage

```typescript
import { CheckPrepublish } from 'npm-check-prepublish';

const checker = new CheckPrepublish();

const result = await checker.check();
process.exit(result.success ? 0 : 1);
```

### Add to package.json

```json
{
  "scripts": {
    "check": "npm-check-prepublish",
    "prepublishOnly": "npm run build && npm run check"
  }
}
```

## Verification Steps

### Step 1: Build Verification
- Runs `npm run build` if `scripts.build` exists
- Skips if no build script (no error)
- Skip with: `--no-build`

### Step 2: File Verification
- Auto-detects required files from package.json (`main`, `module`, `types`, `bin`)
- Verifies all files exist
- Skip with: `--no-check-required-files`

### Step 3: Package Verification
- Creates tarball with `npm pack`
- Installs in temp directory with `--production`
- Verifies files exist in installed package
- Verifies excluded files (src/, test/, .env*) are NOT in package
- Skip with: `--no-pack`

### Step 4: Runtime Verification (Type-Specific)

#### Normal Module
- Tries to import the module
- Skip with: `--no-check-import`

#### CLI Tool
- Runs the CLI with `--version`
- Skip with: `--no-check-bin`

## Package Type Detection

Auto-detected from package.json:

| Field | Type Detected |
|-------|--------------|
| Has `bin` | CLI Tool |
| Neither | Normal Module |

## Configuration

### Config Object

```typescript
interface VerifyConfig {
  packageDir?: string;           // default: process.cwd()
  requiredFiles?: string[];      // append to auto-detected

  // Skip flags
  skipBuild?: boolean;
  skipCheckRequiredFiles?: boolean;
  skipPackage?: boolean;
  skipCheckImport?: boolean;
  skipCheckBin?: boolean;
}
```

### CLI Flags

```bash
# Skip flags
--no-build                    # Skip build step
--no-check-required-files     # Skip file verification
--no-pack                     # Skip npm pack + install
--no-check-import             # Skip module import (modules)
--no-check-bin                # Skip CLI execution (CLI tools)
```

## Examples

### Example 1: Normal Module

**package.json**:
```json
{
  "name": "my-utils",
  "main": "./dist/index.js",
  "scripts": {
    "build": "tsc",
    "check": "npm-check-prepublish"
  }
}
```

**Run**:
```bash
npm run check
```

Verifies import works.

### Example 2: CLI Tool

**package.json**:
```json
{
  "name": "my-cli",
  "bin": {
    "my-cli": "bin/cli.js"
  },
  "scripts": {
    "build": "tsc",
    "check": "npm-check-prepublish"
  }
}
```

**Run**:
```bash
npm run check
```

Verifies CLI runs with `--version`.

## Why Use This?

### Common Issues This Catches

1. **Missing Production Dependencies** - Dependency in `devDependencies` but needed at runtime
2. **Excluded Source Files** - `src/` directory accidentally included in package
3. **Wrong Build Artifacts** - Built files missing or in wrong location
4. **Broken Imports** - Module can't be imported after install
5. **CLI Execution Failures** - Binary not executable or missing

### Real-World Example

```typescript
// ❌ This works in development but breaks in production:
import config from '../../config.json';

// ✅ Verification catches this because config.json is in excluded src/
```

## Integration with CI/CD

```json
{
  "scripts": {
    "prepublishOnly": "npm run build && npm run check"
  }
}
```

This ensures you can't publish a broken package.

## API

### `new CheckPrepublish(config)`

Creates a checker instance.

### `checker.check(): Promise<VerificationResult>`

Runs verification and returns result.

**Returns**:
```typescript
{
  success: boolean,
  errors: Error[]
}
```

## License

MIT
