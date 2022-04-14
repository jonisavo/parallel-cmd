# Changelog

All notable changes to this project will be documented in this file. See [standard-version](https://github.com/conventional-changelog/standard-version) for commit guidelines.

### [0.5.1](https://github.com/jonisavo/parallel-cmd/compare/v0.5.0...v0.5.1) (2022-04-14)


### Features

* categorize abort message as a warning instead of error ([f52575a](https://github.com/jonisavo/parallel-cmd/commit/f52575ad7a9258ce74bc070335ff8bd0f643d483))
* show message before aboring command, instead of after ([91bac2d](https://github.com/jonisavo/parallel-cmd/commit/91bac2d562f359a5d88e9c15b8b5556add9b2dd7))

## [0.5.0](https://github.com/jonisavo/parallel-cmd/compare/v0.4.1...v0.5.0) (2022-04-14)


### ⚠ BREAKING CHANGES

* **parallelCmd:** The "abortController" option has been renamed to "abortEmitter"

### Features

* **parallelCmd:** abort with EventEmitter ([6809c59](https://github.com/jonisavo/parallel-cmd/commit/6809c59250ce16a554670498820ac6fd16d597f5))

### [0.4.1](https://github.com/jonisavo/parallel-cmd/compare/v0.4.0...v0.4.1) (2022-04-13)

* Fix links in changelog

## [0.4.0](https://github.com/jonisavo/parallel-cmd/compare/v0.3.3...v0.4.0) (2022-04-13)


### ⚠ BREAKING CHANGES

* **cli:** exit with code 1 on abort

### Features

* **cli:** exit with code 1 on abort ([7f3b3a9](https://github.com/jonisavo/parallel-cmd/commit/7f3b3a96af519c8ff37b05eac1f1d2eac88f35f7))

### [0.3.3](https://github.com/jonisavo/parallel-cmd/compare/v0.3.2...v0.3.3) (2022-04-12)


### Bug Fixes

* **spawnCommand:** wait for processes to be killed before rejecting ([21b7bef](https://github.com/jonisavo/parallel-cmd/commit/21b7bef8ec9f12c0d66a48e7922b2a8ac0857ad7))

### 0.3.2 (2022-04-12)
This is the first version to use conventional commits and [standard-version](https://github.com/conventional-changelog/standard-version).


### Features

* add CHANGELOG.md to published tarball ([4a1d6e3](https://github.com/jonisavo/parallel-cmd/commit/4a1d6e34d19a3162e26c8f150cfcce9303c5e6b0))


### Bug Fixes

* use singular "command" in log if a single command is skipped ([8ef9530](https://github.com/jonisavo/parallel-cmd/commit/8ef953040bfd10126c87544e1a39346317cc7854))

### 0.3.1 (2022-04-10)


### Bug Fixes

* Fix build error in `parallelCmd`.ts

### 0.3.0 (2022-04-10)


### Features

* Add instance method `Logger#appendToLogFile`
* Refactored codebase to make unit testing easier

### 0.2.0 (2022-04-10)
- Switched to semantic versioning

### 0.1.0 (2022-04-07)
- Initial development version