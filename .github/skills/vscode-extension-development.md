---
description: VS Code Extension Development Best Practices
---
# VS Code Extension Development

This skill documents the best practices an AI Agent should follow when implementing the `gh-aw-inspector` VS Code extension.

## Core Rules

1. **Strict TypeScript**: 
   - Always use strong typing. Define interfaces for expected CLI JSON outputs or parsed objects.
   - Avoid `any`.

2. **Non-Blocking Operations**:
   - Never block the main VS Code extension thread.
   - Any execution of the `gh aw` CLI must be done asynchronously using `child_process.exec` or `child_process.spawn` wrapped in Promises.
   - Use `vscode.window.withProgress` to show a spinning progress indicator in the notification area or Source Control view while long-running CLI commands execute.

3. **Command Registration**:
   - Register all commands in `src/extension.ts` using `vscode.commands.registerCommand`.
   - Ensure every active command is also declared in `package.json` under `contributes.commands`.

4. **Error Handling & UX**:
   - If the `gh aw` CLI is not found on the user's `$PATH`, do not crash. Catch the execution error and display a helpful `vscode.window.showErrorMessage` suggesting they run `gh extension install github/gh-aw`.
   - Always log underlying errors to a dedicated Output Channel using `vscode.window.createOutputChannel("GH AW Inspector")`.

5. **File Handling (Markdown Generation)**:
   - When generating the simulated Markdown output, do not immediately write to disk unless necessary. 
   - Use `vscode.workspace.openTextDocument({ content: generatedMarkdown, language: 'markdown' })` to open a dynamic, untitled file, allowing the user to view and save it manually.

6. **Webview vs. Native UI**:
   - Prefer native VS Code UI components (InputBox, QuickPick, TreeView) over Webviews for simplicity and performance, unless a complex UI is strictly required for the simulator's input form.
