# npm-check-prepublish

Verification tool for npm prepublishing packages (modules, CLI tools, MCP servers).

## What It Does

Verifies your npm package works correctly **before** publishing. Catches common packaging issues that break production installations.

Supports 3 package types:
1. **Normal modules** - Verifies build, files, and import
2. **CLI tools** - Verifies build, files, and execution
3. **MCP servers** - Verifies build, files, server startup, and custom tests

## Installation

```bash
npm install --save-dev npm-check-prepublish @mcpeasy/cli
```

## Usage

### Quick Start

```bash
# In your package directory
npx npm-check-prepublish

# With custom tests (for MCP servers)
npx npm-check-prepublish --test-file ./scripts/check-tests.ts
```

### Programmatic Usage

```typescript
import { CheckPrepublish } from 'npm-check-prepublish';

const checker = new CheckPrepublish({
  testFile: './scripts/check-tests.ts',
});

const result = await checker.check();
process.exit(result.success ? 0 : 1);
```

### Add to package.json

```json
{
  "scripts": {
    "check": "npm-check-prepublish --test-file ./scripts/check-tests.ts",
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

#### MCP Server
- Starts server and connects client
- Runs custom tests from `testFile` (if provided)
- Skip with: `--no-check-mcp-server`

## Package Type Detection

Auto-detected from package.json:

| Field | Type Detected |
|-------|--------------|
| Has `mcpName` | MCP Server |
| Has `bin` | CLI Tool |
| Neither | Normal Module |

## Configuration

### Config Object

```typescript
interface VerifyConfig {
  packageDir?: string;           // default: process.cwd()
  requiredFiles?: string[];      // append to auto-detected
  testFile?: string;             // NO DEFAULT (must specify)

  // Skip flags
  skipBuild?: boolean;
  skipCheckRequiredFiles?: boolean;
  skipPackage?: boolean;
  skipCheckImport?: boolean;
  skipCheckBin?: boolean;
  skipCheckMcpServer?: boolean;
}
```

### CLI Flags

```bash
--test-file <path>            # Path to custom test file

# Skip flags
--no-build                    # Skip build step
--no-check-required-files     # Skip file verification
--no-pack                     # Skip npm pack + install
--no-check-import             # Skip module import (modules)
--no-check-bin                # Skip CLI execution (CLI tools)
--no-check-mcp-server         # Skip server startup (MCP servers)
```

## Custom Tests

For MCP servers and CLI tools, create a test file:

**File**: `scripts/check-tests.ts`

```typescript
import type { Client } from '@modelcontextprotocol/sdk/client/index.js';

// Setup environment (optional)
import { config } from 'dotenv';
config({ path: '.env.test' });

// For MCP servers - test your tools
export async function testMcpServer(client: Client): Promise<void> {
  const result = await client.callTool({
    name: 'my-tool',
    arguments: { content: 'Test' },
  });

  if (!result.content) {
    throw new Error('Tool failed');
  }
}

// For CLI tools - test commands
export async function testCliTool(binPath: string): Promise<void> {
  const { execSync } = await import('child_process');
  const output = execSync(`${binPath} --help`, { encoding: 'utf-8' });

  if (!output.includes('Usage')) {
    throw new Error('Help command failed');
  }
}
```

Then run:
```bash
npx npm-check-prepublish --test-file ./scripts/check-tests.ts
```

## Examples

### Example 1: MCP Server (mcp-pdf)

**package.json**:
```json
{
  "name": "@mcpeasy/mcp-pdf",
  "mcpName": "io.github.kmalakoff/mcp-pdf",
  "main": "./dist/cjs/index.js",
  "bin": "bin/server.js",
  "scripts": {
    "build": "tsds build",
    "prepublishOnly": "tsds validate",
    "check": "npm-check-prepublish --test-file ./scripts/check-tests.ts"
  }
}
```

**scripts/check-tests.ts**:
```typescript
export async function testMcpServer(client) {
  const result = await client.callTool({
    name: 'create-simple-pdf',
    arguments: { content: 'Test' },
  });
  if (!result.content) throw new Error('Failed');
}
```

**Run**:
```bash
npm run check
```

### Example 2: Normal Module

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

No test file needed - just verifies import works.

### Example 3: CLI Tool

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
6. **MCP Server Issues** - Server won't start or tools don't work

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

## Server Name Extraction (MCP Servers)

For MCP servers, the server name is extracted from package metadata:

| mcpName | Package Name | Server Name |
|---------|--------------|-------------|
| `io.github.kmalakoff/mcp-pdf` | `@mcpeasy/mcp-pdf` | `mcp-pdf` |
| `io.github.mcp-z/mcp-gmail` | `@mcpeasy/mcp-gmail` | `mcp-gmail` |
| (none) | `@mcpeasy/mcp-sheets` | `mcp-sheets` |

**Logic**:
1. PRIMARY: Extract from `mcpName` (part after `/`)
2. FALLBACK: Extract from package name (remove scope)
3. Keep `mcp-` prefix

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
