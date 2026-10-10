# Changelog

## [1.1.17] - 2026-10-10

### Fixed

- A `.ncprc.json` or `package.json` that exists but cannot be read or parsed now stops the check with an error naming the file. Previously a broken `.ncprc.json` was silently ignored and the check ran with other settings.
- The CLI exits `21` with that error, or with one for a missing `package.json`, before running any check. Previously it could report success, or crash on an unhandled rejection.
- The runtime check removes its temporary install and tarball when the module import or CLI run fails.

## [1.1.16] - 2026-10-10

### Fixed

- The package check now rejects any packaged top-level file whose name starts with `.env`, such as `.env.test` or `.envrc`. These were previously caught only when a `.env` file was also packaged, so a package that ships one now fails the check.
- The `CheckPrepublish` example in the type documentation uses valid options.
