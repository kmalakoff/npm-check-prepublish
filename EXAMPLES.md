# Usage Examples

## Example 1: mcp-pdf (No Authentication)

Simple package with PDF generation tools - no OAuth/credentials needed.

```typescript
#!/usr/bin/env node
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';
import { CheckPrepublish } from 'npm-check-prepublish';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const PACKAGE_DIR = join(__dirname, '..');

const checker = new CheckPrepublish({
  packageDir: PACKAGE_DIR,
  packageName: '@mcpeasy/mcp-pdf',
  serverName: 'pdf',

  async testBuiltPackage(client) {
    // Test create-simple-pdf tool
    const simplePdfResult = await client.callTool({
      name: 'create-simple-pdf',
      arguments: {
        content: 'Test verification document',
        filename: 'check-test.pdf',
      },
    });

    if (!simplePdfResult.content && !simplePdfResult.structuredContent) {
      throw new Error('create-simple-pdf tool returned no content');
    }

    // Test generate-resume-pdf tool
    const resumeResult = await client.callTool({
      name: 'generate-resume-pdf',
      arguments: {
        resume: {
          basics: {
            name: 'Test User',
            email: 'test@example.com',
          },
        },
      },
    });

    if (!resumeResult.content && !resumeResult.structuredContent) {
      throw new Error('generate-resume-pdf tool returned no content');
    }
  },

  async testInstalledPackage(client) {
    // Test in production environment
    const simplePdfResult = await client.callTool({
      name: 'create-simple-pdf',
      arguments: {
        content: 'Production verification test',
        filename: 'prod-check.pdf',
      },
    });

    if (!simplePdfResult.content && !simplePdfResult.structuredContent) {
      throw new Error('create-simple-pdf tool returned no content');
    }

    const resumeResult = await client.callTool({
      name: 'generate-resume-pdf',
      arguments: {
        resume: {
          basics: {
            name: 'Production Test',
            email: 'prod@example.com',
          },
        },
      },
    });

    if (!resumeResult.content && !resumeResult.structuredContent) {
      throw new Error('generate-resume-pdf tool returned no content');
    }
  },
});

const result = await checker.check();
process.exit(result.success ? 0 : 1);
```

## Example 2: mcp-drive (Google OAuth Required)

Package that needs OAuth credentials and has account management.

```typescript
#!/usr/bin/env node
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';
import { CheckPrepublish } from 'npm-check-prepublish';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const PACKAGE_DIR = join(__dirname, '..');

const checker = new CheckPrepublish({
  packageDir: PACKAGE_DIR,
  packageName: '@mcpeasy/mcp-drive',
  serverName: 'drive',
  envFile: '.env.test',

  setupEnv(phase, isProduction) {
    // Validate required credentials (fail fast)
    if (!process.env.GOOGLE_CLIENT_ID || !process.env.GOOGLE_CLIENT_SECRET) {
      throw new Error('GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET are required in .env.test');
    }

    if (phase === 1) {
      // Phase 1: Pass full environment
      return {
        ...process.env,
        LOG_LEVEL: 'error',
        NODE_ENV: 'test',
      };
    }

    // Phase 2: Minimal environment for production simulation
    return {
      LOG_LEVEL: 'error',
      NODE_ENV: 'test',
      GOOGLE_CLIENT_ID: process.env.GOOGLE_CLIENT_ID,
      GOOGLE_CLIENT_SECRET: process.env.GOOGLE_CLIENT_SECRET,
    };
  },

  async testBuiltPackage(client) {
    // Test account management tool (works without auth)
    const accountListResult = await client.callTool({
      name: 'drive-account-list',
      arguments: {},
    });

    if (!accountListResult.content && !accountListResult.structuredContent) {
      throw new Error('Account list tool returned no content');
    }

    // Test account info tool
    const accountResult = await client.callTool({
      name: 'drive-account-current',
      arguments: {},
    });

    if (!accountResult.content && !accountResult.structuredContent) {
      throw new Error('Account current tool returned no content');
    }
  },

  async testInstalledPackage(client) {
    // Same tests for production environment
    const accountListResult = await client.callTool({
      name: 'drive-account-list',
      arguments: {},
    });

    if (!accountListResult.content && !accountListResult.structuredContent) {
      throw new Error('Account list tool returned no content');
    }

    const accountResult = await client.callTool({
      name: 'drive-account-current',
      arguments: {},
    });

    if (!accountResult.content && !accountResult.structuredContent) {
      throw new Error('Account current tool returned no content');
    }
  },
});

const result = await checker.check();
process.exit(result.success ? 0 : 1);
```

## Example 3: Multi-Transport Server (stdio + HTTP)

Package that supports both stdio and HTTP transports.

```typescript
#!/usr/bin/env node
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';
import { CheckPrepublish } from 'npm-check-prepublish';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const PACKAGE_DIR = join(__dirname, '..');

const checker = new CheckPrepublish({
  packageDir: PACKAGE_DIR,
  packageName: '@mcpeasy/mcp-sheets',
  serverName: 'sheets',
  envFile: '.env.test',

  setupEnv(phase, isProduction) {
    if (!process.env.GOOGLE_CLIENT_ID || !process.env.GOOGLE_CLIENT_SECRET) {
      throw new Error('GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET are required');
    }

    const baseEnv = {
      LOG_LEVEL: 'error',
      NODE_ENV: 'test',
      GOOGLE_CLIENT_ID: process.env.GOOGLE_CLIENT_ID,
      GOOGLE_CLIENT_SECRET: process.env.GOOGLE_CLIENT_SECRET,
    };

    if (phase === 1) {
      return {
        ...process.env,
        ...baseEnv,
        // Force stdio transport for verification
        PORT: undefined,
        TRANSPORT: undefined,
      };
    }

    return baseEnv;
  },

  async testBuiltPackage(client) {
    const accountListResult = await client.callTool({
      name: 'sheets-account-list',
      arguments: {},
    });

    if (!accountListResult.content && !accountListResult.structuredContent) {
      throw new Error('Account list tool returned no content');
    }

    const accountResult = await client.callTool({
      name: 'sheets-account-current',
      arguments: {},
    });

    if (!accountResult.content && !accountResult.structuredContent) {
      throw new Error('Account current tool returned no content');
    }
  },

  async testInstalledPackage(client) {
    const accountListResult = await client.callTool({
      name: 'sheets-account-list',
      arguments: {},
    });

    if (!accountListResult.content && !accountListResult.structuredContent) {
      throw new Error('Account list tool returned no content');
    }

    const accountResult = await client.callTool({
      name: 'sheets-account-current',
      arguments: {},
    });

    if (!accountResult.content && !accountResult.structuredContent) {
      throw new Error('Account current tool returned no content');
    }
  },
});

const result = await checker.check();
process.exit(result.success ? 0 : 1);
```

## Example 4: Custom Package Structure

Package with non-standard structure.

```typescript
const checker = new CheckPrepublish({
  packageDir: PACKAGE_DIR,
  packageName: '@my-org/custom-mcp',
  serverName: 'custom',

  // Custom build command
  buildCommand: 'npm run build:production',

  // Custom server location
  serverBin: 'build/server.js',

  // Custom required files
  requiredFiles: [
    'build/server.js',
    'dist/index.js',
    'package.json',
    'README.md',
  ],

  // Custom excluded paths
  excludedPaths: ['test', 'src', 'scripts', 'docs', '.github'],

  // Server needs special arguments
  serverArgs: ['--headless', '--no-banner'],

  async testBuiltPackage(client) {
    // Your custom tests
  },
});
```

## Example 5: Skip Phase 2 for Fast Testing

During development, you might want to skip Phase 2 for faster feedback.

```typescript
const checker = new CheckPrepublish({
  packageDir: PACKAGE_DIR,
  packageName: '@mcpeasy/mcp-pdf',
  serverName: 'pdf',

  // Skip npm pack + install phase for faster testing
  runPhase2: false,

  async testBuiltPackage(client) {
    // Only Phase 1 tests run
    const result = await client.callTool({
      name: 'create-simple-pdf',
      arguments: { content: 'Quick test' },
    });

    if (!result.content) {
      throw new Error('Tool failed');
    }
  },
});

const result = await checker.check();
process.exit(result.success ? 0 : 1);
```

## Example 6: Programmatic Usage

Use the checker programmatically instead of as a script.

```typescript
import { CheckPrepublish } from 'npm-check-prepublish';

async function validatePackage() {
  const checker = new CheckPrepublish({
    packageDir: process.cwd(),
    packageName: '@my-org/my-package',
    serverName: 'myserver',
  });

  const result = await checker.check();

  if (result.success) {
    console.log('✅ Package is ready to publish!');
    return true;
  }

  console.error('❌ Package verification failed');
  if (result.phase1.error) {
    console.error('Phase 1 error:', result.phase1.error.message);
  }
  if (result.phase2?.error) {
    console.error('Phase 2 error:', result.phase2.error.message);
  }
  return false;
}

// Use in your build pipeline
const isValid = await validatePackage();
if (!isValid) {
  process.exit(1);
}
```

## Migration from Standalone Script

If you have an existing `check-package.ts` script, here's how to migrate:

### Before (Standalone Script)

```typescript
async function verifyBuiltPackage(): Promise<boolean> {
  // 300+ lines of verification logic
}

async function verifyPackagedArtifact(): Promise<boolean> {
  // 300+ lines of packaging logic
}

async function main() {
  const phase1 = await verifyBuiltPackage();
  if (!phase1) process.exit(1);

  const phase2 = await verifyPackagedArtifact();
  if (!phase2) process.exit(1);
}
```

### After (Using npm-check-prepublish)

```typescript
import { CheckPrepublish } from 'npm-check-prepublish';

const checker = new CheckPrepublish({
  packageDir: PACKAGE_DIR,
  packageName: '@mcpeasy/mcp-pdf',
  serverName: 'pdf',

  async testBuiltPackage(client) {
    // Your custom test logic (10-20 lines)
  },

  async testInstalledPackage(client) {
    // Your custom test logic (10-20 lines)
  },
});

const result = await checker.check();
process.exit(result.success ? 0 : 1);
```

Benefits:
- 90% less code
- Standardized verification process
- Better error handling
- Easier to maintain
- Shared updates across all packages
