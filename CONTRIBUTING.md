# Contributing to Repokit

Thank you for your interest in contributing to Repokit! This document provides guidelines and steps for contributing to this project.

## Development Process

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes using conventional commit messages (see below)
4. Push to your branch (`git push origin feature/amazing-feature`)
5. Create a Pull Request

## Commit Message Convention

This project follows the [Conventional Commits](https://www.conventionalcommits.org/) specification. This helps us generate changelogs and automatically determine version bumps.

Each commit message should be structured as follows:

```
<type>(<scope>): <description>

[optional body]

[optional footer(s)]
```

### Types

- `feat`: A new feature
- `fix`: A bug fix
- `docs`: Documentation changes
- `style`: Code style changes (formatting, missing semicolons, etc.)
- `refactor`: Code changes that neither fix a bug nor add a feature
- `perf`: Performance improvements
- `test`: Adding or fixing tests
- `build`: Changes to the build system
- `ci`: Changes to CI configuration files and scripts
- `chore`: Other changes that don't modify src or test files
- `revert`: Reverts a previous commit

### Examples

```
feat(query): add support for nested field filtering

Add the ability to filter by nested object properties using dot notation.
```

```
fix(adapter): correct memory leak in batch processor

Fixes issue #42
```

## Changelog Management

The changelog is automatically generated from conventional commit messages when making a release. You don't need to update the CHANGELOG.md file manually.

To generate/update the changelog without making a release:

```bash
npm run changelog
```

## Release Process

Releases are created using the `standard-version` tool, which:

1. Bumps the version in package.json
2. Updates the CHANGELOG.md file
3. Creates a git tag
4. Commits the changes

To create a release:

```bash
# Patch release (0.0.x)
npm run release:patch

# Minor release (0.x.0)
npm run release:minor

# Major release (x.0.0)
npm run release:major
```

After running one of these commands, you need to push the changes and the tag:

```bash
git push --follow-tags origin main
```

The GitHub Actions workflow will automatically build and publish the release to npm and create a GitHub release.

## Pull Request Process

1. Ensure your code passes all tests and lint checks
2. Update the documentation if needed
3. Make sure your changes don't break existing functionality
4. Get at least one code review from maintainers
5. When approved, the maintainers will merge your PR

## Setting Up the Development Environment

1. Clone the repository
2. Install dependencies:
   ```bash
   npm install
   ```
3. Initialize husky:
   ```bash
   npm run prepare
   ```
4. Run tests to ensure everything is working:
   ```bash
   npm test
   ```

## Running Tests

```bash
# Run all tests
npm test

# Run tests in watch mode
npm run test:watch

# Run tests with coverage
npm run test:coverage
```

## Code Linting

```bash
# Lint and fix
npm run lint
```

## Building the Package

```bash
# Build once
npm run build

# Build in watch mode for development
npm run dev
```
