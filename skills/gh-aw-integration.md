---
description: Integrating with the gh-aw CLI
---
# GH AW CLI Integration

This skill documents how the VS Code extension should interface with the `gh-aw` CLI tool.

## Key Concepts
- Discover workflows `gh-aw list`
- Execute prompts: The core functionality is dynamically generating the correct arguments to pass down to `gh-aw run`.

## Usage
The extension will need to spawn `child_process.exec` or `child_process.spawn` pointing to the user's globally installed `gh-aw` tool, capturing `stdout` and `stderr` to pipe into the Markdown Generator.
