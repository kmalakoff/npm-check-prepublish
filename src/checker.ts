import { connectMcpClient, spawnCluster } from '@mcpeasy/cli';
import type { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { execSync } from 'child_process';
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';
import type { Logger, PackageInfo, VerificationResult, VerifyConfig } from './types.js';

const EXCLUDED_PATHS = ['src', 'test', '.env'];

function getTmpDir(): string {
  const tmpDir = join(tmpdir(), 'package-checker');
  if (!existsSync(tmpDir)) {
    mkdirSync(tmpDir, { recursive: true });
  }
  return tmpDir;
}

export class CheckPrepublish {
  private config: Required<VerifyConfig>;
  private logger: Logger;
  private packageJson: any;
  private packageInfo: PackageInfo;
  private errors: string[] = [];

  constructor(config: VerifyConfig = {}) {
    this.logger = config.logger || console;
    this.config = {
      packageDir: config.packageDir || process.cwd(),
      requiredFiles: config.requiredFiles || [],
      testFile: config.testFile || '',
      logger: this.logger,
      skipBuild: config.skipBuild || false,
      skipCheckRequiredFiles: config.skipCheckRequiredFiles || false,
      skipPackage: config.skipPackage || false,
      skipCheckImport: config.skipCheckImport || false,
      skipCheckBin: config.skipCheckBin || false,
      skipCheckMcpServer: config.skipCheckMcpServer || false,
    };

    // Load and parse package.json
    const packageJsonPath = join(this.config.packageDir, 'package.json');
    if (!existsSync(packageJsonPath)) {
      throw new Error(`package.json not found at ${packageJsonPath}`);
    }
    this.packageJson = JSON.parse(readFileSync(packageJsonPath, 'utf8'));

    // Detect package type
    this.packageInfo = this.detectPackageType();
  }

  private detectPackageType(): PackageInfo {
    // MCP Server: has "mcpName" field
    if (this.packageJson.mcpName) {
      return {
        type: 'mcp-server',
        name: this.packageJson.name,
        version: this.packageJson.version,
        serverName: this.getServerName(),
        mcpName: this.packageJson.mcpName,
        main: this.packageJson.main,
      };
    }

    // CLI Tool: has "bin" field
    if (this.packageJson.bin) {
      return {
        type: 'cli',
        name: this.packageJson.name,
        version: this.packageJson.version,
        main: this.packageJson.main,
      };
    }

    // Normal Module
    return {
      type: 'module',
      name: this.packageJson.name,
      version: this.packageJson.version,
      main: this.packageJson.main,
    };
  }

  private getServerName(): string {
    // PRIMARY: Extract from mcpName
    if (this.packageJson.mcpName) {
      // "io.github.kmalakoff/mcp-pdf" -> "mcp-pdf"
      const parts = this.packageJson.mcpName.split('/');
      return parts[parts.length - 1] || this.packageJson.mcpName;
    }

    // FALLBACK: Extract from package name
    const name = this.packageJson.name;
    if (name.startsWith('@')) {
      // "@mcpeasy/mcp-pdf" -> "mcp-pdf"
      const parts = name.split('/');
      return parts[1] || name;
    }

    return name;
  }

  private getRequiredFiles(): string[] {
    const files: string[] = ['package.json'];

    // Auto-detect from package.json fields
    if (this.packageJson.main) files.push(this.packageJson.main);
    if (this.packageJson.module) files.push(this.packageJson.module);
    if (this.packageJson.types) files.push(this.packageJson.types);

    // Handle bin field (string or object)
    if (this.packageJson.bin) {
      if (typeof this.packageJson.bin === 'string') {
        files.push(this.packageJson.bin);
      } else {
        files.push(...(Object.values(this.packageJson.bin) as string[]));
      }
    }

    // Append user-provided required files
    files.push(...this.config.requiredFiles);

    return files;
  }

  async check(): Promise<VerificationResult> {
    this.errors = [];

    this.logger.log('\n=========================================');
    this.logger.log(`Verifying ${this.packageInfo.name} v${this.packageInfo.version}`);
    this.logger.log(`Type: ${this.getTypeLabel()}`);
    if (this.packageInfo.serverName) {
      this.logger.log(`Server Name: ${this.packageInfo.serverName}`);
    }
    this.logger.log('=========================================\n');

    // Step 1: Build Verification
    await this.verifyBuild();

    // Step 2: File Verification
    await this.verifyRequiredFiles();

    // Step 3: Package Verification
    await this.verifyPackage();

    // Step 4: Runtime Verification
    await this.verifyRuntime();

    // Final result
    this.logger.log('\n=========================================');
    if (this.errors.length === 0) {
      this.logger.log('✅ ALL VERIFICATION PASSED');
      this.logger.log('=========================================\n');
      this.logger.log('Package is ready to publish!');
    } else {
      this.logger.log('❌ VERIFICATION FAILED');
      this.logger.log('=========================================\n');
      for (const error of this.errors) {
        this.logger.log(`  ❌ ${error}`);
      }
    }

    return {
      success: this.errors.length === 0,
      errors: this.errors,
      packageInfo: this.packageInfo,
    };
  }

  private getTypeLabel(): string {
    switch (this.packageInfo.type) {
      case 'mcp-server':
        return 'MCP Server';
      case 'cli':
        return 'CLI Tool';
      case 'module':
        return 'Normal Module';
      default:
        return 'Unknown';
    }
  }

  private async verifyBuild(): Promise<void> {
    this.logger.log('\nStep 1: Build Verification');
    this.logger.log('---------------------------');

    if (this.config.skipBuild) {
      this.logger.log('Skipped (--no-build)\n');
      return;
    }

    // Check if build script exists
    if (!this.packageJson.scripts?.build) {
      this.logger.log('No build script found, skipping build step\n');
      return;
    }

    try {
      this.logger.log('Running build command: npm run build');
      execSync('npm run build', {
        cwd: this.config.packageDir,
        stdio: 'inherit',
      });
      this.logger.log('✅ Build successful\n');
    } catch (error) {
      const err = new Error(`Build failed: ${error}`);
      this.errors.push(err.message);
      this.logger.log('❌ Build failed\n');
    }
  }

  private async verifyRequiredFiles(): Promise<void> {
    this.logger.log('\nStep 2: File Verification');
    this.logger.log('--------------------------');

    if (this.config.skipCheckRequiredFiles) {
      this.logger.log('Skipped (--no-check-required-files)\n');
      return;
    }

    const requiredFiles = this.getRequiredFiles();

    this.logger.log('Verifying required files...');
    for (const file of requiredFiles) {
      const filePath = join(this.config.packageDir, file);
      if (existsSync(filePath)) {
        this.logger.log(`  ✅ ${file}`);
      } else {
        const err = new Error(`Missing required file: ${file}`);
        this.errors.push(err.message);
        this.logger.log(`  ❌ ${file}`);
      }
    }
    this.logger.log('');
  }

  private async verifyPackage(): Promise<void> {
    this.logger.log('\nStep 3: Package Verification');
    this.logger.log('----------------------------');

    if (this.config.skipPackage) {
      this.logger.log('Skipped (--no-pack)\n');
      return;
    }

    let testDir: string | null = null;
    let tarballPath: string | null = null;

    try {
      // Create tarball
      this.logger.log('Creating tarball...');
      const tarball = execSync('npm pack --silent', {
        cwd: this.config.packageDir,
        encoding: 'utf-8',
      }).trim();
      tarballPath = join(this.config.packageDir, tarball);
      this.logger.log(`✅ Created: ${tarball}\n`);

      // Create temp directory
      testDir = mkdtempSync(join(getTmpDir(), 'pkg-check-'));

      // Create package.json in install directory so npm doesn't walk up to project root
      execSync('npm init -y', { cwd: testDir, stdio: 'pipe' });

      // Install from tarball
      this.logger.log('Installing in temp directory...');
      execSync(`npm install "${tarballPath}" --production --loglevel=error`, {
        cwd: testDir,
        stdio: 'inherit',
      });
      this.logger.log('✅ Installation successful\n');

      // Get installed package path
      const packageDir = this.getInstalledPackagePath(testDir);

      // Verify files exist in installed package
      this.logger.log('Verifying package structure...');
      const requiredFiles = this.getRequiredFiles();
      for (const file of requiredFiles) {
        const filePath = join(packageDir, file);
        if (!existsSync(filePath)) {
          throw new Error(`Missing file in installed package: ${file}`);
        }
      }
      this.logger.log('✅ Required files present in installed package');

      // Verify excluded files are NOT in package
      for (const path of EXCLUDED_PATHS) {
        const fullPath = join(packageDir, path);
        if (existsSync(fullPath)) {
          // Check if it's a directory or starts with pattern
          if (path.startsWith('.')) {
            // For patterns like .env*, check all files starting with it
            const { readdirSync } = await import('fs');
            const files = readdirSync(packageDir);
            for (const f of files) {
              if (f.startsWith(path)) {
                throw new Error(`File/directory should NOT be in package: ${f}`);
              }
            }
          } else if (existsSync(fullPath)) {
            throw new Error(`File/directory should NOT be in package: ${path}`);
          }
        }
      }
      this.logger.log('✅ Excluded files not in package (src/, test/, .env*)\n');
    } catch (error) {
      const err = new Error(`Package verification failed: ${error}`);
      this.errors.push(err.message);
      this.logger.log('❌ Package verification failed\n');
    } finally {
      // Cleanup
      if (testDir) {
        try {
          rmSync(testDir, { recursive: true, force: true });
        } catch (err) {
          this.logger.log(`Warning: Failed to cleanup test directory: ${err}`);
        }
      }
      if (tarballPath) {
        try {
          rmSync(tarballPath, { force: true });
        } catch (err) {
          this.logger.log(`Warning: Failed to cleanup tarball: ${err}`);
        }
      }
    }
  }

  private getInstalledPackagePath(testDir: string): string {
    const packageName = this.packageJson.name;

    // Handle scoped packages
    if (packageName.startsWith('@')) {
      const [scope, name] = packageName.split('/');
      return join(testDir, 'node_modules', scope, name);
    }

    return join(testDir, 'node_modules', packageName);
  }

  private async verifyRuntime(): Promise<void> {
    this.logger.log('\nStep 4: Runtime Verification');
    this.logger.log('----------------------------');

    switch (this.packageInfo.type) {
      case 'module':
        await this.verifyModuleImport();
        break;
      case 'cli':
        await this.verifyCliExecution();
        break;
      case 'mcp-server':
        await this.verifyMcpServer();
        break;
    }
  }

  private async verifyModuleImport(): Promise<void> {
    this.logger.log(`Type: ${this.getTypeLabel()}`);

    if (this.config.skipCheckImport) {
      this.logger.log('Skipped (--no-check-import)\n');
      return;
    }

    try {
      // Create temp directory and install package
      const testDir = mkdtempSync(join(getTmpDir(), 'pkg-check-'));
      const tarball = execSync('npm pack --silent', {
        cwd: this.config.packageDir,
        encoding: 'utf-8',
      }).trim();
      const tarballPath = join(this.config.packageDir, tarball);

      // Create package.json in install directory so npm doesn't walk up to project root
      execSync('npm init -y', { cwd: testDir, stdio: 'pipe' });

      execSync(`npm install "${tarballPath}" --production --loglevel=error`, {
        cwd: testDir,
        stdio: 'pipe',
      });

      const packageDir = this.getInstalledPackagePath(testDir);
      const mainFile = this.packageJson.main || './index.js';
      const modulePath = join(packageDir, mainFile);
      this.logger.log(`Importing module: ${this.packageInfo.name}`);
      await import(modulePath);
      this.logger.log('✅ Module imports successfully\n');

      // Cleanup
      rmSync(testDir, { recursive: true, force: true });
      rmSync(tarballPath, { force: true });
    } catch (error) {
      const err = new Error(`Failed to import module: ${error}`);
      this.errors.push(err.message);
      this.logger.log('❌ Module import failed\n');
    }
  }

  private async verifyCliExecution(): Promise<void> {
    this.logger.log(`Type: ${this.getTypeLabel()}`);

    if (this.config.skipCheckBin) {
      this.logger.log('Skipped (--no-check-bin)\n');
      return;
    }

    try {
      // Create temp directory and install package
      const testDir = mkdtempSync(join(getTmpDir(), 'pkg-check-'));
      const tarball = execSync('npm pack --silent', {
        cwd: this.config.packageDir,
        encoding: 'utf-8',
      }).trim();
      const tarballPath = join(this.config.packageDir, tarball);

      // Create package.json in install directory so npm doesn't walk up to project root
      execSync('npm init -y', { cwd: testDir, stdio: 'pipe' });

      execSync(`npm install "${tarballPath}" --production --loglevel=error`, {
        cwd: testDir,
        stdio: 'pipe',
      });

      // Get bin name
      const bin = this.packageJson.bin;
      const binName = typeof bin === 'string' ? this.packageJson.name.split('/').pop() : Object.keys(bin)[0];
      const binPath = join(testDir, 'node_modules', '.bin', binName);

      this.logger.log(`Running CLI: ${binName} --version`);
      execSync(`${binPath} --version`, { stdio: 'pipe' });
      this.logger.log('✅ CLI executes successfully\n');

      // Cleanup
      rmSync(testDir, { recursive: true, force: true });
      rmSync(tarballPath, { force: true });
    } catch (error) {
      const err = new Error(`CLI execution failed: ${error}`);
      this.errors.push(err.message);
      this.logger.log('❌ CLI execution failed\n');
    }
  }

  private async verifyMcpServer(): Promise<void> {
    this.logger.log(`Type: ${this.getTypeLabel()}`);

    if (this.config.skipCheckMcpServer) {
      this.logger.log('Skipped (--no-check-mcp-server)\n');
      return;
    }

    let testDir: string | null = null;
    let tarballPath: string | null = null;
    let cluster: Awaited<ReturnType<typeof spawnCluster>> | null = null;
    let client: Client | null = null;

    try {
      // Create temp directory and install package
      testDir = mkdtempSync(join(getTmpDir(), 'pkg-check-'));
      const tarball = execSync('npm pack --silent', {
        cwd: this.config.packageDir,
        encoding: 'utf-8',
      }).trim();
      tarballPath = join(this.config.packageDir, tarball);

      // Create package.json in install directory so npm doesn't walk up to project root
      execSync('npm init -y', { cwd: testDir, stdio: 'pipe' });

      execSync(`npm install "${tarballPath}" --production --loglevel=error`, {
        cwd: testDir,
        stdio: 'pipe',
      });

      const packageDir = this.getInstalledPackagePath(testDir);
      // Handle both string and object bin field formats
      let binPath = 'bin/server.js';
      if (this.packageJson.bin) {
        if (typeof this.packageJson.bin === 'string') {
          binPath = this.packageJson.bin;
        } else if (typeof this.packageJson.bin === 'object') {
          // For object format, take the first bin entry
          const firstBin = Object.values(this.packageJson.bin)[0];
          binPath = typeof firstBin === 'string' ? firstBin : 'bin/server.js';
        }
      }
      const serverBin = join(packageDir, binPath);
      const serverName = this.packageInfo.serverName || this.packageInfo.name;

      this.logger.log(`Starting MCP server: ${serverName}`);

      // Start server
      cluster = await spawnCluster(
        {
          mcpServers: {
            [serverName]: {
              command: 'node',
              args: [serverBin],
              env: { LOG_LEVEL: 'error', NODE_ENV: 'test' },
            },
          },
        },
        { cwd: testDir }
      );

      // Connect client
      client = await connectMcpClient(cluster, serverName);
      this.logger.log('✅ Server started and connected');

      // Run custom tests if provided
      if (this.config.testFile) {
        this.logger.log(`Running custom tests from ${this.config.testFile}`);
        const tests = await import(join(this.config.packageDir, this.config.testFile));
        if (tests.testMcpServer) {
          await tests.testMcpServer(client);
          this.logger.log('✅ Custom tests passed\n');
        } else {
          this.logger.log('No testMcpServer function found in test file\n');
        }
      } else {
        this.logger.log('');
      }
    } catch (error) {
      const err = new Error(`MCP server verification failed: ${error}`);
      this.errors.push(err.message);
      this.logger.log('❌ MCP server verification failed\n');
    } finally {
      // Cleanup
      if (client) {
        try {
          await client.close();
        } catch (_err) {
          // Ignore cleanup errors
        }
      }
      if (cluster) {
        try {
          await cluster.shutdown('SIGINT', { timeoutMs: 5000 });
        } catch (_err) {
          // Ignore cleanup errors
        }
      }
      if (testDir) {
        try {
          rmSync(testDir, { recursive: true, force: true });
        } catch (err) {
          this.logger.log(`Warning: Failed to cleanup test directory: ${err}`);
        }
      }
      if (tarballPath) {
        try {
          rmSync(tarballPath, { force: true });
        } catch (err) {
          this.logger.log(`Warning: Failed to cleanup tarball: ${err}`);
        }
      }
    }
  }
}
