/**
 * Package type detection
 */
export type PackageType = 'module' | 'cli' | 'mcp-server';

export interface PackageInfo {
  type: PackageType;
  name: string;
  version: string;
  serverName?: string; // Only for MCP servers
  mcpName?: string; // Only for MCP servers
  main?: string; // Main entry point
}

/**
 * Configuration for package verification
 */
export interface VerifyConfig {
  /**
   * Absolute path to the package directory to check
   * @default process.cwd()
   */
  packageDir?: string;

  /**
   * Additional required files to check (appended to auto-detected)
   * @default []
   */
  requiredFiles?: string[];

  /**
   * Path to custom test file (NO DEFAULT)
   */
  testFile?: string;

  /**
   * Custom logger instance
   * @default console
   */
  logger?: Logger;

  /**
   * Skip build step
   * @default false
   */
  skipBuild?: boolean;

  /**
   * Skip required files check
   * @default false
   */
  skipCheckRequiredFiles?: boolean;

  /**
   * Skip package verification (npm pack + install)
   * @default false
   */
  skipPackage?: boolean;

  /**
   * Skip module import check
   * @default false
   */
  skipCheckImport?: boolean;

  /**
   * Skip CLI execution check
   * @default false
   */
  skipCheckBin?: boolean;

  /**
   * Skip MCP server startup check
   * @default false
   */
  skipCheckMcpServer?: boolean;
}

/**
 * Result of verification
 */
export interface VerificationResult {
  success: boolean;
  errors: string[];
  packageInfo?: PackageInfo;
}

/**
 * Logger interface
 */
export type Logger = Pick<Console, 'log'>;
