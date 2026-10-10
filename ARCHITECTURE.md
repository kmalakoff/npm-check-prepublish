# Architecture

`npm-check-prepublish` checks the package npm would publish: its build, its declared files, the packed tarball, and whether an installed copy loads or runs. One class, `CheckPrepublish` in `src/checker.ts`, does the work; `src/cli.ts` (the `ncp` and `npm-check-prepublish` binaries) collects options and exits.

## Package type

`package.json` decides the type once, in the constructor:

- A `bin` field makes the package a `cli`.
- Anything else is a `module`.

A package with both `bin` and library entries is checked as a `cli`: its binary runs, and its module entries are not loaded.

## Steps

`check()` runs four steps in order. A failing step records its error and the next step still runs, so one run reports every failure. The result is `{ success, errors, packageInfo }`, with `errors` as strings.

| Step | What runs | Skip option / flag |
| --- | --- | --- |
| 1. Build | `npm run build` in `packageDir`, only when `scripts.build` exists | `skipBuild` / `--no-build` |
| 2. Required files | `package.json`, `main`, `module`, `types`, every `bin` target, then `requiredFiles`, each checked in `packageDir` | `skipCheckRequiredFiles` / `--no-check-required-files` |
| 3. Package | `npm pack`, then `npm init -y` and `npm install <tarball> --production` in a temporary project; the same required files must exist in the installed copy, and no top-level entry may be named `src` or `test` or start with `.env` | `skipPackage` / `--no-pack` |
| 4. Runtime | `module`: load the `require` entry, then the `import` entry when it names a different file and the runtime supports ESM. `cli`: run `node_modules/.bin/<name> --version` | `skipCheckImport` / `--no-check-import`, `skipCheckBin` / `--no-check-bin` |

Step 4 packs and installs its own copy, so `--no-pack` skips only step 3's structure checks.

Entry resolution follows `exports["."]` (or a top-level `exports` string or condition map), takes the requested condition, then `default`, then `main`, then `./index.js`. Files named only by `typings` or by other `exports` conditions are not checked in step 2; a missing entry surfaces when step 4 loads it. Loading goes through `module-compat`'s `loadModule`, which requires CommonJS and imports ESM.

The binary name is the first key of an object `bin`, or the package name without its scope for a string `bin`. The installed package path accounts for scopes: `@scope/name` resolves to `node_modules/@scope/name`.

Temporary projects live under `os.tmpdir()/npm-check-prepublish/pkg-check-*`. Step 3 attempts to remove its project and tarball whether or not it passed, and logs a warning when removal fails. Step 4 removes them only after a successful load or run, and leaves them behind when that step fails.

## Output

Progress goes to `logger.log` (default `console`). The build and step 3's install inherit the process's stdio, so their output reaches the terminal even with a custom logger.

The CLI exits `0` on success and `21` on any failure.

## Configuration

Options come from three sources:

1. CLI flags, which can only turn a check off.
2. `.ncprc.json` in the package directory. When the file exists and parses, it is the whole file configuration, and the `ncp` field below is not read.
3. The `ncp` field of `package.json`.

A file that is missing or does not parse is ignored, and the next source is used. A skip flag set on the CLI wins over the file value. `mergeConfig` concatenates `requiredFiles`, file entries first. The `CheckPrepublish` constructor itself reads no configuration file.

`loadConfig(packageDir)` and `mergeConfig(fileConfig, options)` are exported, so a script can apply the same precedence the CLI uses. The file format, `FileConfig`, accepts `requiredFiles` and the five skip options; `packageDir` and `logger` are programmatic only.

## Compatibility

`engines.node` is `>=0.12`. String and object fallbacks live in `src/compat.ts`; filesystem helpers in `src/fs-compat.ts` wrap `fs-remove-compat`, `mkdirp-classic`, and `temp-suffix`; CLI parsing and exiting by `getopts-compat` and `exit-compat`, and module loading by `module-compat`. `bin/cli.js` loads the ESM build where `require` is absent and the CJS build otherwise.

## Source layout

```
src/
├── index.ts           # Public exports
├── checker.ts         # CheckPrepublish and the four steps
├── config.ts          # loadConfig, mergeConfig, FileConfig
├── cli.ts             # ncp / npm-check-prepublish
├── types.ts           # VerifyConfig, VerificationResult, PackageInfo, Logger
├── compat.ts          # String and object fallbacks
├── fs-compat.ts       # Temp directory, mkdirp, and remove helpers
└── lib/loadModule.ts  # Promise wrapper over module-compat's loadModule
```

## Non-goals

- It does not run the package's test suite or exercise every runtime path; it proves the published shape installs and its entry loads.
- It runs the package's own `build` script, but it is not a build tool.
- It never publishes.
