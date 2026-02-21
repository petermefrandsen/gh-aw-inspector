# Contributing to GH AW Inspector

This document outlines the workflow and setup process for contributing to the `gh-aw-inspector` VS Code extension.

## Local Setup

1. **Prerequisites**
   - Node.js (18.x)
   - npm
   - VS Code

2. **Clone the Repo**
   ```bash
   git clone git@github.com:petermefrandsen/gh-aw-inspector.git
   cd gh-aw-inspector
   ```

3. **Install Dependencies**
   *(Note: Extension not fully scaffolded yet)*
   ```bash
   npm install
   ```

## Workflows

The repository uses GitHub Actions for continuous integration.
- `Unit Tests`: Runs `npm test` automatically.
- `Playwright Tests`: Runs UI/Integration testing.
- `Release`: Used for semantic version tagging and VSX generation.

## Code Standards
- Use exact TypeScript typings.
- Maintain tests for all exported modules.
- Ensure Prettier/ESLint passes.
