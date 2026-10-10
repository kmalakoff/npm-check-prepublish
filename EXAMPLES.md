# Usage examples

The [README](README.md) covers installation and the default check. Each example below runs from the root of the package being checked.

## Check a library before publishing

```json
{
  "scripts": {
    "prepublishOnly": "ncp"
  }
}
```

For a package with `"exports": { ".": { "import": "./dist/index.mjs", "require": "./dist/index.js" } }`, a passing run ends its runtime step with:

```
Requiring module: my-package
✅ Module requires successfully

Importing module: my-package
✅ Module imports successfully
```

When `require` and `import` resolve to the same file, only the `require` load runs.

## Check a CLI package

A `bin` field switches the runtime step from loading the module to running the first binary with `--version`:

```json
{
  "name": "my-tool",
  "bin": { "my-tool": "bin/cli.js" }
}
```

```
Running CLI: my-tool --version
✅ CLI executes successfully
```

The binary must exit `0` for `--version`.

## Require files that are not entry points

Add files that must ship but are not named by `main`, `module`, `types`, or `bin`:

```json
{
  "ncp": {
    "requiredFiles": ["LICENSE", "README.md"]
  }
}
```

A missing file fails both the source check and the installed-package check:

```
❌ VERIFICATION FAILED
=========================================

  ❌ Missing required file: LICENSE
  ❌ Package verification failed: Error: Missing file in installed package: LICENSE
```

The same object can live in `.ncprc.json` instead. When `.ncprc.json` exists, the `ncp` field is not read.

## Skip a check for one run

Flags turn a check off for a single invocation; configuration-file values still apply to the rest:

```sh
ncp --no-build        # the build already ran earlier in CI
ncp --no-check-import # the entry has side effects that cannot run here
```

`--no-pack` skips only the installed-structure checks. The runtime step still packs and installs its own copy.

## Run the check from a script

`loadConfig` and `mergeConfig` apply the same configuration precedence as the CLI. A custom `logger` collects progress lines:

```js
import { CheckPrepublish, loadConfig, mergeConfig } from 'npm-check-prepublish';

const packageDir = process.cwd();
const lines = [];
const config = mergeConfig(loadConfig(packageDir), {
  packageDir,
  skipBuild: true,
  logger: { log: (line) => lines.push(line) },
});

const result = await new CheckPrepublish(config).check();
if (!result.success) {
  console.error(lines.join('\n'));
  process.exit(1);
}
```

`result.errors` holds one string per failure. Output from `npm run build` and the step 3 `npm install` goes straight to the terminal rather than through `logger`.
