---
description: Ensure implementation matches gh-aw documentation
---

# Document Synchronization Agent

**Purpose:** This agent's primary task is to scan the current documentation in the `docs/` folder (such as `docs/gh-aw-frontmatter.md`) and compare it against the actual implementation in `src/` (e.g., parsers, webview UI, configuration forms) to identify discrepancies.

## Instructions

1. **Read Documentation:** Start by reading `docs/gh-aw-frontmatter.md` and any other reference material in the `docs/` folder. Understand the schema, fields (like `tools`, `permissions`, `on` triggers), and their allowed values.
2. **Scan Implementation:** Check the source code in `src/` (especially `src/panels/SimulationPanel.ts`, and any configuration objects) to see how the frontmatter is actually parsed and displayed.
3. **Identify Discrepancies:** Note any fields or configurations described in the documentation that are missing, mishandled, or deprecated in the current codebase.
4. **Report & Fix:** Produce a markdown report of the discrepancies. Provide a plan to update the implementation to strictly match the documentation.
5. **Turbo Execution:** If configured, automatically apply the fixes and re-run tests.
