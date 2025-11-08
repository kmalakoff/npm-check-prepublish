# Architecture & Design Decisions

## Overview

`npm-check-prepublish` is a reusable library that extracts the common verification logic from all MCP server packages. It provides a standardized way to test packages before publishing.

## Design Goals

1. **DRY Principle**: Eliminate duplicate code across 5+ server packages
2. **Flexibility**: Allow customization while providing sensible defaults
3. **Type Safety**: Fully typed TypeScript API
4. **Production-Grade**: Use @mcpeasy/cli for robust process management
5. **Easy Migration**: Simple migration path from standalone scripts

## Core Architecture

### Class-Based Design

```
CheckPrepublish
├── Configuration (VerifierConfig)
├── Phase 1: Built Package Verification
│   ├── Build package
│   ├── Verify file structure
│   ├── Start server
│   ├── Run custom tests
│   └── Cleanup
└── Phase 2: Production Simulation
    ├── Create tarball (npm pack)
    ├── Install in temp directory
    ├── Verify package contents
    ├── Start installed server
    ├── Run custom tests
    └── Cleanup
```

### Key Design Decisions

#### 1. Configuration-Based Approach

Instead of inheritance or complex abstractions, we use a simple configuration object:

```typescript
interface VerifierConfig {
  // Required
  packageDir: string;
  packageName: string;
  serverName: string;

  // Optional with sensible defaults
  requiredFiles?: string[];
  excludedPaths?: string[];
  envFile?: string;
  buildCommand?: string;
  serverBin?: string;
  serverArgs?: string[];
  runPhase2?: boolean;

  // Hooks for customization
  setupEnv?: (phase: 1 | 2, isProduction: boolean) => Record<string, string>;
  testBuiltPackage?: (client: Client) => Promise<void>;
  testInstalledPackage?: (client: Client) => Promise<void>;
}
```

**Why?**
- Simple to understand and use
- No need to learn class hierarchies
- Easy to add new options
- Clear separation of concerns

#### 2. Hook-Based Testing

Custom tests are provided via async functions that receive an MCP client:

```typescript
async testBuiltPackage(client) {
  const result = await client.callTool({
    name: 'my-tool',
    arguments: { /* ... */ },
  });

  if (!result.content) {
    throw new Error('Tool failed');
  }
}
```

**Why?**
- Each package has different tools to test
- Allows full control over test logic
- Errors propagate naturally via exceptions
- Client is already connected and ready

#### 3. Two-Phase Separation

Phase 1 and Phase 2 are clearly separated with independent test hooks:

```typescript
setupEnv(phase, isProduction) {
  if (phase === 1) {
    // Development environment
    return { ...process.env, LOG_LEVEL: 'error' };
  }
  // Phase 2: Minimal production environment
  return { LOG_LEVEL: 'error', API_KEY: process.env.API_KEY };
}
```

**Why?**
- Different phases need different environments
- Phase 1 can use full `process.env`
- Phase 2 should use minimal env (production simulation)
- Clear which phase is running

#### 4. Smart Package Path Detection

Handles both scoped and non-scoped packages:

```typescript
private getInstalledPackagePath(testDir: string): string {
  const packageName = this.packageJson.name;

  if (packageName.startsWith('@')) {
    const [scope, name] = packageName.split('/');
    return join(testDir, 'node_modules', scope, name);
  }

  return join(testDir, 'node_modules', packageName);
}
```

**Why?**
- Works with `@mcpeasy/mcp-pdf` and `mcp-pdf` formats
- No need for users to specify node_modules path
- Handles npm's directory structure automatically

#### 5. Sensible Defaults

Every server needs similar files, so we provide defaults:

```typescript
const DEFAULT_REQUIRED_FILES = [
  'bin/server.js',
  'dist/esm/index.js',
  'dist/cjs/index.js',
  'dist/esm/index.d.ts',
  'package.json',
];

const DEFAULT_EXCLUDED_PATHS = ['test', 'src'];
```

**Why?**
- 80% of packages use the same structure
- Reduces boilerplate in check scripts
- Can be overridden when needed
- Documents expected structure

## Reusability Analysis

### What's Shared (90% of code)

- Build execution
- File structure verification
- Tarball creation and installation
- Package path detection
- Server startup orchestration
- Client connection management
- Cleanup and error handling
- Logging and output formatting

### What's Custom (10% of code)

- Which tools to test
- Tool arguments
- Expected responses
- Environment variables
- OAuth/credentials setup

## Migration Impact

### Before (Per Package)

Each package had ~350 lines of verification code:
- `check-package.ts` (350 lines)
- Duplicated across 5+ packages
- Total: ~1,750+ lines

### After (With npm-check-prepublish)

Each package has ~50 lines:
- Import CheckPrepublish
- Configure
- Define custom tests
- Total: ~250 lines + shared library

**Savings**: ~1,500 lines of duplicated code eliminated

### Maintenance Benefits

**Before**: Fix a bug in verification → Update 5+ files
**After**: Fix a bug in verification → Update 1 file, all packages benefit

## API Design Principles

### 1. Progressive Disclosure

Start simple:
```typescript
new CheckPrepublish({
  packageDir: PACKAGE_DIR,
  packageName: '@mcpeasy/mcp-pdf',
  serverName: 'pdf',
});
```

Add complexity as needed:
```typescript
new CheckPrepublish({
  packageDir: PACKAGE_DIR,
  packageName: '@mcpeasy/mcp-pdf',
  serverName: 'pdf',
  envFile: '.env.test',
  setupEnv: async (phase) => { /* custom */ },
  testBuiltPackage: async (client) => { /* custom */ },
});
```

### 2. Type Safety

Full TypeScript support:
- All options are typed
- MCP Client is properly typed
- Result objects are typed
- IDE autocomplete works

### 3. Fail Fast

Errors are thrown immediately:
- Missing required files → Error in Phase 1
- Missing dependencies → Error in Phase 2
- Tool failures → Test throws error
- Invalid config → Error on construction

### 4. Clear Feedback

Output is color-coded and structured:
```
=========================================
Phase 1: Built Package Verification
=========================================

Package: @mcpeasy/mcp-pdf@1.2.0

Building package...
✅ Build successful

Verifying package structure...
✅ Package structure valid
```

## Extension Points

### Current Hooks

1. `setupEnv`: Customize environment variables
2. `testBuiltPackage`: Custom Phase 1 tests
3. `testInstalledPackage`: Custom Phase 2 tests

### Future Extension Ideas

1. **Pre/Post Build Hooks**: Run commands before/after build
2. **Custom Validators**: Register file validators
3. **Parallel Testing**: Test multiple tools concurrently
4. **Report Generation**: JSON/HTML test reports
5. **Performance Metrics**: Track server startup time
6. **Snapshot Testing**: Compare outputs with snapshots

## Dependencies

### Runtime Dependencies

- `@mcpeasy/cli`: Server spawning and management
- `@modelcontextprotocol/sdk`: MCP client types
- `dotenv`: Environment file loading

**Why these dependencies?**
- Already used by all MCP servers
- Production-tested
- No additional install burden

### Dev Dependencies

- Standard TypeScript tooling
- No test framework (yet) - packages test themselves

## File Structure

```
package-checker/
├── src/
│   ├── index.ts          # Public API exports
│   ├── types.ts          # TypeScript interfaces
│   ├── checker.ts       # Core CheckPrepublish class
│   └── logger.ts         # ANSI logging utility
├── package.json
├── tsconfig.json
├── biome.json           # Code formatting
├── README.md            # User documentation
├── EXAMPLES.md          # Usage examples
├── ARCHITECTURE.md      # This file
└── LICENSE
```

## Future Considerations

### Potential Improvements

1. **Caching**: Cache npm pack tarballs for faster re-runs
2. **Parallel Execution**: Run Phase 1 and Phase 2 in parallel (when safe)
3. **Watch Mode**: Re-run verification on file changes
4. **Custom Reporters**: Pluggable output formats
5. **CI Integration**: GitHub Actions helper
6. **Benchmark Mode**: Track verification performance over time

### Non-Goals

- **Not a test framework**: Doesn't replace unit tests
- **Not a build tool**: Doesn't handle building
- **Not a publish tool**: Doesn't publish to npm
- **Not package-specific**: Won't have special code for each package type

## Conclusion

This design balances:
- **Simplicity**: Easy to use and understand
- **Flexibility**: Customizable for different packages
- **Robustness**: Production-grade error handling
- **Maintainability**: Single source of truth for verification logic

The hook-based approach allows each package to define its unique test logic while sharing the common verification infrastructure.
