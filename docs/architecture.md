# GH AW Inspector Architecture

The overarching goal is to parse and simulate `gh aw` CLI commands in a sandboxed or mocked VS Code extension environment.

## AI Implementation Guidelines

The implementation of this extension should adhere to the following architecture:

1. **Extension Entry Point (`src/extension.ts`)**: 
   - Registers commands mapping to the GitHub Agentic Workflows CLI.
   - Sets up the `TreeDataProvider` for the Sidebar View.
   - Manages state using VS Code's `ExtensionContext.workspaceState` or `globalState`.

2. **Sidebar View (`src/providers/WorkflowTreeProvider.ts`)**: 
   - Uses `child_process.exec` to run `gh aw list`.
   - Parses the stdout to discover available `gh-aw` workflows.
   - Presents them hierarchically in the VS Code sidebar.

3. **Execution Simulator (`src/simulator/CommandRunner.ts`)**: 
   - Provides an interface (VS Code input boxes or a dedicated Webview) to input a "prompt" intended for a workflow.
   - Spawns child processes to run `gh aw run <workflow> --prompt "<input>"`.
   - Captures `stdout` and `stderr` robustly, preventing the UI from blocking.

4. **Markdown Generator (`src/generators/MarkdownBuilder.ts`)**: 
   - Takes the output from the CLI and pipes it through the evaluation prompt located at `src/prompts/evaluate-gh-aw.md`.
   - Formats the returned outputs into rich markdown files containing Description, Metadata, Prerequisites, Intent, and happy/unhappy paths.
   - Uses VS Code's `workspace.openTextDocument` to display the generated Markdown file to the user.

## Design Principles
- **Separation of Concerns**: Keep UI logic (TreeViews, Inputs) separate from CLI invocation logic (child_process wrappers).
- **Error Handling**: The CLI might fail or not be installed. The extension must gracefully handle `ENOENT` errors and prompt the user to install the `gh-aw` extension (`gh extension install github/gh-aw`).
- **Typings**: Ensure strong TypeScript typing for all CLI parsing interfaces.
