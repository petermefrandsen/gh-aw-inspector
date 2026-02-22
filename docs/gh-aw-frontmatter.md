# GitHub Agentic Workflows (gh-aw) Frontmatter Reference

This document serves as the local reference for the `gh-aw` frontmatter schema supported by the `gh-aw-inspector` extension. Our implementation must stay in sync with this document.

> **Full Reference:** [GitHub Agentic Workflows Frontmatter Reference](https://github.github.com/gh-aw/reference/frontmatter-full/)

## Core Fields

### 1. Basic Metadata
- **`name`** (string): Workflow name that appears in GitHub Actions.
- **`description`** (string): Optional description rendered as a comment.

### 2. Triggers (`on`)
Defines when the workflow runs. Supports standard GitHub Actions triggers plus special command triggers.
- **`on: push`**: Trigger on code push.
- **`on: issues`**: Trigger on issue creation/update.
- **`on: issue_comment`**: Trigger on comments.
- **`on: slash_command`**: Matches slash commands automatically.
- **`on: schedule`**: Fuzzy schedules or cron expressions.

### 3. Permissions
GitHub token permissions control API access.
- **`permissions`** (string | object): Can be `'read-all'`, `'write-all'`, or an object with specific scopes like `issues: write`, `contents: read`, `pull-requests: write`.

### 4. Engine Configuration
Specifies the AI processor.
- **`engine`** (string | object): `claude` (default), `copilot`, `codex`, or `gemini`.
- Can be an object with advanced configurable settings:
  - `model`: Specific LLM model.
  - `max-turns`: Max chat iterations.
  - `env`: Custom environment variables.

### 5. Tools & MCP Servers
Tools available to the AI engine for GitHub API access, browser automation, etc.
- **`tools.github`**: Enable/disable GitHub API operations.
- **`tools.bash`**: Shell command execution.
- **`tools.web-fetch`**: Web content fetching.
- **`tools.edit`**: File editing in the repo.
- **`tools.playwright`**: Browser automation.

### 6. Safe Outputs
Configurations for automated actions like creating issues or PRs.
- **`safe-outputs.create-issue`**: Create GitHub issues from AI output.
- **`safe-outputs.create-pull-request`**: Create PRs with generated code.
- **`safe-outputs.add-comment`**: Reply to issues/PRs.

---
*Note for `doc-sync-agent`: Ensure that any updates to this document are reflected in our parser and the Simulation Launcher Webview configuration form.*
