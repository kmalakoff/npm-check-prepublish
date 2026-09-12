# npm-check-prepublish

Check the package npm would publish: build it, verify declared entry files, pack and install it in a temporary project, then load its module entry points or run its CLI with `--version`.

## Install

```sh
npm install --save-dev npm-check-prepublish
```

Add it to the package being checked:

```json
{
  "scripts": {
    "prepublishOnly": "npm-check-prepublish"
  }
}
```

Run it directly with `npx npm-check-prepublish` or the shorter installed binary, `ncp`.

The check runs `npm run build` when that script exists. It then:

- verifies files referenced by `main`, `module`, `types`, `typings`, `bin`, and `exports`;
- creates a tarball and installs it with production dependencies in a temporary directory;
- rejects packaged `src`, `test`, and `.env` paths;
- loads both `require` and `import` entry points for a library; or
- runs the first declared CLI binary with `--version`.

It checks package structure and entry-point loading. It does not run the package's test suite or prove every runtime path works.

## Options

Skip individual checks when they do not fit a package:

```sh
ncp --no-build
ncp --no-check-required-files
ncp --no-pack
ncp --no-check-import
ncp --no-check-bin
```

Configuration can live in `.ncprc.json` or the `ncp` field of `package.json`:

```json
{
  "ncp": {
    "requiredFiles": ["LICENSE"],
    "skipCheckBin": true
  }
}
```

CLI flags override file configuration. `requiredFiles` are added to the paths inferred from `package.json`.

## Programmatic API

```js
import { CheckPrepublish } from 'npm-check-prepublish';

const result = await new CheckPrepublish({
  packageDir: process.cwd(),
  requiredFiles: ['LICENSE']
}).check();

if (!result.success) console.error(result.errors);
```

`check()` returns `{ success, errors, packageInfo? }`, where `errors` is an array of strings. Programmatic options use `skipBuild`, `skipCheckRequiredFiles`, `skipPackage`, `skipCheckImport`, and `skipCheckBin`.

## License

MIT
