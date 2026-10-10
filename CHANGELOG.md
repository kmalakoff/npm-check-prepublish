# Changelog

## [1.1.16] - 2026-10-10

### Fixed

- The package check now rejects any packaged top-level file whose name starts with `.env`, such as `.env.test` or `.envrc`. These were previously caught only when a `.env` file was also packaged, so a package that ships one now fails the check.
- The `CheckPrepublish` example in the type documentation uses valid options.
