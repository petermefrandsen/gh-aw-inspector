# Contributing to GH AW Inspector

Thank you for your interest in contributing! This document outlines the workflow and setup process for contributing to the `gh-aw-inspector` VS Code extension.

## Prerequisites

- [Node.js](https://nodejs.org/) 18+
- [pnpm](https://pnpm.io/) — `npm install -g pnpm`
- [VS Code](https://code.visualstudio.com/) 1.90+
- [GitHub CLI (`gh`)](https://cli.github.com/)
- [`gh-aw` extension](https://github.com/github/gh-aw) — `gh extension install github/gh-aw`

## Local Setup

1. **Clone the repository**
   ```bash
   git clone https://github.com/petermefrandsen/gh-aw-inspector.git
   cd gh-aw-inspector
   ```

2. **Install dependencies**
   ```bash
   pnpm install
   ```

3. **Build the extension**
   ```bash
   pnpm run package
   ```

4. **Launch the Extension Development Host**
   - Press `F5` in VS Code, or run `pnpm run watch` for live reloading.

## Available Scripts

| Command | Description |
|---------|-------------|
| `pnpm run package` | Type-check and build for production |
| `pnpm test` | Run unit tests |
| `pnpm run test:e2e` | Run E2E tests (requires a display) |
| `pnpm run lint` | Run ESLint |
| `pnpm run check-types` | Run TypeScript type checking |
| `pnpm run watch` | Watch mode for development |

## CI/CD Workflows

| Workflow | Trigger | Description |
|----------|---------|-------------|
| `tests.yml` | Push / PR | Lint, type-check, unit tests, E2E tests |
| `auto-release.yml` | PR merged to `main` | Bumps version (via PR labels), creates tag + GitHub Release, publishes to VS Marketplace and Open VSX |

### Version Bump Labels

Add one of these labels to a PR to control the version bump:

| Label | Bump |
|-------|------|
| `major` | `1.0.0` → `2.0.0` |
| `minor` | `1.0.0` → `1.1.0` |
| `patch` (default) | `1.0.0` → `1.0.1` |

## Code Standards

- Use strict TypeScript typings — no `any` unless unavoidable
- All exported modules must have tests
- Tests follow the AAA pattern and `test_<feature>_should_<expected>_when_<state>` naming convention
- ESLint must pass: `pnpm run lint`
- TypeScript must compile cleanly: `pnpm run check-types`

## AI Skills

Agentic development instructions for GitHub Copilot CLI are located in `.github/skills/`. These are used by the Copilot CLI agent when working in this repository.

